// Arbre généalogique en SVG autonome (pur) : même disposition et mêmes cartes que l'écran, pour l'impression.
import type { Famille } from '../../noyau/contrat';
import { ageDe } from './dates';
import { disposer, HAUTEUR, LARGEUR } from './disposition';

const e = (s: unknown): string => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const coupe = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
const COULEUR = { f: '#c2577a', m: '#3f73b8', '?': '#8a7f6e' };

export function arbreSvg(f: Famille, an: number): string {
  const d = disposer(f);
  const ps = Object.values(d.positions);
  if (!ps.length) return '';
  const x0 = Math.min(...ps.map((p) => p.x)) - LARGEUR / 2 - 10, y0 = Math.min(...ps.map((p) => p.y)) - HAUTEUR / 2 - 10;
  const x1 = Math.max(...ps.map((p) => p.x)) + LARGEUR / 2 + 10, y1 = Math.max(...ps.map((p) => p.y)) + HAUTEUR / 2 + 10;
  const couples = d.couples.map(([a, b]) => { const p = d.positions[a], q = d.positions[b]; return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="#b08850" stroke-width="2.5"/>`; }).join('');
  const liens = d.fratries.map(({ parents, enfants, rail }) => {
    const pp = parents.map((id) => d.positions[id]);
    const mx = pp.reduce((s, p) => s + p.x, 0) / pp.length, my = Math.max(...pp.map((p) => p.y));
    const xs = enfants.map((x) => d.positions[x].x);
    const chemin = `M${mx},${my + (pp.length > 1 ? 0 : HAUTEUR / 2)} V${rail} M${Math.min(mx, ...xs)},${rail} H${Math.max(mx, ...xs)} `
      + enfants.map((x) => `M${d.positions[x].x},${rail} V${d.positions[x].y - HAUTEUR / 2}`).join(' ');
    return `<path d="${chemin}" fill="none" stroke="#6a5a4a" stroke-width="1.5"/>`;
  }).join('');
  const succ = d.successions.map(([a, b]) => { const p = d.positions[a], q = d.positions[b]; return `<path d="M${p.x + LARGEUR / 2},${p.y} H${(p.x + q.x) / 2 + LARGEUR / 4} V${q.y} H${q.x - LARGEUR / 2}" fill="none" stroke="#b08850" stroke-dasharray="6 5" stroke-width="1.5"/>`; }).join('');
  const cartes = f.membres.map((m) => {
    const p = d.positions[m.id];
    const age = ageDe(m, an);
    const vie = m.naissance === null || m.naissance === undefined ? (m.mort ? `† ${m.mort}` : '')
      : m.mort !== null && m.mort !== undefined ? `${m.naissance} – ${m.mort} (${age} ans)` : `né${m.sexe === 'f' ? 'e' : ''} en ${m.naissance} (${age} ans)`;
    const info = m.regne ? `♛ règne ${m.regne[0]}–${m.regne[1]}` : m.titre || m.role || '';
    const mort = m.mort !== null && m.mort !== undefined;
    return `<g transform="translate(${p.x - LARGEUR / 2},${p.y - HAUTEUR / 2})"><rect width="${LARGEUR}" height="${HAUTEUR}" rx="10" fill="${mort ? '#efe7da' : '#fbf7ef'}" stroke="#b9a586"/>`
      + `<rect width="${LARGEUR}" height="5" rx="2" fill="${COULEUR[m.sexe]}"/>`
      + `<text x="10" y="26" font-size="14" font-weight="600">${e(coupe(m.nom, 20))}</text>`
      + `<text x="10" y="45" font-size="12" fill="#5a4a3a">${e(coupe(vie, 25))}</text>`
      + `<text x="10" y="63" font-size="12" fill="${m.regne ? '#8a5a1a' : '#5a4a3a'}">${e(coupe(info, 25))}</text></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" font-family="Georgia, serif" style="width:100%;height:auto;max-height:100%">${couples}${liens}${succ}${cartes}</svg>`;
}
