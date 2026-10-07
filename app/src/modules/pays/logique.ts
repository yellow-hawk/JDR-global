// Pays et peuples de la campagne : lecture (Atlas ou fait main), liens avec PNJ, quêtes, cartes, familles ; édition. Pur, testé.
import type { Campagne, Carte, Civilisation, Famille, Personnage, Quete, Univers } from '../../noyau/contrat';

export interface PeupleDeCampagne { univers: Univers; civ: Civilisation }

/** Peuples d'un univers : ceux de l'Atlas, sinon ceux d'un monde fait main (fiche minimale). */
export function civilisationsDe(u: Univers): Civilisation[] {
  if (u.civilisations?.peuples.length) return u.civilisations.peuples;
  return (u.monde?.peuples ?? []).map((p) => ({
    cle: p.id, nom: p.nom, couleur: p.couleur, villes: [], traits: [], coutumes: [], relations: [], histoire: [], noms: [],
    croyance: p.desc ?? '', calendrier: u.monde?.calendrier ?? null, mj: p.mj,
  }));
}

/** Tous les peuples de la campagne, ceux du monde par défaut en premier. */
export function peuplesDeCampagne(c: Campagne): PeupleDeCampagne[] {
  const ordre = [...c.univers].sort((a, b) => (a.id === c.campagne.univers?.id ? -1 : b.id === c.campagne.univers?.id ? 1 : 0));
  return ordre.flatMap((u) => civilisationsDe(u).map((civ) => ({ univers: u, civ })));
}

export const cleDe = (p: PeupleDeCampagne) => `${p.univers.id}:${String(p.civ.cle)}`;

export const pnjDuPeuple = (c: Campagne, p: PeupleDeCampagne): Personnage[] =>
  c.personnages.filter((x) => x.peuple && 'atlas' in x.peuple && x.peuple.atlas === String(p.civ.cle) && (c.campagne.univers?.id ?? c.univers[0]?.id) === p.univers.id);

export function quetesDuPeuple(c: Campagne, p: PeupleDeCampagne): Quete[] {
  const pnj = new Set(pnjDuPeuple(c, p).map((x) => x.id));
  const villes = p.civ.villes.map((v) => v.nom);
  return c.quetes.filter((q) => (!q.univers || q.univers.id === p.univers.id)
    && (q.personnages.some((r) => pnj.has(r.id)) || (q.lieuxTexte ?? []).some((l) => villes.some((v) => l.startsWith(v)))));
}

export function cartesDuPeuple(c: Campagne, p: PeupleDeCampagne): Carte[] {
  const k = String(p.civ.cle);
  return c.cartes.filter((x) => x.univers?.id === p.univers.id && x.source.sorte === 'atlas'
    && (x.source.cle === `pays|${k}` || x.source.cle?.startsWith(`ville|${k}|`)));
}

export const dynastieDuPeuple = (c: Campagne, p: PeupleDeCampagne): Famille | undefined =>
  (c.familles ?? []).find((f) => f.sorte === 'dynastie' && String(f.peuple) === String(p.civ.cle) && (!f.univers || f.univers.id === p.univers.id));

/** Modifie la fiche d'un peuple ; un monde fait main reçoit alors ses propres fiches de civilisation. */
export function modifierCivilisation(c: Campagne, univ: string, cle: number | string, f: (x: Civilisation) => Civilisation): Campagne {
  return {
    ...c,
    univers: c.univers.map((u) => {
      if (u.id !== univ) return u;
      const peuples = civilisationsDe(u).map((x) => (String(x.cle) === String(cle) ? f(x) : x));
      return { ...u, civilisations: { monde: u.civilisations?.monde ?? null, peuples } };
    }),
  };
}

/** Ajoute un peuple à un univers (monde fait main ou complément). */
export function ajouterPeuple(c: Campagne, univ: string, nom: string): { campagne: Campagne; cle: string } {
  const cle = `peuple-${Date.now().toString(36)}`;
  const neuf: Civilisation = { cle, nom, villes: [], traits: [], coutumes: [], relations: [], histoire: [], noms: [], calendrier: null };
  return {
    cle,
    campagne: { ...c, univers: c.univers.map((u) => (u.id === univ ? { ...u, civilisations: { monde: u.civilisations?.monde ?? null, peuples: [...civilisationsDe(u), neuf] } } : u)) },
  };
}

/** Jours de début de chaque mois et position d'une fête dans l'année (0..1). */
export function positionsCalendrier(cal: NonNullable<Civilisation['calendrier']>): { debuts: number[]; fetes: { nom: string; texte?: string; t: number; mois: string; jour: number }[] } {
  const debuts: number[] = [];
  cal.mois.reduce((acc, m) => { debuts.push(acc); return acc + m.jours; }, 0);
  const total = Math.max(1, cal.joursParAn);
  return {
    debuts,
    fetes: cal.fetes.map((f) => ({ nom: f.nom, texte: f.texte, t: ((debuts[f.mois] ?? 0) + f.jour - 1) / total, mois: cal.mois[f.mois]?.nom ?? '?', jour: f.jour })),
  };
}
