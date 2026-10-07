// Portée de déplacement (parcours en largeur pondéré par le terrain) et chemin jusqu'à une case.
import { terrainsSur } from './formes';
import { voisins } from './grille';
import type { Cellule, Grille, Jeton, TypeTerrain, Zone } from './types';
import { cle } from './types';

export const BLOQUE = 999;

/** Coût pour entrer dans une case : terrain le plus lent, infranchissable ou occupée par un jeton debout. */
export function coutCase(g: Grille, zones: Zone[], types: TypeTerrain[], jetons: Jeton[], c: Cellule, ignorer?: number): number {
  let cout = 1;
  for (const t of terrainsSur(g, zones, types, c)) {
    if (t.bloque) return BLOQUE;
    cout = Math.max(cout, t.cout);
  }
  if (jetons.some((j) => j.id !== ignorer && j.pv > 0 && j.x === c[0] && j.y === c[1])) return BLOQUE;
  return cout;
}

export interface CaseAtteinte { cout: number; depuis: Cellule | null }
export type Portee = Record<string, CaseAtteinte>;

/** Cases atteignables depuis `depart` avec un budget de mouvement (en points de mouvement / cases). */
export function porteeDeplacement(
  g: Grille, zones: Zone[], types: TypeTerrain[], jetons: Jeton[], depart: Cellule, budget: number, ignorer?: number,
): Portee {
  const res: Portee = { [cle(depart)]: { cout: 0, depuis: null } };
  let front: Cellule[] = [depart];
  while (front.length) {
    const suivant: Cellule[] = [];
    for (const c of front) {
      const base = res[cle(c)].cout;
      for (const v of voisins(g, c)) {
        const pas = coutCase(g, zones, types, jetons, v, ignorer);
        if (pas >= BLOQUE) continue;
        const total = base + pas;
        if (total > budget) continue;
        const k = cle(v);
        if (!res[k] || total < res[k].cout) { res[k] = { cout: total, depuis: c }; suivant.push(v); }
      }
    }
    front = suivant;
  }
  return res;
}

/** Chemin depuis le départ jusqu'à `fin` (inclus), ou [] si la case n'est pas atteignable. */
export function chemin(p: Portee, fin: Cellule): Cellule[] {
  const res: Cellule[] = [];
  let k: string | null = cle(fin);
  const vus = new Set<string>();
  while (k && p[k] && !vus.has(k)) {
    vus.add(k);
    res.unshift(k.split(',').map(Number) as Cellule);
    const d: Cellule | null = p[k].depuis;
    k = d ? cle(d) : null;
  }
  return res;
}
