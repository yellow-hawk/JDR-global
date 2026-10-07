// Ligne de vue : lancer de rayons de centre à centre, bloqué par les terrains qui bloquent la vue.
import { terrainsSur } from './formes';
import { cellule, centre, distance } from './grille';
import type { Cellule, EtatTable, Grille, TypeTerrain, Zone } from './types';
import { cle } from './types';

function bloqueVue(g: Grille, zones: Zone[], types: TypeTerrain[], c: Cellule): boolean {
  return terrainsSur(g, zones, types, c).some((t) => t.bloqueVue);
}

/** Cases vues depuis `depuis` jusqu'à `portee` cases. Une case qui bloque la vue est vue (on voit le mur), pas au-delà. */
export function casesVisibles(g: Grille, zones: Zone[], types: TypeTerrain[], depuis: Cellule, portee: number): Set<string> {
  const vues = new Set<string>([cle(depuis)]);
  const [fx, fy] = centre(g, depuis);
  const cacheBloque = new Map<string, boolean>();
  const bloque = (c: Cellule) => {
    const k = cle(c);
    if (!cacheBloque.has(k)) cacheBloque.set(k, bloqueVue(g, zones, types, c));
    return cacheBloque.get(k)!;
  };
  for (let dx = -portee; dx <= portee; dx++) {
    for (let dy = -portee; dy <= portee; dy++) {
      const cible: Cellule = [depuis[0] + dx, depuis[1] + dy];
      const d = distance(g, depuis, cible);
      if (d > portee || d === 0) continue;
      const [tx, ty] = centre(g, cible);
      const pas = Math.max(2, Math.ceil(d * 4));
      let cache = false;
      for (let s = 1; s < pas; s++) {
        const t = s / pas;
        const c = cellule(g, fx + (tx - fx) * t, fy + (ty - fy) * t);
        if (c[0] === depuis[0] && c[1] === depuis[1]) continue;
        if (c[0] === cible[0] && c[1] === cible[1]) break;
        if (bloque(c)) { cache = true; break; }
      }
      if (!cache) vues.add(cle(cible));
    }
  }
  return vues;
}

/** Révèle dans le brouillard tout ce que voient les PJ et alliés debout. Renvoie un nouvel état. */
export function revelerParLaVue(e: EtatTable, types: TypeTerrain[]): EtatTable {
  const cases = { ...e.brouillard.cases };
  for (const j of e.jetons) {
    if (j.pv <= 0 || (j.camp !== 'pj' && j.camp !== 'allie')) continue;
    for (const k of casesVisibles(e.grille, e.zones, types, [j.x, j.y], j.vision || 12)) cases[k] = true;
  }
  return { ...e, brouillard: { ...e.brouillard, cases } };
}
