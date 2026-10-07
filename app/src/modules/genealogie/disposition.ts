// Disposition d'un arbre généalogique : une ligne par génération, couples côte à côte, enfants sous leurs parents
// (balayages par barycentre). Pur, testé.
import type { Famille } from '../../noyau/contrat';

export const LARGEUR = 150, HAUTEUR = 64, ECART = 26, ETAGE = 130;

export interface Disposition {
  positions: Record<string, { x: number; y: number }>;
  couples: [string, string][];
  descendance: { parents: string[]; enfant: string }[];
  generations: Record<string, number>;
}

/** Génération de chaque membre (0 = racine), en suivant parents (−1), enfants (+1) et conjoints (même génération). */
export function generations(f: Famille): Record<string, number> {
  const gen: Record<string, number> = {};
  const enfants = new Map<string, string[]>();
  for (const m of f.membres) for (const p of m.parents) enfants.set(p, [...(enfants.get(p) ?? []), m.id]);
  const parId = new Map(f.membres.map((m) => [m.id, m]));
  const departs = [f.racine, ...f.membres.map((m) => m.id)].filter((x): x is string => !!x && parId.has(x));
  let decalage = 0;
  for (const d of departs) {
    if (d in gen) continue;
    gen[d] = decalage;
    const file = [d];
    while (file.length) {
      const id = file.shift()!, m = parId.get(id)!, g = gen[id];
      const voir = (x: string, v: number) => { if (parId.has(x) && !(x in gen)) { gen[x] = v; file.push(x); } };
      m.parents.forEach((p) => voir(p, g - 1));
      m.conjoints.forEach((c) => voir(c, g));
      (enfants.get(id) ?? []).forEach((e) => voir(e, g + 1));
    }
  }
  return gen;
}

export function disposer(f: Famille): Disposition {
  const gen = generations(f);
  const parId = new Map(f.membres.map((m) => [m.id, m]));
  const niveaux = [...new Set(Object.values(gen))].sort((a, b) => a - b);
  // Unités : un membre et ses conjoints de même génération, côte à côte.
  const unites = new Map<number, string[][]>();
  for (const g of niveaux) {
    const pris = new Set<string>(), us: string[][] = [];
    for (const m of f.membres) {
      if (gen[m.id] !== g || pris.has(m.id)) continue;
      const u = [m.id, ...m.conjoints.filter((c) => gen[c] === g && !pris.has(c))];
      u.forEach((x) => pris.add(x));
      // le membre « de sang » (qui a des parents dans l'arbre) au centre-gauche
      u.sort((a, b) => (parId.get(b)!.parents.length ? 1 : 0) - (parId.get(a)!.parents.length ? 1 : 0));
      us.push(u);
    }
    unites.set(g, us);
  }
  const x: Record<string, number> = {};
  const placer = (g: number) => {
    let cx = 0;
    for (const u of unites.get(g)!) for (const id of u) { x[id] = cx; cx += LARGEUR + ECART; }
    const decal = cx / 2;
    for (const u of unites.get(g)!) for (const id of u) x[id] -= decal;
    // séparation entre unités
  };
  niveaux.forEach(placer);
  const moyenne = (ids: string[]) => (ids.length ? ids.reduce((s, i) => s + (x[i] ?? 0), 0) / ids.length : null);
  const enfantsDe = (id: string) => f.membres.filter((m) => m.parents.includes(id)).map((m) => m.id);
  for (let tour = 0; tour < 6; tour++) {
    const ordre = tour % 2 === 0 ? niveaux : [...niveaux].reverse();
    for (const g of ordre) {
      const us = unites.get(g)!;
      const cle = (u: string[]) => {
        const ref = tour % 2 === 0 ? u.flatMap((id) => parId.get(id)!.parents) : u.flatMap(enfantsDe);
        return moyenne(ref) ?? moyenne(u)!;
      };
      const cles = new Map(us.map((u) => [u, cle(u)]));
      us.sort((a, b) => cles.get(a)! - cles.get(b)!);
      placer(g);
    }
  }
  const positions: Record<string, { x: number; y: number }> = {};
  for (const m of f.membres) positions[m.id] = { x: x[m.id] ?? 0, y: (gen[m.id] ?? 0) * ETAGE };
  const couples: [string, string][] = [];
  for (const m of f.membres) for (const c of m.conjoints) if (m.id < c && parId.has(c)) couples.push([m.id, c]);
  const descendance = f.membres.filter((m) => m.parents.some((p) => parId.has(p))).map((m) => ({ parents: m.parents.filter((p) => parId.has(p)), enfant: m.id }));
  return { positions, couples, descendance, generations: gen };
}
