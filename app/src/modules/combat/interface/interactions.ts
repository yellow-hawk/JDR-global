// Aides pures pour l'interaction à la souris : quel jeton / quelle zone sous le pointeur, cases du pinceau, angles.
import { pointDansZone } from '../moteur/formes';
import { centre, distance, largeurCase } from '../moteur/grille';
import type { Cellule, EtatTable, Jeton, Zone } from '../moteur/types';
import { jetonVisible, type Public } from '../rendu';

/** Jeton sous le point monde (wx, wy) : le plus haut dessiné (debout et choisi d'abord). */
export function jetonSous(e: EtatTable, wx: number, wy: number, pub: Public = 'mj'): Jeton | null {
  const u = largeurCase(e.grille);
  const touches = e.jetons.filter((j) => {
    if (!jetonVisible(e, j, pub)) return false;
    const [cx, cy] = centre(e.grille, [j.x, j.y]);
    return Math.hypot(wx - cx, wy - cy) <= (j.taille * u) / 2;
  });
  touches.sort((a, b) => (b.pv > 0 ? 1 : 0) - (a.pv > 0 ? 1 : 0) || b.id - a.id);
  return touches[0] ?? null;
}

/** Zone sous le point : les sorts (dessinés au-dessus) avant les terrains, la plus récente d'abord. */
export function zoneSous(e: EtatTable, wx: number, wy: number): Zone | null {
  const liste = [...e.zones].reverse();
  return liste.find((z) => z.categorie === 'sort' && pointDansZone(e.grille, z, wx, wy))
    ?? liste.find((z) => z.categorie === 'terrain' && pointDansZone(e.grille, z, wx, wy)) ?? null;
}

/** Cases couvertes par le pinceau de brouillard (rayon en cases autour du centre). */
export function casesDuPinceau(e: EtatTable, c: Cellule, rayon: number): Cellule[] {
  const res: Cellule[] = [];
  for (let dx = -rayon - 1; dx <= rayon + 1; dx++) {
    for (let dy = -rayon - 1; dy <= rayon + 1; dy++) {
      const v: Cellule = [c[0] + dx, c[1] + dy];
      if (distance(e.grille, c, v) <= rayon) res.push(v);
    }
  }
  return res;
}

/** Angle (radians) de la case `de` vers le point monde (wx, wy). */
export function angleVers(e: EtatTable, de: Cellule, wx: number, wy: number): number {
  const [cx, cy] = centre(e.grille, de);
  return Math.atan2(wy - cy, wx - cx);
}

/** Les formes orientables (cône, ligne, rectangle) suivent un angle. */
export const formeOrientable = (f: string): boolean => f === 'cone' || f === 'ligne' || f === 'rectangle';
