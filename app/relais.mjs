// Relais de l'écran joueurs sur le réseau local (Node, sans dépendance) : la fenêtre du MJ et les tablettes
// d'un même « salon » s'échangent des messages. Écoute en flux (Server-Sent Events), envoi en POST.
// Utilisé par serveur.mjs (lanceur local) et par le serveur de développement (vite.config.ts).
import os from 'node:os';

const LIMITE = 25 * 1024 * 1024; // une image de combat ou de carte tient largement

/** Adresses IPv4 de l'ordinateur sur le réseau local (à taper sur la tablette). */
export function adressesLocales() {
  return Object.values(os.networkInterfaces()).flat().filter((x) => x && x.family === 'IPv4' && !x.internal && !x.address.startsWith('169.254.')).map((x) => x.address);
}

export function creerRelais(port) {
  /** salon → Map(qui → réponse en flux) */
  const salons = new Map();
  setInterval(() => { for (const s of salons.values()) for (const r of s.values()) r.write(': ping\n\n'); }, 20000).unref?.();

  return function relais(req, res, suite) {
    const url = new URL(req.url ?? '/', 'http://x');
    const chemin = url.pathname.replace(/^.*\/relais\//, '/relais/');
    if (!chemin.startsWith('/relais/')) return suite ? suite() : false;
    const salon = (url.searchParams.get('salon') ?? '').slice(0, 40), qui = (url.searchParams.get('qui') ?? '').slice(0, 60);
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (chemin === '/relais/infos') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ adresses: adressesLocales(), port }));
      return true;
    }
    if (!salon || !qui) { res.statusCode = 400; res.end('salon et qui requis'); return true; }

    if (chemin === '/relais/ecoute') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': bienvenue\n\n');
      if (!salons.has(salon)) salons.set(salon, new Map());
      salons.get(salon).set(qui, res);
      req.on('close', () => { salons.get(salon)?.delete(qui); if (salons.get(salon)?.size === 0) salons.delete(salon); });
      return true;
    }
    if (chemin === '/relais/envoi' && req.method === 'POST') {
      let taille = 0;
      const morceaux = [];
      req.on('data', (m) => { taille += m.length; if (taille > LIMITE) { res.statusCode = 413; res.end(); req.destroy(); } else morceaux.push(m); });
      req.on('end', () => {
        if (res.writableEnded) return;
        const corps = Buffer.concat(morceaux).toString('utf8').replace(/\n/g, ' ');
        for (const [autre, r] of salons.get(salon) ?? []) if (autre !== qui) r.write(`data: ${corps}\n\n`);
        res.statusCode = 204; res.end();
      });
      return true;
    }
    res.statusCode = 404; res.end();
    return true;
  };
}
