// État de la table : création, jetons, zones, brouillard, bibliothèque, sorts. Fonctions pures (nouvel état renvoyé).
import donnees from './donnees.json';
import type { Camp, Cellule, EtatTable, Gabarit, Jeton, LigneJournal, Modele, TypeTerrain, Zone } from './types';
import { CARACS } from './types';

export const TERRAINS = donnees.terrains as TypeTerrain[];
export const CONDITIONS: string[] = donnees.conditions;
export const CONDITIONS_BONUS = new Set<string>(donnees.conditionsBonus);
export const SORTS_DE_BASE = donnees.sorts as Gabarit[];
export const BIBLIOTHEQUE_DE_BASE = donnees.bibliotheque as unknown as Modele[];

export const modCarac = (v: number): number => Math.floor((v - 10) / 2);
export const signe = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);

export function nouvelEtat(): EtatTable {
  return {
    version: 1,
    grille: { type: 'carree', taille: 40 },
    jetons: [], zones: [],
    sorts: SORTS_DE_BASE.map((s) => ({ ...s, effets: [...s.effets] })),
    bibliotheque: BIBLIOTHEQUE_DE_BASE.map((m) => ({ ...m, carac: { ...m.carac } })),
    prochainId: 1, prochaineZone: 1,
    combat: { actif: false, round: 0, tour: 0, ordre: [] },
    brouillard: { actif: false, cases: {} },
    vision: false, porteeDeplacement: true,
    journal: [], fond: null,
    opacites: { carte: 1, jetons: 0.95, sorts: 0.35, terrains: 0.3 },
  };
}

/* ---------- journal ---------- */

export function journaliser(e: EtatTable, msg: string, cls: LigneJournal['cls'] = 'info'): EtatTable {
  const ligne: LigneJournal = { t: e.combat.actif ? `R${e.combat.round}` : '–', msg, cls };
  return { ...e, journal: [...e.journal, ligne].slice(-400) };
}

/* ---------- jetons ---------- */

const DRAPEAUX_VIDES = { action: false, bonus: false, reaction: false, mouvement: false };

/** Jeton complet à partir d'un modèle partiel (valeurs par défaut de la v7). */
export function jetonDepuisModele(m: Partial<Modele> & { nom?: string }, id: number, x: number, y: number): Jeton {
  const carac = Object.fromEntries(CARACS.map((k) => [k, m.carac?.[k] ?? 10])) as Jeton['carac'];
  const pvMax = m.pvMax ?? 20;
  return {
    id, nom: m.nom ?? '?', camp: m.camp ?? 'ennemi', pv: m.pv ?? pvMax, pvMax, ca: m.ca ?? 10, vitesse: m.vitesse ?? 6,
    carac, x, y, taille: m.taille ?? 1, conditions: [], notes: m.notes ?? '', couleur: m.couleur ?? null, visible: true,
    auras: m.auras ? m.auras.map((a) => ({ ...a })) : [], drapeaux: { ...DRAPEAUX_VIDES }, concentration: null,
    mouvementUtilise: 0, vision: m.vision ?? 12, degats: m.degats ?? '1d8', bonusAttaque: m.bonusAttaque ?? null,
    initiative: 0, persoId: m.persoId ?? null, portrait: m.portrait ?? null,
  };
}

export function ajouterJeton(e: EtatTable, m: Partial<Modele>, x: number, y: number): { etat: EtatTable; id: number } {
  const j = jetonDepuisModele(m, e.prochainId, x, y);
  return { etat: { ...e, jetons: [...e.jetons, j], prochainId: e.prochainId + 1 }, id: j.id };
}

export const modifierJeton = (e: EtatTable, id: number, f: (j: Jeton) => Jeton): EtatTable =>
  ({ ...e, jetons: e.jetons.map((j) => (j.id === id ? f(j) : j)) });

export function supprimerJeton(e: EtatTable, id: number): EtatTable {
  return { ...e, jetons: e.jetons.filter((j) => j.id !== id), combat: { ...e.combat, ordre: e.combat.ordre.filter((x) => x !== id) } };
}

export function dupliquerJeton(e: EtatTable, id: number): { etat: EtatTable; id: number } {
  const o = e.jetons.find((j) => j.id === id);
  if (!o) return { etat: e, id };
  const j: Jeton = { ...o, id: e.prochainId, nom: `${o.nom} (2)`, x: o.x + 1, y: o.y + 1, persoId: null,
    conditions: [...o.conditions], auras: o.auras.map((a) => ({ ...a })), drapeaux: { ...DRAPEAUX_VIDES }, concentration: null };
  return { etat: { ...e, jetons: [...e.jetons, j], prochainId: e.prochainId + 1 }, id: j.id };
}

