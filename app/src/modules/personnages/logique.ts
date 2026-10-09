// Logique pure du module Personnages (aucune dépendance à React ni au navigateur).
import type { Campagne, Personnage, SortePersonnage } from '../../noyau/contrat';
import { nouveauPersonnage } from '../../noyau/contrat';
import type { ChampStat, SystemeRegles } from '../../noyau/regles';
import { aUneFiche, lireStat } from '../../noyau/regles';
import type { Scene } from '../../noyau/bus';

export const SORTES: { id: SortePersonnage; libelle: string; pluriel: string }[] = [
  { id: 'pj', libelle: 'Personnage joueur', pluriel: 'Personnages joueurs' },
  { id: 'allie', libelle: 'Allié', pluriel: 'Alliés' },
  { id: 'pnj', libelle: 'PNJ', pluriel: 'PNJ' },
  { id: 'neutre', libelle: 'Neutre', pluriel: 'Neutres' },
  { id: 'ennemi', libelle: 'Ennemi', pluriel: 'Ennemis' },
];
export const libelleSorte = (s: SortePersonnage): string => SORTES.find((x) => x.id === s)?.libelle ?? s;

/** Les joueurs voient toutes les stats de leur camp, seulement les champs publics des autres. */
export const campJoueurs = (s: SortePersonnage): boolean => s === 'pj' || s === 'allie';

export function champsVisibles(p: Personnage, R: SystemeRegles, role: 'mj' | 'joueurs'): ChampStat[] {
  if (role === 'mj' || campJoueurs(p.sorte)) return R.champs;
  return R.champs.filter((c) => c.publicEnnemi);
}

/** Reporte dans combat.stats ce que la fiche détermine (CA de l'armure portée, attaque de l'arme, niveau). */
export function avecStatsCalculees(p: Personnage, R: SystemeRegles): Personnage {
  if (!aUneFiche(R) || !p.fiche) return p;
  const calc = R.calculer(p).stats;
  const change = Object.entries(calc).some(([k, v]) => p.combat.stats[k] !== v);
  return change ? { ...p, combat: { ...p.combat, stats: { ...p.combat.stats, ...calc } } } : p;
}

/** Onglets de la fiche visibles : les joueurs ne voient que l'identité des personnages hors de leur camp. */
export const ONGLETS = [
  ['identite', 'Identité'], ['caracs', 'Caractéristiques'], ['combat', 'Combat'], ['progression', 'Progression'],
  ['magie', 'Magie'], ['inventaire', 'Inventaire'], ['histoire', 'Histoire'],
] as const;
export type Onglet = (typeof ONGLETS)[number][0];
export function ongletsVisibles(p: Personnage, R: SystemeRegles, role: 'mj' | 'joueurs'): Onglet[] {
  const tous = ONGLETS.map((o) => o[0]).filter((o) => o !== 'caracs' || aUneFiche(R));
  if (role === 'mj' || campJoueurs(p.sorte)) return tous;
  return ['identite', 'combat'];
}

export function ajouter(c: Campagne, sorte: SortePersonnage, R: SystemeRegles): { campagne: Campagne; id: string } {
  const nom = sorte === 'pj' ? 'Nouveau personnage' : `Nouveau ${libelleSorte(sorte).toLowerCase()}`;
  const p = nouveauPersonnage(nom, sorte, R.id, R.statsParDefaut());
  return { campagne: { ...c, personnages: [...c.personnages, p] }, id: p.id };
}

export function modifierPerso(c: Campagne, id: string, f: (p: Personnage) => Personnage): Campagne {
  return { ...c, personnages: c.personnages.map((p) => (p.id === id ? f(p) : p)) };
}

/** Supprime le personnage et la fiche de son portrait. Renvoie aussi l'id du fichier à effacer du stockage. */
export function supprimer(c: Campagne, id: string): { campagne: Campagne; fichierLibere: string | null } {
  const p = c.personnages.find((x) => x.id === id);
  const portrait = p?.portrait ?? null;
  const encoreUtilise = portrait && JSON.stringify(c.personnages.filter((x) => x.id !== id)).includes(portrait);
  return {
    campagne: {
      ...c,
      personnages: c.personnages.filter((x) => x.id !== id),
      fichiers: portrait && !encoreUtilise ? c.fichiers.filter((f) => f.id !== portrait) : c.fichiers,
    },
    fichierLibere: portrait && !encoreUtilise ? portrait : null,
  };
}

/** Personnages regroupés dans l'ordre de SORTES, triés par nom. */
export function grouper(liste: Personnage[]): { sorte: (typeof SORTES)[number]; persos: Personnage[] }[] {
  return SORTES
    .map((sorte) => ({
      sorte,
      persos: liste.filter((p) => p.sorte === sorte.id).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    }))
    .filter((g) => g.persos.length > 0);
}

/** Scène pour l'écran joueurs : identité, notes publiques, stats seulement si le camp le permet. */
export function sceneJoueurs(p: Personnage, R: SystemeRegles, portrait: Blob | null): Scene {
  const stats = champsVisibles(p, R, 'joueurs')
    .map((ch) => {
      const v = lireStat(p.combat.stats, ch.cle);
      return v === undefined || v === '' ? null : `${ch.libelle} ${String(v)}`;
    })
    .filter(Boolean)
    .join(' · ');
  const sousTitre = [libelleSorte(p.sorte), p.sorte === 'pj' && p.joueur ? `joué par ${p.joueur}` : '']
    .filter(Boolean).join(', ');
  return {
    sorte: 'personnage', nom: p.nom, sousTitre,
    texte: [p.notes?.trim(), stats].filter(Boolean).join('\n\n'),
    portrait,
  };
}
