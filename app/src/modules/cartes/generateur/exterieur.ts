// Extérieurs : plaine, forêt, route, gué, ruines, camp, désert, neige, marais, cercle de pierres, cratère, côte.
import type { Rng } from '../../../noyau/hasard';
import { accessibles, bruit, casesLibres, entre, grille, rect } from './outils';
import { C, get, set, type Ambiance, type PlanBataille, type SorteExterieur } from './types';

const AMBIANCE: Record<SorteExterieur, Ambiance> = {
  plaine: 'herbe', foret: 'foret', route: 'herbe', gue: 'herbe', ruines: 'herbe', camp: 'herbe', desert: 'sable',
  neige: 'neige', marais: 'marais', cercle: 'herbe', cratere: 'roche', cote: 'sable',
};
const ARBRES: Record<SorteExterieur, number> = {
  plaine: 0.06, foret: 0.32, route: 0.14, gue: 0.1, ruines: 0.07, camp: 0.08, desert: 0, neige: 0.12, marais: 0.12, cercle: 0.05, cratere: 0, cote: 0.02,
};

function riviere(p: PlanBataille, r: Rng, large: number, gue: boolean): void {
  let x = Math.round(p.largeur * (0.45 + r() * 0.1));
  const yg = entre(r, Math.round(p.hauteur * 0.35), Math.round(p.hauteur * 0.6));
  for (let y = 0; y < p.hauteur; y++) {
    if (r() < 0.35) x += r() < 0.5 ? -1 : 1;
    for (let k = 0; k < large; k++) set(p, x + k, y, gue && Math.abs(y - yg) <= 1 ? C.gue : C.eau);
  }
}

function chemin(p: PlanBataille, r: Rng): void {
  let y = Math.round(p.hauteur / 2);
  for (let x = 0; x < p.largeur; x++) {
    if (r() < 0.3) y = Math.max(2, Math.min(p.hauteur - 3, y + (r() < 0.5 ? -1 : 1)));
    set(p, x, y, C.chemin); set(p, x, y + 1, C.chemin);
  }
}

export function genererExterieur(r: Rng, titre: string, graine: string, sorte: SorteExterieur): PlanBataille {
  const L = 34, H = 24;
  const p: PlanBataille = { titre, theme: 'exterieur', ambiance: AMBIANCE[sorte], largeur: L, hauteur: H, cases: grille(L, H, C.sol), pieces: [], depart: [], ennemis: [], graine };
  const n = bruit(r, L, H, 6), n2 = bruit(r, L, H, 3);
  const cx = L >> 1, cy = H >> 1;
  // Végétation et rochers (une clairière au centre).
  for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) {
    const centre = Math.hypot((x - cx) / L, (y - cy) / H) < 0.18;
    const v = n(x, y) * 0.6 + n2(x, y) * 0.4;
    if (!centre && r() < ARBRES[sorte] * (0.4 + v * 1.4)) set(p, x, y, C.arbre);
    else if (r() < (sorte === 'cratere' || sorte === 'desert' ? 0.05 : 0.015)) set(p, x, y, C.rocher);
  }
  if (sorte === 'marais') for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) if (n(x + 50, y) > 0.62) set(p, x, y, C.eau);
  if (sorte === 'cote') for (let y = 0; y < H; y++) for (let x = Math.round(L * 0.7 + n(0, y) * 4); x < L; x++) set(p, x, y, C.eau);
  if (sorte === 'gue') riviere(p, r, 3, true);
  if (sorte === 'route' || sorte === 'camp') chemin(p, r);
  if (sorte === 'ruines') {
    for (let k = 0; k < 5; k++) {
      const x = entre(r, 4, L - 10), y = entre(r, 3, H - 8), l = entre(r, 4, 8), h = entre(r, 3, 6);
      for (let i = x; i <= x + l; i++) for (const j of [y, y + h]) if (r() < 0.7) set(p, i, j, C.mur);
      for (let j = y; j <= y + h; j++) for (const i of [x, x + l]) if (r() < 0.7) set(p, i, j, C.mur);
      if (r() < 0.5) set(p, x + (l >> 1), y + (h >> 1), C.colonne);
    }
    for (let k = 0; k < 14; k++) { const x = entre(r, 1, L - 2), y = entre(r, 1, H - 2); if (get(p, x, y) === C.sol) set(p, x, y, C.rocher); }
  }
  if (sorte === 'cercle' || sorte === 'cratere') {
    const R = sorte === 'cercle' ? 5 : 8;
    for (let a = 0; a < 16; a++) { const t = (a / 16) * Math.PI * 2; set(p, Math.round(cx + Math.cos(t) * R), Math.round(cy + Math.sin(t) * R * 0.85), sorte === 'cercle' ? C.colonne : C.rocher); }
    if (sorte === 'cercle') set(p, cx, cy, C.meuble);
  }
  if (sorte === 'camp') {
    for (let k = 0; k < 6; k++) {
      const t = (k / 6) * Math.PI * 2, x = Math.round(cx + Math.cos(t) * 7), y = Math.round(cy + Math.sin(t) * 5);
      rect(p, x, y, 2, 2, C.meuble);
    }
    set(p, cx, cy, C.meuble);
  }
  // Bords de carte dégagés là où arrivent les PJ et où attendent les adversaires.
  for (let y = 0; y < H; y++) for (const x of [0, 1, 2, L - 2, L - 1]) if (get(p, x, y) === C.arbre || (x < 3 && get(p, x, y) === C.eau)) set(p, x, y, C.sol);
  // Un passage dégagé du bord ouest vers les adversaires (gué sur l'eau), pour que tout soit atteignable.
  const xe = sorte === 'cote' ? Math.round(L * 0.55) : sorte === 'camp' || sorte === 'cercle' || sorte === 'ruines' ? cx : L - 5;
  for (let x = 0; x <= xe; x++) for (const y of [cy, cy + 1]) {
    const v = get(p, x, y);
    if (v === C.eau) set(p, x, y, C.gue); else if (v !== C.chemin && v !== C.gue && v !== C.meuble && v !== C.colonne) set(p, x, y, C.sol);
  }
  p.depart = casesLibres(p, r, { x: 0, y: cy - 4, l: 3, h: 8 }, 4);
  p.ennemis = casesLibres(p, r, sorte === 'camp' || sorte === 'cercle' || sorte === 'ruines' ? { x: cx - 5, y: cy - 4, l: 10, h: 8 } : { x: xe - 4, y: cy - 6, l: 7, h: 12 }, 5);
  const acc = accessibles(p, p.depart[0] ?? [0, cy]);
  p.ennemis = p.ennemis.filter(([x, y]) => acc.has(y * L + x));
  if (!p.ennemis.length) p.ennemis = [[xe, cy]];
  p.pieces = [{ x: cx - 4, y: cy - 3, l: 8, h: 6, nom: titre }];
  return p;
}
