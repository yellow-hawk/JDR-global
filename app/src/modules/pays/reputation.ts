// Réputation du groupe auprès des peuples : jauge −100..+100, niveaux (reputation.json), historique,
// effets des quêtes terminées (appliqués une seule fois). Pur, testé.
import type { Campagne, Quete } from '../../noyau/contrat';
import { modifierCivilisation } from './logique';
import donnees from './reputation.json';

export const NIVEAUX = donnees.niveaux;
export const PAS = donnees.pas;

export function niveauReputation(v = 0): { libelle: string; couleur: string } {
  return [...NIVEAUX].reverse().find((n) => v >= n.min) ?? NIVEAUX[0];
}

const borner = (v: number) => Math.max(-100, Math.min(100, Math.round(v)));

export function changerReputation(c: Campagne, univers: string, cle: number | string, delta: number, raison: string, quand: string): Campagne {
  if (!delta) return c;
  return modifierCivilisation(c, univers, cle, (x) => ({
    ...x,
    reputation: borner((x.reputation ?? 0) + delta),
    reputationJournal: [...(x.reputationJournal ?? []), { quand, delta, raison }].slice(-40),
  }));
}

/** Applique les effets de réputation d'une quête terminée, une seule fois (marque `mj.reputationAppliquee`). */
export function appliquerReputationQuete(c: Campagne, queteId: string, quand: string): Campagne {
  const q = c.quetes.find((x) => x.id === queteId);
  if (!q || q.statut !== 'terminee' || !q.reputation?.length) return c;
  if ((q.mj as { reputationAppliquee?: boolean } | undefined)?.reputationAppliquee) return c;
  let x = c;
  for (const e of q.reputation) x = changerReputation(x, e.univers, e.peuple, e.delta, `Quête « ${q.titre} »`, quand);
  return { ...x, quetes: x.quetes.map((y) => (y.id === q.id ? { ...y, mj: { ...(y.mj ?? {}), reputationAppliquee: true } } : y)) };
}

export const effetsReputation = (q: Quete): NonNullable<Quete['reputation']> => q.reputation ?? [];
