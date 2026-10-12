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
  ['identite', 'Identité'], ['caracs', 'Caractéristiques'], ['combat', 'Combat'], ['progression', 'Progression'], ['talents', 'Talents'],
  ['magie', 'Magie'], ['inventaire', 'Inventaire'], ['histoire', 'Histoire'],
] as const;
export type Onglet = (typeof ONGLETS)[number][0];
export function ongletsVisibles(p: Personnage, R: SystemeRegles, role: 'mj' | 'joueurs'): Onglet[] {
  const tous = ONGLETS.map((o) => o[0]).filter((o) => (o !== 'caracs' && o !== 'talents') || aUneFiche(R));
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

/** Ce que le MJ montre d'un personnage : son portrait seul, sa présentation (identité visible), ou sa fiche. */
export type NiveauEcran = 'portrait' | 'presentation' | 'fiche';
export const NIVEAUX_ECRAN: [NiveauEcran, string][] = [['portrait', 'Portrait seul'], ['presentation', 'Présentation'], ['fiche', 'Fiche complète']];
/** Par défaut : la fiche pour le camp des joueurs, la présentation pour les autres. */
export const niveauParDefaut = (p: Personnage): NiveauEcran => (campJoueurs(p.sorte) ? 'fiche' : 'presentation');

const signe = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/** Scène pour l'écran joueurs : jamais de secrets ; les stats seulement au niveau « fiche ». */
export function sceneJoueurs(p: Personnage, R: SystemeRegles, portrait: Blob | null, niveau: NiveauEcran = niveauParDefaut(p)): Scene {
  const f = p.fiche ?? {}, id = f.identite ?? {};
  const cat = aUneFiche(R) ? R.catalogue : null;
  const classes = (f.progression?.classes ?? []).map((c) => `${cat?.classes.find((x) => x.id === c.id)?.nom ?? c.id} ${c.niveau}`).join(' / ');
  const espece = cat?.peuples.find((x) => x.id === id.espece)?.nom;
  const sousTitre = [p.role || libelleSorte(p.sorte), niveau === 'fiche' ? [espece, classes].filter(Boolean).join(' ') : espece, p.sorte === 'pj' && p.joueur ? `joué par ${p.joueur}` : '']
    .filter(Boolean).join(', ');
  if (niveau === 'portrait') return { sorte: 'personnage', nom: p.nom, sousTitre: p.role ?? '', texte: '', portrait };

  const etiquette = (libelle: string, valeur: unknown) => (valeur === undefined || valeur === null || String(valeur).trim() === '' ? null : { libelle, valeur: String(valeur) });
  const age = id.age && /^\d+$/.test(id.age.trim()) ? `${id.age.trim()} ans` : id.age;
  const details = [
    etiquette('Âge', age), etiquette('Genre', id.genre), etiquette('Taille', id.taille), etiquette('Yeux', id.yeux), etiquette('Cheveux', id.cheveux),
    etiquette('Origine', id.origine), etiquette('Divinité', id.divinite),
  ];
  const scene: Scene = { sorte: 'personnage', nom: p.nom, sousTitre, texte: p.notes?.trim() ?? '', portrait };
  if (niveau === 'presentation') return { ...scene, details: details.filter((d): d is NonNullable<typeof d> => !!d) };

  // Fiche : combat, caractéristiques, langues et personnalité.
  const calc = aUneFiche(R) && p.fiche ? R.calculer(p) : null;
  const d = (cle: string) => calc?.derives.find((x) => x.cle === cle)?.texte;
  const combat = calc
    ? [etiquette('Niveau', calc.niveau), etiquette('CA', d('ca')), etiquette('PV', `${String(p.combat.stats.pv ?? '?')} / ${String(p.combat.stats.pvMax ?? '?')}`),
      etiquette('Initiative', d('initiative')), etiquette('Vitesse', d('vitesse')), etiquette('Perception passive', d('perceptionPassive'))]
    : champsVisibles(p, R, 'mj').map((ch) => etiquette(ch.libelle, lireStat(p.combat.stats, ch.cle)));
  const perso = f.personnalite ?? {};
  const blocs = [
    ['Traits', perso.traits], ['Idéaux', perso.ideaux], ['Liens', perso.liens], ['Défauts', perso.defauts],
    ['Langues', (id.langues ?? []).join(', ')], ['Alignement', id.alignement],
  ].filter(([, t]) => t && String(t).trim()).map(([titre, texte]) => ({ titre: titre!, texte: String(texte) }));
  return {
    ...scene,
    details: [...combat, ...details].filter((x): x is NonNullable<typeof x> => !!x),
    caracs: calc?.caracs.map((c) => ({ libelle: c.libelle, valeur: c.valeur, mod: signe(Math.floor((c.valeur - 10) / 2)) })) ?? [],
    blocs,
  };
}
