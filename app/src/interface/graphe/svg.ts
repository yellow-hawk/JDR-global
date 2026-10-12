// Arbre (organigramme) en SVG autonome, pour l'écran joueurs ou l'impression : mêmes boîtes que VueArbre, tout déplié.
import { disposerArbre, type NoeudArbre } from '../../noyau/graphe';

const L = 168, H = 56;
const e = (s: unknown): string => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const coupe = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

function indexer(n: NoeudArbre, m = new Map<string, NoeudArbre>()): Map<string, NoeudArbre> {
  m.set(n.id, n); n.enfants.forEach((x) => indexer(x, m)); return m;
}

export function svgArbre(racine: NoeudArbre, horizontal = false): string {
  const d = disposerArbre(racine, { horizontal, ecartX: horizontal ? 230 : 190, ecartY: horizontal ? 120 : 110 });
  const index = indexer(racine);
  const liens = d.liens.map(([a, b]) => {
    const p = d.positions[a], q = d.positions[b];
    const ch = horizontal ? `M${p.x + L / 2},${p.y} H${(p.x + q.x) / 2} V${q.y} H${q.x - L / 2}` : `M${p.x},${p.y + H / 2} V${(p.y + q.y) / 2} H${q.x} V${q.y - H / 2}`;
    return `<path d="${ch}" fill="none" stroke="#8a7a66" stroke-width="1.5"/>`;
  }).join('');
  const boites = Object.entries(d.positions).map(([id, p]) => {
    const n = index.get(id)!;
    return `<g transform="translate(${p.x - L / 2},${p.y - H / 2})"><rect width="${L}" height="${H}" rx="8" fill="#fbf7ef" stroke="#b9a586"/>`
      + `<rect width="6" height="${H}" rx="3" fill="${e(n.couleur ?? '#b08850')}"/>`
      + `<text x="14" y="${n.sousTitre ? 22 : 33}" font-size="14" font-weight="600" fill="#2a2016">${e(coupe(n.libelle, 22))}</text>`
      + (n.sousTitre ? `<text x="14" y="40" font-size="11.5" fill="#5a4a3a">${e(coupe(n.sousTitre, 26))}</text>` : '') + '</g>';
  }).join('');
  const x0 = Math.min(...Object.values(d.positions).map((p) => p.x)) - L / 2 - 10, y0 = Math.min(...Object.values(d.positions).map((p) => p.y)) - H / 2 - 10;
  const x1 = Math.max(...Object.values(d.positions).map((p) => p.x)) + L / 2 + 10, y1 = Math.max(...Object.values(d.positions).map((p) => p.y)) + H / 2 + 10;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" font-family="Georgia, serif" style="width:100%;height:auto;max-height:100%">${liens}${boites}</svg>`;
}
