// Outils communs aux générateurs : grille, rectangles, connexité, choix de cases libres.
import type { Rng } from '../../../noyau/hasard';
import { C, franchissable, get, set, type PlanBataille } from './types';

export const entre = (r: Rng, a: number, b: number): number => a + Math.floor(r() * (b - a + 1));
export const choisir = <T>(r: Rng, l: readonly T[]): T => l[Math.floor(r() * l.length)];

export function grille(largeur: number, hauteur: number, remplir: number): PlanBataille['cases'] {
  return new Array(largeur * hauteur).fill(remplir);
}

export function rect(p: PlanBataille, x: number, y: number, l: number, h: number, v: number): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + l; i++) if (i >= 0 && j >= 0 && i < p.largeur && j < p.hauteur) set(p, i, j, v);
}

/** Pièce : sol entouré de murs (les murs existants sont gardés). */
export function salle(p: PlanBataille, x: number, y: number, l: number, h: number): void {
  for (let j = y - 1; j <= y + h; j++) for (let i = x - 1; i <= x + l; i++) {
    if (i < 0 || j < 0 || i >= p.largeur || j >= p.hauteur) continue;
    const bord = i === x - 1 || j === y - 1 || i === x + l || j === y + h;
    if (!bord) set(p, i, j, C.sol); else if (get(p, i, j) === C.vide) set(p, i, j, C.mur);
  }
}

/** Couloir en L de (a) à (b), large de 1 (ou 2), murs autour. */
export function couloir(p: PlanBataille, a: [number, number], b: [number, number], r: Rng, large = 1): void {
  const [x0, y0] = a, [x1, y1] = b;
  const coude: [number, number] = r() < 0.5 ? [x1, y0] : [x0, y1];
  const trace = (u: [number, number], v: [number, number]) => {
    const dx = Math.sign(v[0] - u[0]), dy = Math.sign(v[1] - u[1]);
    let [x, y] = u;
    for (;;) {
      for (let k = 0; k < large; k++) creuser(p, x + (dy ? k : 0), y + (dx ? k : 0));
      if (x === v[0] && y === v[1]) break;
      x += dx; y += dy;
    }
  };
  trace(a, coude); trace(coude, b);
}

function creuser(p: PlanBataille, x: number, y: number): void {
  if (x <= 0 || y <= 0 || x >= p.largeur - 1 || y >= p.hauteur - 1) return;
  if (get(p, x, y) === C.mur || get(p, x, y) === C.vide) set(p, x, y, C.sol);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    if (get(p, x + dx, y + dy) === C.vide) set(p, x + dx, y + dy, C.mur);
  }
}

/** Cases franchissables accessibles depuis `depart` (parcours en largeur). */
export function accessibles(p: PlanBataille, depart: [number, number]): Set<number> {
  const vus = new Set<number>([depart[1] * p.largeur + depart[0]]);
  const file = [depart];
  while (file.length) {
    const [x, y] = file.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = ny * p.largeur + nx;
      if (!vus.has(k) && franchissable(get(p, nx, ny))) { vus.add(k); file.push([nx, ny]); }
    }
  }
  return vus;
}

/** n cases de sol libres dans un rectangle, éloignées les unes des autres si possible. */
export function casesLibres(p: PlanBataille, r: Rng, zone: { x: number; y: number; l: number; h: number }, n: number): [number, number][] {
  const libres: [number, number][] = [];
  for (let j = zone.y; j < zone.y + zone.h; j++) for (let i = zone.x; i < zone.x + zone.l; i++) if (get(p, i, j) === C.sol || get(p, i, j) === C.chemin) libres.push([i, j]);
  const res: [number, number][] = [];
  for (let t = 0; t < 200 && res.length < n && libres.length; t++) {
    const c = libres.splice(Math.floor(r() * libres.length), 1)[0];
    if (res.every((d) => Math.abs(d[0] - c[0]) + Math.abs(d[1] - c[1]) >= 2) || t > 120) res.push(c);
  }
  return res;
}

/** Bruit de valeur lissé simple (0..1), déterministe. */
export function bruit(r: Rng, l: number, h: number, pas: number): (x: number, y: number) => number {
  const gl = Math.ceil(l / pas) + 2, gh = Math.ceil(h / pas) + 2;
  const g = Array.from({ length: gl * gh }, () => r());
  const v = (i: number, j: number) => g[Math.min(gh - 1, j) * gl + Math.min(gl - 1, i)];
  return (x, y) => {
    const fx = x / pas, fy = y / pas, i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
    const s = (t: number) => t * t * (3 - 2 * t);
    const a = v(i, j) * (1 - s(tx)) + v(i + 1, j) * s(tx), b = v(i, j + 1) * (1 - s(tx)) + v(i + 1, j + 1) * s(tx);
    return a * (1 - s(ty)) + b * s(ty);
  };
}
