// Disposition d'un arbre généalogique (pur, testé) : une ligne par génération, couples côte à côte,
// fratries centrées sous leurs parents, familles séparées par un écart plus large, morceaux sans lien de sang
// (après un usurpateur) calés sur leur époque et posés à côté. Les traits de descendance passent par des rails
// distincts quand ils se croiseraient.
import type { Famille, MembreFamille } from '../../noyau/contrat';

export const LARGEUR = 170, HAUTEUR = 78, ECART = 24;
const ECART_FAMILLE = 64, ECART_MORCEAU = 160, RAIL = 14, MARGE_ETAGE = 60;

export interface Fratrie { parents: string[]; enfants: string[]; rail: number }

export interface Disposition {
  positions: Record<string, { x: number; y: number }>;
  couples: [string, string][];
  /** Une entrée par groupe d'enfants des mêmes parents ; `rail` = ordonnée du trait horizontal. */
  fratries: Fratrie[];
  /** Successions sans lien de sang (usurpateurs) : du souverain précédent au suivant. */
  successions: [string, string][];
  generations: Record<string, number>;
}

const connu = (n: number | null | undefined): n is number => n !== null && n !== undefined;
const mediane = (l: number[]) => { const t = [...l].sort((a, b) => a - b); return t[Math.floor(t.length / 2)]; };

/**
 * Génération de chaque membre, en suivant parents (−1), enfants (+1) et conjoints (même génération).
 * Les morceaux non reliés sont calés sur le premier d'après les dates de naissance (sinon alignés en haut).
 */
export function generations(f: Famille): Record<string, number> {
  const gen: Record<string, number> = {};
  const enfants = new Map<string, string[]>();
  for (const m of f.membres) for (const p of m.parents) enfants.set(p, [...(enfants.get(p) ?? []), m.id]);
  const parId = new Map(f.membres.map((m) => [m.id, m]));
  const departs = [f.racine, ...f.membres.map((m) => m.id)].filter((x): x is string => !!x && parId.has(x));
  const morceaux: string[][] = [];
  for (const d of departs) {
    if (d in gen) continue;
    gen[d] = 0;
    const file = [d], morceau = [d];
    while (file.length) {
      const id = file.shift()!, m = parId.get(id)!, g = gen[id];
      const voir = (x: string, v: number) => { if (parId.has(x) && !(x in gen)) { gen[x] = v; file.push(x); morceau.push(x); } };
      m.parents.forEach((p) => voir(p, g - 1));
      m.conjoints.forEach((c) => voir(c, g));
      (enfants.get(id) ?? []).forEach((e) => voir(e, g + 1));
    }
    morceaux.push(morceau);
  }
  // Écart de génération observé (médiane parent → enfant), 27 ans faute de dates.
  const ecarts = f.membres.flatMap((m) => m.parents.map((p) => parId.get(p)?.naissance).filter(connu).map((n) => (m.naissance ?? NaN) - n)).filter((x) => !Number.isNaN(x));
  const G = ecarts.length ? Math.max(1, mediane(ecarts)) : 27;
  const ancre = (ids: string[]) => {
    const l = ids.map((id) => parId.get(id)!.naissance).map((n, i) => (connu(n) ? n - gen[ids[i]] * G : null)).filter(connu);
    return l.length ? mediane(l) : null;
  };
  const a0 = ancre(morceaux[0] ?? []);
  const min0 = Math.min(...(morceaux[0] ?? []).map((id) => gen[id]));
  for (const morceau of morceaux.slice(1)) {
    const a = ancre(morceau);
    const decalage = a !== null && a0 !== null ? Math.round((a - a0) / G) : min0 - Math.min(...morceau.map((id) => gen[id]));
    for (const id of morceau) gen[id] += decalage;
  }
  return gen;
}

/** Morceaux reliés (parents, enfants, conjoints), dans l'ordre chronologique de leur doyen. */
function morceauxDe(f: Famille): string[][] {
  const parId = new Map(f.membres.map((m) => [m.id, m]));
  const voisins = new Map<string, string[]>(f.membres.map((m) => [m.id, [...m.parents, ...m.conjoints].filter((x) => parId.has(x))]));
  for (const m of f.membres) for (const p of m.parents) if (parId.has(p)) voisins.get(p)!.push(m.id);
  const vu = new Set<string>(), res: string[][] = [];
  for (const m of f.membres) {
    if (vu.has(m.id)) continue;
    const pile = [m.id], l: string[] = [];
    vu.add(m.id);
    while (pile.length) { const id = pile.pop()!; l.push(id); for (const v of voisins.get(id) ?? []) if (!vu.has(v)) { vu.add(v); pile.push(v); } }
    res.push(l);
  }
  const doyen = (l: string[]) => Math.min(...l.map((id) => parId.get(id)!.naissance ?? Infinity));
  return res.sort((a, b) => doyen(a) - doyen(b));
}

