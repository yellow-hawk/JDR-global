// Grille carrée ou hexagonale (hexagones « pointe en haut », coordonnées axiales, standard Red Blob Games).
// Repris du moteur hexagonal v7, validé par tests.
import type { Cellule, Grille } from './types';

const R3 = Math.sqrt(3);
/** Rayon d'un hexagone (centre → coin) pour que sa largeur égale la taille de la grille. */
export const tailleHex = (g: Grille): number => g.taille / R3;

export const DIRECTIONS_HEX: Cellule[] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
export const DIRECTIONS_CARREES: Cellule[] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/** Centre d'une case en pixels monde. */
export function centre(g: Grille, [x, y]: Cellule): [number, number] {
  if (g.type === 'hex') {
    const s = tailleHex(g);
    return [s * (R3 * x + (R3 / 2) * y), s * 1.5 * y];
  }
  return [x * g.taille + g.taille / 2, y * g.taille + g.taille / 2];
}

/** Case contenant un point monde (arrondi cubique en hexagonal). */
export function cellule(g: Grille, wx: number, wy: number): Cellule {
  if (g.type === 'hex') {
    const s = tailleHex(g);
    const q = ((R3 / 3) * wx - wy / 3) / s;
    const r = ((2 / 3) * wy) / s;
    const sc = -q - r;
    let rq = Math.round(q), rr = Math.round(r);
    const rs = Math.round(sc);
    const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - sc);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    return [rq + 0, rr + 0]; // + 0 : évite les -0
  }
  return [Math.floor(wx / g.taille), Math.floor(wy / g.taille)];
}

/** Distance en cases (Tchebychev en carré, comme la v7 ; distance hexagonale sinon). */
export function distance(g: Grille, a: Cellule, b: Cellule): number {
  if (g.type === 'hex') return (Math.abs(a[0] - b[0]) + Math.abs(a[0] + a[1] - b[0] - b[1]) + Math.abs(a[1] - b[1])) / 2;
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
}

export function voisins(g: Grille, [x, y]: Cellule): Cellule[] {
  return (g.type === 'hex' ? DIRECTIONS_HEX : DIRECTIONS_CARREES).map(([dx, dy]) => [x + dx, y + dy]);
}

/** Coins d'un hexagone autour d'un centre (pixels), rayon donné. */
export function coinsHex(cx: number, cy: number, rayon: number): [number, number][] {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return [cx + rayon * Math.cos(a), cy + rayon * Math.sin(a)];
  });
}

/** Largeur d'une case en pixels monde (pour la taille des jetons). */
export const largeurCase = (g: Grille): number => (g.type === 'hex' ? tailleHex(g) * R3 * 0.9 : g.taille);

/** Cases d'un rectangle de cases (bornes incluses), utile pour parcourir une zone. */
export function* casesEntre(a: Cellule, b: Cellule): Generator<Cellule> {
  for (let x = Math.min(a[0], b[0]); x <= Math.max(a[0], b[0]); x++) {
    for (let y = Math.min(a[1], b[1]); y <= Math.max(a[1], b[1]); y++) yield [x, y];
  }
}
