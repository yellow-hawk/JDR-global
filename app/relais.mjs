// Relais de l'écran joueurs (Node, sans dépendance) : la fenêtre du MJ, la tablette de la table et les joueurs à
// distance s'échangent des messages par « salons ». Un écouteur suit plusieurs salons sur un seul flux
// (Server-Sent Events) ; l'envoi se fait en POST vers un salon. Chaque message reçu dit de quel salon il vient.
// Le relais peut aussi ouvrir un tunnel Cloudflare (cloudflared, sans compte) : une adresse https publique pour
// les joueurs à distance. Ce tunnel ne se commande que depuis l'ordinateur du MJ.
// Utilisé par serveur.mjs (lanceur local) et par le serveur de développement (vite.config.ts).
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const LIMITE = 25 * 1024 * 1024; // une image de combat ou de carte tient largement
const MAX_SALONS = 30;

/** Adresses IPv4 de l'ordinateur sur le réseau local (à taper sur la tablette). */
export function adressesLocales() {
  return Object.values(os.networkInterfaces()).flat().filter((x) => x && x.family === 'IPv4' && !x.internal && !x.address.startsWith('169.254.')).map((x) => x.address);
}

/* ---------- tunnel Cloudflare ---------- */

/** Emplacement de cloudflared : dans le PATH, ou là où l'installe winget / le programme d'installation. */
function trouverCloudflared() {
  const essais = ['cloudflared', 'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe', 'C:\\Program Files\\cloudflared\\cloudflared.exe',
    path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Links', 'cloudflared.exe')];
  for (const e of essais) {
    if (e !== 'cloudflared' && !fs.existsSync(e)) continue;
    try { if (spawnSync(e, ['--version'], { timeout: 5000 }).status === 0) return e; } catch { /* absent */ }
  }
  return null;
}

function creerTunnel(port) {
  const t = { etat: 'arrete', adresse: null, erreur: null, processus: null };
  return {
    infos: () => ({ etat: t.etat, adresse: t.adresse, erreur: t.erreur }),
    demarrer() {
      if (t.processus) return;
      const exe = trouverCloudflared();
      if (!exe) { t.etat = 'absent'; t.erreur = 'cloudflared n’est pas installé'; return; }
      t.etat = 'demarrage'; t.adresse = null; t.erreur = null;
      const p = spawn(exe, ['tunnel', '--no-autoupdate', '--url', `http://localhost:${typeof port === 'function' ? port() : port}`], { windowsHide: true });
      t.processus = p;
      // L'adresse arrive d'abord ; l'accès n'est ouvert qu'une fois le tunnel vraiment relié (« Registered tunnel
      // connection »). Il passe par le port 7844 : certains réseaux (partage de connexion d'un téléphone, réseaux
      // d'entreprise) le bloquent, et l'adresse répond alors « erreur 1033 ».
      let adresse = null;
      const lire = (d) => {
        const texte = String(d);
        const m = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(texte);
        if (m && !adresse) adresse = m[0];
        if (/Registered tunnel connection/i.test(texte) && adresse && t.etat !== 'actif') {
          t.adresse = adresse; t.etat = 'actif'; clearTimeout(delai);
          console.log(`Accès à distance ouvert : ${t.adresse}`);
        }
      };
      const delai = setTimeout(() => {
        if (t.processus !== p || t.etat === 'actif') return;
        t.processus = null; p.kill();
        t.etat = 'erreur'; t.adresse = null;
        t.erreur = 'le tunnel n’arrive pas à se relier à Cloudflare : ce réseau bloque le port 7844 (fréquent avec le partage de connexion d’un téléphone). Essaie depuis le Wi-Fi de ta box';
        console.log(`Accès à distance impossible : ${t.erreur}.`);
      }, 30000);
      p.stdout.on('data', lire); p.stderr.on('data', lire);
      p.on('exit', (code) => { if (t.processus === p) { t.processus = null; t.adresse = null; t.etat = code ? 'erreur' : 'arrete'; if (code) t.erreur = `cloudflared s’est arrêté (code ${code})`; } });
      p.on('error', (e) => { t.processus = null; t.etat = 'erreur'; t.erreur = String(e.message ?? e); });
    },
    arreter() { if (t.processus) { const p = t.processus; t.processus = null; p.kill(); } t.etat = 'arrete'; t.adresse = null; },
  };
}

/** Requête venue de l'ordinateur du MJ (et pas d'Internet par le tunnel : Cloudflare ajoute ses en-têtes). */
const estLocale = (req) => {
  const a = req.socket?.remoteAddress ?? '';
  return (a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1') && !req.headers['cf-ray'] && !req.headers['cf-connecting-ip'];
};

/* ---------- relais ---------- */

/** `port` : nombre, ou fonction qui le donne (connu seulement une fois le serveur à l'écoute). */
export function creerRelais(port) {
  /** salon → Map(qui → réponse en flux) */
  const salons = new Map();
  const tunnel = creerTunnel(port);
  setInterval(() => { const vus = new Set(); for (const s of salons.values()) for (const r of s.values()) if (!vus.has(r)) { vus.add(r); r.write(': ping\n\n'); } }, 20000).unref?.();
  const fermer = () => tunnel.arreter();
  process.once('exit', fermer);
  process.once('SIGINT', () => { fermer(); process.exit(0); });

  return function relais(req, res, suite) {
    const url = new URL(req.url ?? '/', 'http://x');
    const chemin = url.pathname.replace(/^.*\/relais\//, '/relais/');
    if (!chemin.startsWith('/relais/')) return suite ? suite() : false;
    const qui = (url.searchParams.get('qui') ?? '').slice(0, 60);
    const liste = (url.searchParams.get('salon') ?? '').split(',').map((s) => s.trim().slice(0, 48)).filter(Boolean).slice(0, MAX_SALONS);
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (chemin === '/relais/infos') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ adresses: adressesLocales(), port: typeof port === 'function' ? port() : port, tunnel: tunnel.infos(), local: estLocale(req) }));
      return true;
    }
    if (chemin === '/relais/tunnel' && req.method === 'POST') {
      if (!estLocale(req)) { res.statusCode = 403; res.end('Seul l’ordinateur du MJ commande le tunnel.'); return true; }
      if (url.searchParams.get('action') === 'arreter') tunnel.arreter(); else tunnel.demarrer();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(tunnel.infos()));
      return true;
    }
    if (!liste.length || !qui) { res.statusCode = 400; res.end('salon et qui requis'); return true; }

    if (chemin === '/relais/ecoute') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write(`: bienvenue${' '.repeat(2048)}\n\n`); // un peu de remplissage : certains relais n'envoient qu'à partir de 2 Ko
      for (const s of liste) { if (!salons.has(s)) salons.set(s, new Map()); salons.get(s).set(qui, res); }
      req.on('close', () => { for (const s of liste) { const m = salons.get(s); if (m?.get(qui) === res) m.delete(qui); if (m?.size === 0) salons.delete(s); } });
      return true;
    }
    if (chemin === '/relais/envoi' && req.method === 'POST') {
      const salon = liste[0];
      let taille = 0;
      const morceaux = [];
      req.on('data', (m) => { taille += m.length; if (taille > LIMITE) { res.statusCode = 413; res.end(); req.destroy(); } else morceaux.push(m); });
      req.on('end', () => {
        if (res.writableEnded) return;
        const corps = Buffer.concat(morceaux).toString('utf8');
        try { JSON.parse(corps); } catch { res.statusCode = 400; res.end(); return; }
        const ligne = `data: {"salon":${JSON.stringify(salon)},"m":${corps.replace(/\n/g, ' ')}}\n\n`;
        for (const [autre, r] of salons.get(salon) ?? []) if (autre !== qui) r.write(ligne);
        res.statusCode = 204; res.end();
      });
      return true;
    }
    res.statusCode = 404; res.end();
    return true;
  };
}
