// État des écrans des joueurs à distance, tel qu'ils le signalent (onglet ouvert, taille de la fenêtre). Gardé en
// mémoire côté MJ (pas dans la campagne) pour le mur des écrans, qui ouvre des copies fidèles.
export interface EtatEcran { onglet: string; l: number; h: number; quand: number }

const etats = new Map<string, EtatEcran>();
const ecouteurs = new Set<(e: Map<string, EtatEcran>) => void>();

export function noterEcran(persoId: string, brut: unknown): void {
  const e = brut as Partial<EtatEcran> | null;
  if (!e || typeof e.onglet !== 'string') return;
  const l = Math.round(Number(e.l)), h = Math.round(Number(e.h));
  if (!(l >= 200 && l <= 8000 && h >= 200 && h <= 8000)) return;
  etats.set(persoId, { onglet: e.onglet.slice(0, 30), l, h, quand: Date.now() });
  ecouteurs.forEach((f) => f(new Map(etats)));
}

/** Abonnement à l'état des écrans (par personnage). */
export function suivreEcransJoueurs(f: (e: Map<string, EtatEcran>) => void): () => void {
  ecouteurs.add(f); f(new Map(etats));
  return () => { ecouteurs.delete(f); };
}
