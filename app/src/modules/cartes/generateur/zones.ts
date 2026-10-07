// Cases bloquantes du plan → rectangles de terrain pour la table de combat (fusion gloutonne).
import { C, type PlanBataille } from './types';

/** Terrain de la table de combat pour chaque sorte de case (les autres n'en ont pas). */
export const TERRAIN_DE_CASE: Partial<Record<number, string>> = {
  [C.mur]: 'mur', [C.colonne]: 'mur', [C.rocher]: 'infranchissable', [C.eau]: 'eau', [C.arbre]: 'couvert', [C.meuble]: 'difficile', [C.gue]: 'difficile',
};

export interface RectTerrain { terrain: string; x0: number; y0: number; x1: number; y1: number } // cases incluses

export function rectanglesTerrain(p: PlanBataille): RectTerrain[] {
  const L = p.largeur, H = p.hauteur;
  const t = p.cases.map((v) => TERRAIN_DE_CASE[v] ?? null);
  const pris = new Array<boolean>(L * H).fill(false);
  const res: RectTerrain[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) {
    const k = y * L + x, ter = t[k];
    if (!ter || pris[k]) continue;
    let x1 = x;
    while (x1 + 1 < L && t[y * L + x1 + 1] === ter && !pris[y * L + x1 + 1]) x1++;
    let y1 = y;
    const ligneOk = (yy: number) => { for (let i = x; i <= x1; i++) if (t[yy * L + i] !== ter || pris[yy * L + i]) return false; return true; };
    while (y1 + 1 < H && ligneOk(y1 + 1)) y1++;
    for (let yy = y; yy <= y1; yy++) for (let i = x; i <= x1; i++) pris[yy * L + i] = true;
    res.push({ terrain: ter, x0: x, y0: y, x1, y1 });
  }
  return res;
}
