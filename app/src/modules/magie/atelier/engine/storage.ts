// Grimoire du MJ. Dans JDR Global, le stockage est celui de la campagne :
// la page Magie appelle configurerStockage() avec des fonctions qui lisent / écrivent la campagne.
// (Avant l'intégration : localStorage « atelier-de-tracage.grimoire.v1 ».)
import type { SortEnregistre } from './types';
import { GRIMOIRE_DE_BASE } from '../data/grimoire';

export const EXEMPLES = GRIMOIRE_DE_BASE;

interface Adaptateur {
  /** Sorts du MJ enregistrés dans la campagne (hors exemples de base non modifiés). */
  lireSorts(): SortEnregistre[];
  /** Ids des exemples de base supprimés par le MJ. */
  lireRetires(): string[];
  ecrireRetires(ids: string[]): void;
}

let adaptateur: Adaptateur = {
  lireSorts: () => [],
  lireRetires: () => [],
  ecrireRetires: () => undefined,
};

export function configurerStockage(a: Adaptateur): void { adaptateur = a; }

/** Fusionne les sorts du MJ avec les sorts de base qu'il n'a pas encore (sauf ceux qu'il a supprimés). */
export function fusionnerAvecBase(perso: SortEnregistre[], retiresListe: string[]): SortEnregistre[] {
  const retires = new Set(retiresListe);
  const ids = new Set(perso.map((s) => s.id));
  const base = GRIMOIRE_DE_BASE.filter((s) => !ids.has(s.id) && !retires.has(s.id));
  const maj = perso.map((s) => (s.categorie ? s : { ...s, categorie: GRIMOIRE_DE_BASE.find((b) => b.id === s.id)?.categorie ?? 'Mes sorts' }));
  return [...maj, ...base];
}

/** Grimoire complet affiché au MJ. */
export function chargerGrimoire(): SortEnregistre[] {
  return fusionnerAvecBase(adaptateur.lireSorts(), adaptateur.lireRetires());
}

export function retirerExemple(id: string): void {
  if (!GRIMOIRE_DE_BASE.some((s) => s.id === id)) return;
  const r = adaptateur.lireRetires();
  if (!r.includes(id)) adaptateur.ecrireRetires([...r, id]);
}

export function restaurerExemples(): void { adaptateur.ecrireRetires([]); }

export const nouvelId = (): string => Math.random().toString(36).slice(2, 10);