/**
 * Abscisses d'une ligne : chaque unité veut être en `voulu[i]` ; l'ordre est gardé et les unités ne se chevauchent pas.
 * Régression isotone (fusion des blocs adjacents en conflit) : la solution la plus proche des positions voulues.
 */
export function placerLigne(voulu: number[], largeurs: number[], ecarts: number[]): number[] {
  const n = voulu.length, o = [0];
  for (let i = 1; i < n; i++) o.push(o[i - 1] + (largeurs[i - 1] + largeurs[i]) / 2 + ecarts[i - 1]);
  const blocs: { somme: number; nb: number; debut: number }[] = [];
  for (let i = 0; i < n; i++) {
    blocs.push({ somme: voulu[i] - o[i], nb: 1, debut: i });
    while (blocs.length > 1 && blocs[blocs.length - 2].somme / blocs[blocs.length - 2].nb > blocs[blocs.length - 1].somme / blocs[blocs.length - 1].nb) {
      const b = blocs.pop()!, a = blocs[blocs.length - 1];
      a.somme += b.somme; a.nb += b.nb;
    }
  }
  const x: number[] = [];
  for (const b of blocs) for (let k = 0; k < b.nb; k++) x.push(b.somme / b.nb + o[b.debut + k]);
  return x;
}

/** Disposition d'un morceau relié : abscisses relatives de ses membres. */
function disposerMorceau(ids: string[], gen: Record<string, number>, parId: Map<string, MembreFamille>, enfantsDe: (id: string) => string[]): Record<string, number> {
  const dedans = new Set(ids);
  const niveaux = [...new Set(ids.map((id) => gen[id]))].sort((a, b) => a - b);
  // Unités : un membre et ses conjoints de même génération, le membre « de sang » à gauche.
  const unites = new Map<number, string[][]>();
  for (const g of niveaux) {
    const pris = new Set<string>(), us: string[][] = [];
    for (const id of ids) {
      if (gen[id] !== g || pris.has(id)) continue;
      const u = [id, ...parId.get(id)!.conjoints.filter((c) => dedans.has(c) && gen[c] === g && !pris.has(c))];
      u.forEach((x) => pris.add(x));
      u.sort((a, b) => (parId.get(b)!.parents.length ? 1 : 0) - (parId.get(a)!.parents.length ? 1 : 0));
      us.push(u);
    }
    unites.set(g, us);
  }
  const largeur = (u: string[]) => u.length * LARGEUR + (u.length - 1) * ECART;
  const x: Record<string, number> = {};
  const centre = (u: string[]) => (x[u[0]] + x[u[u.length - 1]]) / 2;
  const poser = (u: string[], c: number) => u.forEach((id, k) => { x[id] = c - largeur(u) / 2 + LARGEUR / 2 + k * (LARGEUR + ECART); });
  const famille = (u: string[]) => { const p = u.map((id) => parId.get(id)!.parents.filter((q) => dedans.has(q))).find((l) => l.length); return p ? [...p].sort().join('+') : `seul:${u[0]}`; };
  const ranger = (g: number, voulu: Map<string[], number>) => {
    const us = unites.get(g)!;
    us.sort((a, b) => voulu.get(a)! - voulu.get(b)!);
    const ecarts = us.slice(1).map((u, i) => (famille(u) === famille(us[i]) ? ECART : ECART_FAMILLE));
    placerLigne(us.map((u) => voulu.get(u)!), us.map(largeur), ecarts).forEach((c, i) => poser(us[i], c));
  };
  // Départ : unités serrées, dans l'ordre de découverte.
  for (const g of niveaux) { let cx = 0; for (const u of unites.get(g)!) { poser(u, cx + largeur(u) / 2); cx += largeur(u) + ECART; } }
  const moyenne = (l: number[]) => l.reduce((s, v) => s + v, 0) / l.length;
  // Descente : chaque fratrie centrée sous ses parents. Montée : chaque couple centré sur ses enfants.
  const descendre = (g: number) => {
    const us = unites.get(g)!, groupes = new Map<string, string[][]>();
    for (const u of us) groupes.set(famille(u), [...(groupes.get(famille(u)) ?? []), u]);
    const voulu = new Map<string[], number>();
    for (const [cle, l] of groupes) {
      if (cle.startsWith('seul:')) { l.forEach((u) => voulu.set(u, centre(u))); continue; }
      const milieu = moyenne(cle.split('+').map((p) => x[p]));
      l.sort((a, b) => centre(a) - centre(b));
      const total = l.reduce((s, u) => s + largeur(u), 0) + ECART * (l.length - 1);
      let cx = milieu - total / 2;
      for (const u of l) { voulu.set(u, cx + largeur(u) / 2 + 1e-6 * centre(u)); cx += largeur(u) + ECART; }
    }
    ranger(g, voulu);
  };
  const monter = (g: number) => {
    const voulu = new Map<string[], number>();
    for (const u of unites.get(g)!) {
      const es = u.flatMap(enfantsDe).filter((e) => dedans.has(e));
      voulu.set(u, es.length ? moyenne(es.map((e) => x[e])) : centre(u));
    }
    ranger(g, voulu);
  };
  for (let tour = 0; tour < 8; tour++) {
    niveaux.forEach(descendre);
    [...niveaux].reverse().forEach(monter);
  }
  niveaux.forEach(descendre);
  return x;
}

