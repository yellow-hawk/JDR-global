// Temps de jeu et chronologie (pur, testé) : calendrier de référence, horloge qui avance, lunes, fêtes,
// et éléments de la frise (histoire des peuples, séances, événements).
import type { Calendrier, Campagne, Civilisation, DateMonde, Evenement, TempsMonde, Univers } from '../../noyau/contrat';
import { nouvelId } from '../../noyau/contrat';
import { civilisationsDe } from '../pays';
import donnees from './temps.json';

export const AVANCES = donnees.avances as { libelle: string; heures?: number; jours?: number; mois?: number }[];
export const SORTES_EVENEMENT = donnees.sortesEvenement;
export const COULEURS = donnees.couleurs as Record<string, string>;

export interface Reference {
  univers: Univers | null;
  civ: Civilisation | null;
  cal: Calendrier;
  heuresJour: number;
  lunes: { nom: string; periode: number }[];
}

const CAL_DEFAUT: Calendrier = {
  joursParAn: donnees.calendrierDefaut.mois * donnees.calendrierDefaut.jours,
  mois: Array.from({ length: donnees.calendrierDefaut.mois }, (_, i) => ({ nom: `${donnees.calendrierDefaut.nom} ${i + 1}`, jours: donnees.calendrierDefaut.jours })),
  fetes: [],
};

const universDefaut = (c: Campagne): Univers | null => c.univers.find((u) => u.id === c.campagne.univers?.id) ?? c.univers[0] ?? null;

/** Peuples ayant un calendrier, pour choisir la référence. */
export function calendriersDisponibles(c: Campagne): { univers: Univers; civ: Civilisation }[] {
  return c.univers.flatMap((u) => civilisationsDe(u).filter((x) => x.calendrier?.mois.length).map((civ) => ({ univers: u, civ })));
}

/** Calendrier de référence : celui choisi, sinon le premier peuple du monde par défaut qui en a un. */
export function reference(c: Campagne): Reference {
  const ref = c.campagne.temps?.reference;
  const dispo = calendriersDisponibles(c);
  const u0 = universDefaut(c);
  const choix = (ref && dispo.find((x) => x.univers.id === ref.univers && String(x.civ.cle) === String(ref.peuple)))
    ?? dispo.find((x) => x.univers.id === u0?.id) ?? dispo[0];
  const monde = (choix?.univers ?? u0)?.civilisations?.monde ?? null;
  const cal = choix?.civ.calendrier?.mois.length ? { ...choix.civ.calendrier, joursParAn: choix.civ.calendrier.mois.reduce((s, m) => s + m.jours, 0) } : CAL_DEFAUT;
  return { univers: choix?.univers ?? u0, civ: choix?.civ ?? null, cal, heuresJour: monde?.jourHeures || donnees.heuresDefaut, lunes: monde?.lunes ?? [] };
}

/** Temps courant (valeur par défaut : début de l'année actuelle du peuple de référence, 8 h). */
export function tempsDe(c: Campagne): TempsMonde {
  const t = c.campagne.temps;
  if (t?.date) return t;
  const r = reference(c);
  return { date: { an: r.civ?.anActuel ?? 1, mois: 1, jour: 1 }, heure: 8, reference: t?.reference ?? null };
}

export const changerTemps = (c: Campagne, f: (t: TempsMonde) => TempsMonde): Campagne =>
  ({ ...c, campagne: { ...c.campagne, temps: f(tempsDe(c)) } });

/* ---------- calcul de dates ---------- */

/** Jour dans l'année (0 = premier jour). Mois et jour hors bornes sont ramenés dans le calendrier. */
export function jourDansAn(d: DateMonde, cal: Calendrier): number {
  const m = Math.min(Math.max(1, d.mois), cal.mois.length) - 1;
  const avant = cal.mois.slice(0, m).reduce((s, x) => s + x.jours, 0);
  return avant + Math.min(Math.max(1, d.jour), cal.mois[m]?.jours ?? 1) - 1;
}

export const absolu = (d: DateMonde, cal: Calendrier): number => d.an * cal.joursParAn + jourDansAn(d, cal);

export function depuisAbsolu(n: number, cal: Calendrier): DateMonde {
  const an = Math.floor(n / cal.joursParAn);
  let reste = n - an * cal.joursParAn;
  let mois = 0;
  while (mois < cal.mois.length - 1 && reste >= cal.mois[mois].jours) { reste -= cal.mois[mois].jours; mois++; }
  return { an, mois: mois + 1, jour: reste + 1 };
}

/** Fait avancer (ou reculer) le temps. Les mois ajoutés gardent le jour, ramené à la longueur du mois. */
export function avancer(t: TempsMonde, r: Reference, pas: { heures?: number; jours?: number; mois?: number }): TempsMonde {
  let { an, mois, jour } = t.date;
  if (pas.mois) {
    const m = mois - 1 + pas.mois, n = r.cal.mois.length;
    an += Math.floor(m / n);
    mois = (((m % n) + n) % n) + 1;
    jour = Math.min(jour, r.cal.mois[mois - 1].jours);
  }
  const heures = t.heure + (pas.heures ?? 0);
  const jours = (pas.jours ?? 0) + Math.floor(heures / r.heuresJour);
  const heure = ((heures % r.heuresJour) + r.heuresJour) % r.heuresJour;
  return { ...t, heure, date: depuisAbsolu(absolu({ an, mois, jour }, r.cal) + jours, r.cal) };
}

/** Moment de la journée (nuit, aube, matin…), sur une journée ramenée à 24 h. */
export function moment(heure: number, heuresJour: number): string {
  const h24 = (heure / heuresJour) * 24;
  return [...donnees.moments].reverse().find((m) => h24 >= m.debut)?.libelle ?? 'nuit';
}