export function modifierPV(e: EtatTable, id: number, delta: number): EtatTable {
  const j = e.jetons.find((x) => x.id === id);
  if (!j) return e;
  const pv = Math.max(0, Math.min(j.pvMax, j.pv + delta));
  return journaliser(modifierJeton(e, id, (x) => ({ ...x, pv })), `${j.nom} ${signe(delta)} → ${pv}`, delta < 0 ? 'degats' : 'soin');
}

export const ajouterCondition = (e: EtatTable, id: number, c: string): EtatTable =>
  !c.trim() ? e : modifierJeton(e, id, (j) => (j.conditions.includes(c) ? j : { ...j, conditions: [...j.conditions, c.trim()] }));

export const retirerCondition = (e: EtatTable, id: number, c: string): EtatTable =>
  modifierJeton(e, id, (j) => ({ ...j, conditions: j.conditions.filter((x) => x !== c) }));

/** Première case libre en spirale autour d'une case. */
export function caseLibre(e: EtatTable, depart: Cellule): Cellule {
  for (let d = 0; d < 40; d++) {
    for (let dx = -d; dx <= d; dx++) {
      for (let dy = -d; dy <= d; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
        const x = depart[0] + dx, y = depart[1] + dy;
        if (!e.jetons.some((j) => j.x === x && j.y === y)) return [x, y];
      }
    }
  }
  return depart;
}

/* ---------- zones ---------- */

export function ajouterZone(e: EtatTable, z: Omit<Zone, 'id'>): { etat: EtatTable; id: number } {
  const zone: Zone = { ...z, id: e.prochaineZone };
  return { etat: { ...e, zones: [...e.zones, zone], prochaineZone: e.prochaineZone + 1 }, id: zone.id };
}

export const modifierZone = (e: EtatTable, id: number, f: (z: Zone) => Zone): EtatTable =>
  ({ ...e, zones: e.zones.map((z) => (z.id === id ? f(z) : z)) });

export const supprimerZone = (e: EtatTable, id: number): EtatTable => ({ ...e, zones: e.zones.filter((z) => z.id !== id) });

export const supprimerZones = (e: EtatTable, categorie: Zone['categorie'] | 'tout'): EtatTable =>
  ({ ...e, zones: categorie === 'tout' ? [] : e.zones.filter((z) => z.categorie !== categorie) });

/** Déplace une zone (et tous les points d'un polygone) vers une nouvelle case d'ancrage. */
export function deplacerZone(e: EtatTable, id: number, c: Cellule): EtatTable {
  return modifierZone(e, id, (z) => {
    const dx = c[0] - z.x, dy = c[1] - z.y;
    return { ...z, x: c[0], y: c[1], points: z.points?.map((p) => [p[0] + dx, p[1] + dy] as Cellule) };
  });
}

export function zoneDeTerrain(t: TypeTerrain, forme: 'cercle' | 'carre', x: number, y: number, rayon: number): Omit<Zone, 'id'> {
  return { categorie: 'terrain', forme, x, y, rayon, angle: 0, couleur: t.couleur, nom: t.nom, terrain: t.id };
}

/* ---------- brouillard ---------- */

export function peindreBrouillard(e: EtatTable, cases: Cellule[], reveler: boolean): EtatTable {
  const c = { ...e.brouillard.cases };
  for (const [x, y] of cases) { const k = `${x},${y}`; if (reveler) c[k] = true; else delete c[k]; }
  return { ...e, brouillard: { ...e.brouillard, cases: c } };
}

/* ---------- bibliothèque et sorts ---------- */

export function modeleDepuisJeton(j: Jeton): Modele {
  const { id: _i, x: _x, y: _y, conditions: _c, drapeaux: _d, concentration: _co, mouvementUtilise: _m, initiative: _in, visible: _v, pv: _p, persoId: _pe, ...m } = j;
  return { ...m, carac: { ...j.carac }, auras: j.auras.map((a) => ({ ...a })), persoId: null };
}

export function ajouterSort(e: EtatTable, s: Omit<Gabarit, 'id'>): EtatTable {
  const id = Math.max(99, ...e.sorts.map((x) => x.id)) + 1;
  return { ...e, sorts: [...e.sorts, { ...s, id }] };
}

/** Remplace les sorts venus de l'Atelier par une nouvelle liste. */
export function remplacerSortsAtelier(e: EtatTable, liste: Omit<Gabarit, 'id'>[]): EtatTable {
  const base = e.sorts.filter((s) => !s.atelier);
  let id = Math.max(999, ...e.sorts.map((x) => x.id));
  return { ...e, sorts: [...base, ...liste.map((s) => ({ ...s, id: ++id, atelier: true }))] };
}

export const campLibelle: Record<Camp, string> = { pj: 'PJ', allie: 'Alliés', ennemi: 'Ennemis', neutre: 'Neutres' };