export function disposer(f: Famille): Disposition {
  const gen = generations(f);
  const parId = new Map(f.membres.map((m) => [m.id, m]));
  const enfants = new Map<string, string[]>();
  for (const m of f.membres) for (const p of m.parents) enfants.set(p, [...(enfants.get(p) ?? []), m.id]);
  const enfantsDe = (id: string) => enfants.get(id) ?? [];

  // Morceaux posés de gauche à droite, chacun dans sa propre bande.
  const x: Record<string, number> = {};
  let bord = 0;
  for (const ids of morceauxDe(f)) {
    const rel = disposerMorceau(ids, gen, parId, enfantsDe);
    const min = Math.min(...ids.map((id) => rel[id])) - LARGEUR / 2, max = Math.max(...ids.map((id) => rel[id])) + LARGEUR / 2;
    for (const id of ids) x[id] = rel[id] - min + bord;
    bord += max - min + ECART_MORCEAU;
  }
  const centreX = bord > 0 ? (bord - ECART_MORCEAU) / 2 : 0;
  for (const id of Object.keys(x)) x[id] -= centreX;

  // Fratries et rails : les traits horizontaux qui se chevauchent passent à des hauteurs différentes.
  const groupes = new Map<string, Fratrie & { g: number }>();
  for (const m of f.membres) {
    const ps = m.parents.filter((p) => parId.has(p));
    if (!ps.length) continue;
    const cle = [...ps].sort().join('+');
    const gr = groupes.get(cle) ?? { parents: ps, enfants: [], rail: 0, g: Math.max(...ps.map((p) => gen[p])) };
    gr.enfants.push(m.id);
    groupes.set(cle, gr);
  }
  const niveaux = [...new Set(Object.values(gen))].sort((a, b) => a - b);
  const voies = new Map<Fratrie & { g: number }, number>(), nbVoies = new Map<number, number>();
  for (const g of niveaux) {
    const l = [...groupes.values()].filter((gr) => gr.g === g).map((gr) => {
      const xs = [...gr.enfants.map((e) => x[e]), gr.parents.reduce((s, p) => s + x[p], 0) / gr.parents.length];
      return { gr, a: Math.min(...xs), b: Math.max(...xs) };
    }).sort((p, q) => p.a - q.a);
    const fins: number[] = [];
    for (const it of l) {
      let v = fins.findIndex((fin) => fin < it.a - 12);
      if (v < 0) { v = fins.length; fins.push(it.b); } else fins[v] = it.b;
      voies.set(it.gr, v);
    }
    nbVoies.set(g, fins.length);
  }
  // Hauteur de chaque étage selon le nombre de rails qui le traversent.
  const y: Record<number, number> = {};
  let cy = 0;
  for (const [i, g] of niveaux.entries()) {
    if (i > 0) {
      const prec = niveaux[i - 1];
      cy += HAUTEUR + Math.max(MARGE_ETAGE, 28 + (nbVoies.get(prec) ?? 0) * RAIL) * (g - prec);
    }
    y[g] = cy;
  }
  const fratries: Fratrie[] = [...groupes.values()].map((gr) => {
    const n = nbVoies.get(gr.g) ?? 1, bas = y[gr.g] + HAUTEUR / 2;
    const suivant = Math.min(...gr.enfants.map((e) => y[gen[e]])) - HAUTEUR / 2;
    return { parents: gr.parents, enfants: gr.enfants, rail: bas + ((suivant - bas) * (voies.get(gr)! + 1)) / (n + 1) };
  });

  const positions: Record<string, { x: number; y: number }> = {};
  for (const m of f.membres) positions[m.id] = { x: x[m.id] ?? 0, y: y[gen[m.id]] ?? 0 };
  const couples: [string, string][] = [];
  for (const m of f.membres) for (const c of m.conjoints) if (m.id < c && parId.has(c)) couples.push([m.id, c]);
  const regnants = f.membres.filter((m) => m.regne).sort((a, b) => a.regne![0] - b.regne![0]);
  const successions: [string, string][] = [];
  for (let i = 1; i < regnants.length; i++) if (!regnants[i].parents.some((p) => parId.has(p))) successions.push([regnants[i - 1].id, regnants[i].id]);
  return { positions, couples, fratries, successions, generations: gen };
}
