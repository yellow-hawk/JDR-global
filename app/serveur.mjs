// Serveur local de JDR Global (Node, sans dépendance) : sert dist/ et relaie l'écran joueurs vers les tablettes
// du même réseau. Lancé par lancer.bat (si Node est installé) : node serveur.mjs [port]. Port retenu : port-local.txt.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { adressesLocales, creerRelais } from './relais.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const DOSSIER = path.join(ICI, 'dist');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json', '.pdf': 'application/pdf', '.wasm': 'application/wasm',
};

if (!fs.existsSync(path.join(DOSSIER, 'index.html'))) { console.error('Le dossier dist est absent. Lance d’abord : npm run build'); process.exit(1); }
// Le port réel est connu après l'écoute ; le relais le lit à la demande.
let portReel = 0;
const relais = creerRelais(() => portReel);

const serveur = http.createServer((req, res) => {
  if (relais(req, res)) return;
  const chemin = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const fichier = path.resolve(DOSSIER, chemin);
  if (!fichier.startsWith(DOSSIER) || !fs.existsSync(fichier) || !fs.statSync(fichier).isFile()) { res.statusCode = 404; res.end('Introuvable'); return; }
  res.setHeader('Content-Type', TYPES[path.extname(fichier).toLowerCase()] ?? 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(fichier).pipe(res);
});

/** Le port déjà pris est-il celui de JDR Global (déjà lancé) ? */
async function estJdrGlobal(port) {
  try { const r = await fetch(`http://localhost:${port}/relais/infos`, { signal: AbortSignal.timeout(1500) }); return r.ok; } catch { return false; }
}
const ouvrir = (port) => exec(process.platform === 'win32' ? `start http://localhost:${port}/` : `xdg-open http://localhost:${port}/`);
const ecouter = (port) => new Promise((ok, ko) => { serveur.once('error', ko); serveur.listen(port, '0.0.0.0', () => { serveur.off('error', ko); ok(); }); });

// Port : celui demandé, sinon celui retenu la dernière fois, sinon 8417. S'il est pris par un autre programme
// (Steam en prend parfois un au hasard), on en essaie d'autres et on retient celui qui marche : les campagnes
// sont rangées dans le navigateur pour une adresse précise, elle doit rester la même d'un lancement à l'autre.
const FICHIER_PORT = path.join(ICI, 'port-local.txt');
const retenu = Number(fs.existsSync(FICHIER_PORT) ? fs.readFileSync(FICHIER_PORT, 'utf8').trim() : '') || 0;
const premier = Number(process.argv[2]) || retenu || 8417;
const essais = [premier, ...[8417, 8427, 8437, 8447, 8457, 8467].filter((x) => x !== premier)];

let port = 0;
for (const essai of essais) {
  try { await ecouter(essai); port = essai; break; } catch (e) {
    if (e.code !== 'EADDRINUSE') { console.error(e); process.exit(1); }
    if (await estJdrGlobal(essai)) {
      console.log(`JDR Global tourne déjà sur http://localhost:${essai}/ : ouverture du navigateur.`);
      ouvrir(essai);
      setTimeout(() => process.exit(0), 3000);
      await new Promise(() => {});
    }
    console.log(`Le port ${essai} est occupé par un autre programme (Steam, par exemple).`);
  }
}
portReel = port;
if (!port) { console.error('Aucun port libre trouvé. Ferme Steam ou les programmes réseau, puis relance.'); process.exit(1); }
if (port !== retenu) fs.writeFileSync(FICHIER_PORT, String(port));
if (port !== 8417) {
  console.log('');
  console.log(`ATTENTION : JDR Global utilise le port ${port}, il le gardera aux prochains lancements.`);
  console.log(`Tes campagnes sont rangées par adresse : celles de http://localhost:8417 n'apparaissent pas ici.`);
  console.log('Pour les retrouver : Campagne → Exporter l\'archive complète à l\'ancienne adresse, puis Importer ici.');
  console.log('');
}
console.log(`JDR Global tourne sur http://localhost:${port}/  (fermer cette fenêtre pour arrêter)`);
const ips = adressesLocales();
if (ips.length) console.log(`Tablettes du même réseau : http://${ips[0]}:${port}/?ecran=joueurs (le MJ donne le code du salon)`);
ouvrir(port);