export function dateLisible(d: DateMonde, cal: Calendrier, heure?: number): string {
  const m = cal.mois[Math.min(Math.max(1, d.mois), cal.mois.length) - 1]?.nom ?? `mois ${d.mois}`;
  return `${d.jour} ${m}, an ${d.an}${heure !== undefined ? ` · ${heure} h` : ''}`;
}

/** Fêtes des `n` prochains jours (aujourd'hui compris), dans l'ordre. */
export function fetesAVenir(t: TempsMonde, r: Reference, n = 60): { nom: string; texte?: string; dans: number; date: DateMonde }[] {
  const auj = absolu(t.date, r.cal);
  const sortie: { nom: string; texte?: string; dans: number; date: DateMonde }[] = [];
  for (const an of [t.date.an, t.date.an + 1]) {
    for (const f of r.cal.fetes) {
      const date = { an, mois: f.mois + 1, jour: f.jour };
      const dans = absolu(date, r.cal) - auj;
      if (dans >= 0 && dans <= n) sortie.push({ nom: f.nom, texte: f.texte, dans, date });
    }
  }
  return sortie.sort((a, b) => a.dans - b.dans);
}

/** Phase de chaque lune (0 = nouvelle, 0,5 = pleine) et jours avant la prochaine pleine lune. */
export function lunes(t: TempsMonde, r: Reference): { nom: string; phase: number; libelle: string; pleineDans: number }[] {
  const j = absolu(t.date, r.cal) + t.heure / r.heuresJour;
  return r.lunes.filter((l) => l.periode > 0).map((l) => {
    const phase = (((j / l.periode) % 1) + 1) % 1;
    const libelle = donnees.phases[Math.floor(((phase + 1 / 16) % 1) * 8)];
    const pleineDans = Math.round((((0.5 - phase) % 1 + 1) % 1) * l.periode);
    return { nom: l.nom, phase, libelle, pleineDans };
  });
}

/* ---------- événements ---------- */

export function ajouterEvenement(c: Campagne, e: Partial<Evenement> & { titre: string; date: DateMonde }): { campagne: Campagne; id: string } {
  const evt: Evenement = { id: nouvelId('evt'), sorte: 'événement', texte: '', liens: [], mj: {}, ...e };
  return { campagne: { ...c, evenements: [...(c.evenements ?? []), evt] }, id: evt.id };
}
export const modifierEvenement = (c: Campagne, id: string, f: (e: Evenement) => Evenement): Campagne =>
  ({ ...c, evenements: (c.evenements ?? []).map((e) => (e.id === id ? f(e) : e)) });
export const supprimerEvenement = (c: Campagne, id: string): Campagne =>
  ({ ...c, evenements: (c.evenements ?? []).filter((e) => e.id !== id) });

/* ---------- frise ---------- */

export interface ElementFrise {
  id: string;
  sorte: 'histoire' | 'seance' | 'evenement';
  /** Position en années (fraction = jour de l'année) dans le calendrier de référence. */
  t: number;
  titre: string;
  texte?: string;
  /** Ligne de la frise. */
  ligne: string;
  couleur: string;
  cible?: { page: string; cible?: string };
}

/**
 * Éléments de la frise. L'histoire de chaque peuple est recalée sur le calendrier de référence
 * grâce à l'année actuelle de chacun (« maintenant » est le même moment pour tous).
 */
export function elementsFrise(c: Campagne): { elements: ElementFrise[]; lignes: string[]; maintenant: number } {
  const r = reference(c);
  const t = tempsDe(c);
  const pos = (d: DateMonde) => d.an + jourDansAn(d, r.cal) / r.cal.joursParAn;
  const anRef = r.civ?.anActuel ?? t.date.an;
  const elements: ElementFrise[] = [];
  const lignes = ['Événements', 'Séances'];
  for (const e of c.evenements ?? []) {
    elements.push({ id: e.id, sorte: 'evenement', t: pos(e.date), titre: e.titre, texte: e.texte, ligne: 'Événements', couleur: COULEURS.evenement });
  }
  for (const s of c.seances) {
    if (!s.dateMonde) continue;
    elements.push({ id: s.id, sorte: 'seance', t: pos(s.dateMonde), titre: `Séance ${s.numero}`, texte: s.resume, ligne: 'Séances', couleur: COULEURS.seance, cible: { page: 'journal' } });
  }
  const u = r.univers;
  for (const civ of u ? civilisationsDe(u) : []) {
    if (!civ.histoire.length) continue;
    const decalage = civ.anActuel !== undefined ? anRef - civ.anActuel : 0;
    const ligne = civ.nom.replace(/^les /, '').replace(/^./, (x) => x.toUpperCase());
    lignes.push(ligne);
    civ.histoire.forEach((h, i) => elements.push({
      id: `hist:${String(civ.cle)}:${i}`, sorte: 'histoire', t: h.an + decalage + 0.5, titre: h.texte.length > 60 ? `${h.texte.slice(0, 57)}…` : h.texte,
      texte: `${h.texte}${decalage ? `\n(an ${h.an} de leur calendrier)` : ''}`, ligne, couleur: civ.couleur ?? COULEURS.histoire,
      cible: u ? { page: 'pays', cible: JSON.stringify({ univers: u.id, cle: civ.cle }) } : undefined,
    }));
  }
  return { elements: elements.sort((a, b) => a.t - b.t), lignes, maintenant: pos(t.date) + t.heure / r.heuresJour / r.cal.joursParAn };
}
