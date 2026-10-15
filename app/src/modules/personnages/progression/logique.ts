// Progression (pur) : montée de niveau, distribution d'expérience, XP d'une rencontre.
import type { Campagne, Personnage } from '../../../noyau/contrat';
import type { DonRegles, SystemeAvecFiche } from '../../../noyau/regles';
import { saitFaireDeLaMagie } from '../../magie';
import { avecStatsCalculees } from '../logique';

export interface ChoixNiveau {
  classe: string;
  /** PV gagnés (moyenne ou jet, CON comprise). */
  pv: number;
  sousClasse?: string;
  /** Amélioration de caractéristiques : { for: 2 } ou { for: 1, con: 1 }. */
  amelioration?: Record<string, number>;
  /** Don choisi à la place d'une amélioration (texte libre). */
  don?: string;
}

/** Pourquoi le personnage ne peut pas prendre ce don (null : il peut). Déjà pris, caractéristiques, niveau, magie. */
export function prerequisDon(p: Personnage, d: DonRegles, R: SystemeAvecFiche): string | null {
  if ((p.fiche?.progression?.dons ?? []).includes(d.id)) return 'déjà pris';
  const pr = d.prerequis;
  if (!pr) return null;
  if (pr.niveau && niveauTotal(p) + 1 < pr.niveau) return `niveau ${pr.niveau}`;
  if (pr.magie && !saitFaireDeLaMagie(p, R)) return 'savoir faire de la magie';
  if (pr.caracs) {
    const calc = R.calculer(p);
    const val = (k: string) => calc.caracs.find((c) => c.carac === k)?.valeur ?? 10;
    const manque = Object.entries(pr.caracs).filter(([k, v]) => val(k) < v);
    if (pr.un ? manque.length === Object.keys(pr.caracs).length : manque.length) return `${pr.un ? 'au moins ' : ''}${Object.entries(pr.caracs).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(pr.un ? ' ou ' : ', ')}`;
  }
  return null;
}
/** Les dons du système, avec ce qui empêche de les prendre. */
export const donsAuChoix = (p: Personnage, R: SystemeAvecFiche): { don: DonRegles; raison: string | null }[] =>
  (R.catalogue.dons ?? []).map((don) => ({ don, raison: prerequisDon(p, don, R) }));

const niveauTotal = (p: Personnage) => (p.fiche?.progression?.classes ?? []).reduce((s, c) => s + c.niveau, 0);

/** Où en est le personnage : niveau, XP, seuil du suivant, prêt à monter ? */
export function etatProgression(p: Personnage, R: SystemeAvecFiche) {
  const niveau = Math.max(1, niveauTotal(p) || Number(p.combat.stats.niveau) || 1);
  const xp = p.fiche?.progression?.xp ?? 0;
  const suivant = niveau < 20 ? R.progression.xpNiveaux[niveau] : null;
  const precedent = R.progression.xpNiveaux[niveau - 1] ?? 0;
  return { niveau, xp, suivant, precedent, pret: suivant !== null && xp >= suivant };
}

/** Applique un niveau gagné dans une classe (existante ou nouvelle pour multiclasser). */
export function appliquerNiveau(p: Personnage, R: SystemeAvecFiche, choix: ChoixNiveau, quand: string): Personnage {
  const classes = [...(p.fiche?.progression?.classes ?? [])];
  const i = classes.findIndex((c) => c.id === choix.classe);
  if (i >= 0) classes[i] = { ...classes[i], niveau: Math.min(20, classes[i].niveau + 1), ...(choix.sousClasse ? { sousClasse: choix.sousClasse } : {}) };
  else classes.push({ id: choix.classe, niveau: 1, sousClasse: choix.sousClasse ?? null });
  const nouveau = i >= 0 ? classes[i].niveau : 1;
  const carac = { ...((p.combat.stats.carac ?? {}) as Record<string, number>) };
  for (const [k, v] of Object.entries(choix.amelioration ?? {})) carac[k] = Math.min(20, (carac[k] ?? 10) + v);
  const nomClasse = R.catalogue.classes.find((c) => c.id === choix.classe)?.nom ?? choix.classe;
  const aptitudes = [...(p.fiche?.progression?.aptitudes ?? [])];
  // Un don du catalogue (avec ses effets) ; sinon un don libre, noté parmi les aptitudes.
  const donCatalogue = R.catalogue.dons?.find((d) => d.id === choix.don);
  const dons = [...(p.fiche?.progression?.dons ?? []), ...(donCatalogue ? [donCatalogue.id] : [])];
  if (choix.don && !donCatalogue) aptitudes.push({ nom: choix.don, texte: `Don choisi au niveau ${nouveau} (${nomClasse}).` });
  const pvMax = Number(p.combat.stats.pvMax ?? 0) + choix.pv;
  const suivant: Personnage = {
    ...p,
    combat: { ...p.combat, stats: { ...p.combat.stats, carac, pvMax, pv: Number(p.combat.stats.pv ?? 0) + choix.pv } },
    fiche: {
      ...(p.fiche ?? {}),
      progression: { ...(p.fiche?.progression ?? {}), classes, aptitudes, dons },
      defense: { ...(p.fiche?.defense ?? {}), desVie: (p.fiche?.defense?.desVie ?? niveauTotal(p)) + 1 },
      journal: [...(p.fiche?.journal ?? []), { quand, texte: `Niveau ${niveauTotal(p) + 1} atteint (${nomClasse} ${nouveau}) : +${choix.pv} PV${donCatalogue ? `, don ${donCatalogue.nom}` : ''}.` }],
    },
  };
  return avecStatsCalculees(suivant, R);
}

/** Donne de l'expérience : `total` partagé entre les personnages (ou donné à chacun). */
export function donnerXp(c: Campagne, ids: string[], total: number, raison: string, quand: string, partage = true): Campagne {
  if (!ids.length || total <= 0) return c;
  const gain = partage ? Math.floor(total / ids.length) : Math.floor(total);
  return {
    ...c,
    personnages: c.personnages.map((p) => (!ids.includes(p.id) ? p : {
      ...p,
      fiche: {
        ...(p.fiche ?? {}),
        progression: {
          ...(p.fiche?.progression ?? {}),
          xp: (p.fiche?.progression?.xp ?? 0) + gain,
          journalXp: [...(p.fiche?.progression?.journalXp ?? []), { quand, gain, raison }],
        },
      },
    })),
  };
}

/** XP d'une rencontre : somme des XP des adversaires (selon leur niveau). */
export const xpRencontre = (adversaires: Personnage[], R: SystemeAvecFiche): number =>
  adversaires.reduce((s, p) => s + R.progression.xpAdversaire(Math.max(niveauTotal(p), Number(p.combat.stats.niveau) || 0)), 0);
