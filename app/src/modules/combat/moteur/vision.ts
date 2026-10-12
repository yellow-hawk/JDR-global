// Ligne de vue par rayons projetés : depuis le centre du jeton, des rayons partent dans toutes les directions
// et s'arrêtent sur la première case qui bloque la vue (le mur est vu, pas ce qui est derrière).
// La portée dépend de la lumière de la table et de la vision dans le noir du jeton.
import { terrainsSur } from './formes';
import { cellule, centre, largeurCase } from './grille';
import type { Cellule, EtatTable, Grille, Jeton, TypeTerrain, Zone } from './types';
import { cle } from './types';
import { TERRAINS } from './etat';

export type Lumiere = 'vive' | 'faible' | 'obscurite';
export const LUMIERES: [Lumiere, string][] = [['vive', 'Lumière vive (jour, salle éclairée)'], ['faible', 'Pénombre (crépuscule, clair de lune)'], ['obscurite', 'Obscurité (souterrain, nuit noire)']];
/** Portée d'une torche ou d'une lanterne portée par le groupe, en cases (lumière vive + faible). */
export const PORTEE_TORCHE = 8;

/**
 * Portée de vue d'un jeton, en cases. `vision` = vision dans le noir (0 : aucune).
 * Lumière vive : on voit loin ; pénombre : au moins 12 cases ; obscurité : la vision dans le noir, sinon la torche.
 */
export function porteeVue(j: Pick<Jeton, 'vision'>, lumiere: Lumiere = 'vive'): number {
  const noir = j.vision || 0;
  if (lumiere === 'vive') return 40;
  if (lumiere === 'faible') return Math.max(noir, 12);
  return noir > 0 ? noir : PORTEE_TORCHE;
}

/** Cases qui bloquent la vue, calculées une fois par liste de zones. */
const cacheBloque = new WeakMap<Zone[], Map<string, boolean>>();
function bloqueur(g: Grille, zones: Zone[], types: TypeTerrain[]): (c: Cellule) => boolean {
  if (!zones.some((z) => z.categorie === 'terrain')) return () => false;
  let m = cacheBloque.get(zones);
  if (!m) { m = new Map(); cacheBloque.set(zones, m); }
  const cache = m;
  return (c) => {
    const k = cle(c);
    let v = cache.get(k);
    if (v === undefined) { v = terrainsSur(g, zones, types, c).some((t) => t.bloqueVue); cache.set(k, v); }
    return v;
  };
}

/** Cases vues depuis `depuis` jusqu'à `portee` cases (rayons projetés). */
export function casesVisibles(g: Grille, zones: Zone[], types: TypeTerrain[], depuis: Cellule, portee: number): Set<string> {
  const vues = new Set<string>([cle(depuis)]);
  if (portee <= 0) return vues;
  const bloque = bloqueur(g, zones, types);
  const [fx, fy] = centre(g, depuis);
  const u = largeurCase(g), longueur = (portee + 0.5) * u, pas = u / 4;
  const rayons = Math.max(180, Math.ceil(2 * Math.PI * portee * 2.2));
  for (let i = 0; i < rayons; i++) {
    const a = (i / rayons) * Math.PI * 2, dx = Math.cos(a) * pas, dy = Math.sin(a) * pas;
    let precedente = '';
    for (let d = pas, x = fx + dx, y = fy + dy; d <= longueur; d += pas, x += dx, y += dy) {
      const c = cellule(g, x, y), k = cle(c);
      if (k === precedente) continue;
      precedente = k;
      vues.add(k);
      if (bloque(c)) break;
    }
  }
  return vues;
}

/** Cases vues en ce moment par les PJ et alliés debout (mémorisé par état de jetons et de zones). */
const cacheVue = new WeakMap<Jeton[], { zones: Zone[]; lumiere: Lumiere; vues: Set<string> }>();
export function vueDesPj(e: EtatTable, types: TypeTerrain[] = TERRAINS): Set<string> {
  const lumiere = e.lumiere ?? 'vive';
  const c = cacheVue.get(e.jetons);
  if (c && c.zones === e.zones && c.lumiere === lumiere) return c.vues;
  const vues = new Set<string>();
  for (const j of e.jetons) {
    if (j.pv <= 0 || (j.camp !== 'pj' && j.camp !== 'allie')) continue;
    for (const k of casesVisibles(e.grille, e.zones, types, [j.x, j.y], porteeVue(j, lumiere))) vues.add(k);
  }
  cacheVue.set(e.jetons, { zones: e.zones, lumiere, vues });
  return vues;
}

/** Révèle dans le brouillard tout ce que voient les PJ et alliés debout ; ce qui est révélé le reste. */
export function revelerParLaVue(e: EtatTable, types: TypeTerrain[] = TERRAINS): EtatTable {
  const vues = vueDesPj(e, types);
  if ([...vues].every((k) => e.brouillard.cases[k])) return e;
  const cases = { ...e.brouillard.cases };
  for (const k of vues) cases[k] = true;
  return { ...e, brouillard: { ...e.brouillard, cases } };
}
