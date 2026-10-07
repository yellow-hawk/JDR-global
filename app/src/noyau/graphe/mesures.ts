// Mesures d'un graphe : degré, intermédiarité (Brandes), communautés (propagation d'étiquettes). Non orienté.
import type { Graphe } from './types';

function voisinage(g: Graphe): Map<string, string[]> {
  const v = new Map(g.noeuds.map((x) => [x.id, [] as string[]]));
  for (const l of g.liens) {
    if (!v.has(l.de) || !v.has(l.vers) || l.de === l.vers) continue;
    v.get(l.de)!.push(l.vers); v.get(l.vers)!.push(l.de);
  }
  for (const [k, l] of v) v.set(k, [...new Set(l)]);
  return v;
}

export function degres(g: Graphe): Record<string, number> {
  const v = voisinage(g);
  return Object.fromEntries([...v].map(([k, l]) => [k, l.length]));
}

/** Centralité d'intermédiarité normalisée (0..1), algorithme de Brandes. */
export function intermediarite(g: Graphe): Record<string, number> {
  const v = voisinage(g), ids = [...v.keys()], cb: Record<string, number> = Object.fromEntries(ids.map((i) => [i, 0]));
  for (const s of ids) {
    const pile: string[] = [], pred = new Map<string, string[]>(), sigma = new Map<string, number>(), dist = new Map<string, number>();
    for (const i of ids) { pred.set(i, []); sigma.set(i, 0); dist.set(i, -1); }
    sigma.set(s, 1); dist.set(s, 0);
    const file = [s];
    for (let t = 0; t < file.length; t++) {
      const x = file[t]; pile.push(x);
      for (const w of v.get(x)!) {
        if (dist.get(w)! < 0) { file.push(w); dist.set(w, dist.get(x)! + 1); }
        if (dist.get(w) === dist.get(x)! + 1) { sigma.set(w, sigma.get(w)! + sigma.get(x)!); pred.get(w)!.push(x); }
      }
    }
    const delta = new Map(ids.map((i) => [i, 0]));
    while (pile.length) {
      const w = pile.pop()!;
      for (const x of pred.get(w)!) delta.set(x, delta.get(x)! + (sigma.get(x)! / sigma.get(w)!) * (1 + delta.get(w)!));
      if (w !== s) cb[w] += delta.get(w)!;
    }
  }
  const n = ids.length, norm = n > 2 ? (n - 1) * (n - 2) : 1;
  for (const i of ids) cb[i] /= norm; // non orienté : chaque paire comptée deux fois → /2, compensé par la normalisation (n−1)(n−2)/2 × 2
  return cb;
}

/** Communautés par propagation d'étiquettes (ordre fixe, déterministe). Renvoie id → numéro de communauté (0 = la plus grande). */
export function communautes(g: Graphe, tours = 20): Record<string, number> {
  const v = voisinage(g), ids = [...v.keys()].sort();
  const lab = new Map(ids.map((i) => [i, i]));
  for (let t = 0; t < tours; t++) {
    let change = false;
    for (const i of ids) {
      const comptes = new Map<string, number>();
      for (const w of v.get(i)!) comptes.set(lab.get(w)!, (comptes.get(lab.get(w)!) ?? 0) + 1);
      if (!comptes.size) continue;
      const max = Math.max(...comptes.values());
      const meilleur = [...comptes].filter(([, c]) => c === max).map(([l]) => l).sort()[0];
      if (meilleur !== lab.get(i) && (comptes.get(lab.get(i)!) ?? 0) < max) { lab.set(i, meilleur); change = true; }
    }
    if (!change) break;
  }
  const tailles = new Map<string, number>();
  for (const l of lab.values()) tailles.set(l, (tailles.get(l) ?? 0) + 1);
  const ordre = [...tailles].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([l]) => l);
  return Object.fromEntries(ids.map((i) => [i, ordre.indexOf(lab.get(i)!)]));
}
