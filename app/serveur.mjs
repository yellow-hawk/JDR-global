// Serveur local de JDR Global (Node, sans dépendance) : sert dist/ et relaie l'écran joueurs vers les tablettes
// du même réseau. Lancé par lancer.bat (si Node est installé) : node serveur.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { adressesLocales, creerRelais } from './relais.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const DOSSIER = path.join(ICI, 'dist');
const PORT = Number(process.argv[2]) || 8417;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json', '.pdf': 'application/pdf', '.wasm': 'application/wasm',
};

if (!fs.existsSync(path.join(DOSSIER, 'index.html'))) { console.error('Le dossier dist est absent. Lance d’abord : npm run build'); process.exit(1); }
const relais = creerRelais(PORT);

const serveur = http.createServer((req, res) => {
  if (relais(req, res)) return;
  const chemin = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const fichier = path.resolve(DOSSIER, chemin);
  if (!fichier.startsWith(DOSSIER) || !fs.existsSync(fichier) || !fs.statSync(fichier).isFile()) { res.statusCode = 404; res.end('Introuvable'); return; }
  res.setHeader('Content-Type', TYPES[path.extname(fichier).toLowerCase()] ?? 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(fichier).pipe(res);
});

serveur.on('error', (e) => {
  if (e.code === 'EADDRINUSE') { console.log(`Le port ${PORT} est déjà utilisé : JDR Global tourne peut-être déjà.`); exec(`start http://localhost:${PORT}/`); }
  else console.error(e);
});
// 0.0.0.0 : joignable depuis les tablettes du réseau (Windows demande une fois l'autorisation du pare-feu).
serveur.listen(PORT, '0.0.0.0', () => {
  console.log(`JDR Global tourne sur http://localhost:${PORT}/  (fermer cette fenêtre pour arrêter)`);
  const ips = adressesLocales();
  if (ips.length) console.log(`Tablettes du même réseau : http://${ips[0]}:${PORT}/?ecran=joueurs (le MJ donne le code du salon)`);
  exec(process.platform === 'win32' ? `start http://localhost:${PORT}/` : `xdg-open http://localhost:${PORT}/`);
});
