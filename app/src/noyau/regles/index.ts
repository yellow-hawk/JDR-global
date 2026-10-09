// Registre des systèmes de règles. API publique du sous-noyau « règles ».
import type { SystemeRegles } from './types';
import { dnd5e } from './dnd5e';

export type { SystemeRegles, ChampStat, ProfilPnj, SystemeAvecFiche, FicheCalculee, ValeurCalculee, AttaqueCalculee, CatalogueRegles, EntreeCatalogue, ClasseRegles, PeupleRegles, AptitudeRegles, IncantationCalculee, ChoixCreation, OptionsAleatoire, CreationRegles } from './types';
export { aUneFiche } from './types';
export { lancer, d20, formuleValide, jeter, texteJet } from './des';
export type { ResultatDes, JetDes, DeJete, ModeJet } from './des';

const SYSTEMES = new Map<string, SystemeRegles>([[dnd5e.id, dnd5e]]);

export const enregistrerRegles = (s: SystemeRegles): void => { SYSTEMES.set(s.id, s); };
export const listeRegles = (): SystemeRegles[] => [...SYSTEMES.values()];

/** Système demandé, ou D&D 5e si inconnu (chargement tolérant). */
export const regles = (id: string): SystemeRegles => SYSTEMES.get(id) ?? dnd5e;

/** Lit une valeur dans stats par chemin pointé ("carac.for"). */
export function lireStat(stats: Record<string, unknown>, chemin: string): unknown {
  return chemin.split('.').reduce<unknown>(
    (o, k) => (typeof o === 'object' && o !== null ? (o as Record<string, unknown>)[k] : undefined),
    stats,
  );
}

/** Copie de stats avec une valeur modifiée par chemin pointé. */
export function ecrireStat(stats: Record<string, unknown>, chemin: string, valeur: unknown): Record<string, unknown> {
  const [k, ...reste] = chemin.split('.');
  if (!reste.length) return { ...stats, [k]: valeur };
  const sous = (typeof stats[k] === 'object' && stats[k] !== null ? stats[k] : {}) as Record<string, unknown>;
  return { ...stats, [k]: ecrireStat(sous, reste.join('.'), valeur) };
}
