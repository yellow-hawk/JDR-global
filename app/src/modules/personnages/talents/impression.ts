// Arbre de talents en SVG autonome (pur) pour l'impression : même étoile qu'à l'écran, talents acquis en couleur.
import type { ArbreTalents } from '../../../noyau/talents';
import { disposerTalents, RAYON_NOEUD } from './disposition';

const e = (s: unknown): string => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const coupe = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

export function arbreTalentsSvg(a: ArbreTalents, acquis: Set<string> = new Set()): string {
  const d = disposerTalents(a);
  const pos = new Map(d.noeuds.map((p) => [p.noeud.id, p]));
  const r = d.rayon;
  const liens = d.liens.map((l) => {
    const p = pos.get(l.de)!, q = pos.get(l.vers)!, plein = acquis.has(l.de) && acquis.has(l.vers);
    return `<path d="M${p.x},${p.y} Q${((p.x + q.x) / 2) * 0.92},${((p.y + q.y) / 2) * 0.92} ${q.x},${q.y}" fill="none" stroke="${plein ? q.couleur : '#b9a586'}" stroke-width="${plein ? 4 : 2}"${l.ou ? ' stroke-dasharray="6 5"' : ''}/>`;
  }).join('');
  const branches = d.branches.map((b) => `<text x="${b.x}" y="${b.y}" text-anchor="middle" font-size="18" font-weight="600" fill="${b.couleur}">${e(b.nom)}</text>`).join('');
  const noeuds = d.noeuds.map((p) => {
    const n = p.noeud, a2 = acquis.has(n.id), rr = n.sorte === 'sommet' ? RAYON_NOEUD + 7 : n.sorte === 'jonction' ? RAYON_NOEUD + 2 : RAYON_NOEUD;
    const forme = n.sorte === 'jonction'
      ? `<rect x="${-rr}" y="${-rr}" width="${rr * 2}" height="${rr * 2}" rx="6" transform="rotate(45)" fill="${a2 ? p.couleur : '#fbf7ef'}" stroke="${p.couleur}" stroke-width="3"/>`
      : `<circle r="${rr}" fill="${a2 ? p.couleur : '#fbf7ef'}" stroke="${p.couleur}" stroke-width="3"/>`;
    return `<g transform="translate(${p.x},${p.y})">${forme}${n.sorte === 'sommet' ? `<circle r="${rr + 5}" fill="none" stroke="${p.couleur}" stroke-dasharray="3 3"/>` : ''}`
      + `<text text-anchor="middle" dominant-baseline="middle" font-size="22">${e(n.icone ?? '✦')}</text>`
      + `<text y="${rr + 15}" text-anchor="middle" font-size="11"${a2 ? ' font-weight="700"' : ''}>${e(coupe(n.nom, 22))}</text></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-r} ${-r} ${r * 2} ${r * 2}" font-family="Georgia, serif" style="width:100%;height:auto;max-height:100%">${liens}${branches}${noeuds}</svg>`;
}
