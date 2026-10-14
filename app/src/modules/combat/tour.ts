// Tour d'un PJ joué sur l'écran joueurs (pur, testé) : ce que le MJ envoie (table, à qui le tour, actions possibles
// d'après la fiche) et le contrôle de ce que les joueurs demandent. Le MJ vérifie tout : seul le joueur du PJ actif
// peut agir, avec ses armes et ses sorts, dans la limite de son mouvement et d'une action par tour.
import type { AttaqueCalculee } from '../../noyau/regles';
import type { Rng } from '../../noyau/hasard';
import { attaquer, cle, distance, jetonActif, modCarac, porteeDeplacement, PORTEE_ATTAQUE, TERRAINS } from './moteur';
import type { Cellule, EtatTable, Gabarit, Grille, Jeton } from './moteur';
import { jetonVisible } from './rendu';
import type { Camera } from './rendu';

/** Arme ou attaque du PJ ; `portee` en cases (0 : corps à corps). */
export interface AttaqueTour { nom: string; bonus: number; degats: string; portee: number }
export interface CibleTour { id: number; nom: string; x: number; y: number }
export type SortTour = Pick<Gabarit, 'id' | 'nom' | 'forme' | 'rayon' | 'largeur' | 'portee' | 'origine' | 'couleur' | 'desc'>;

/** Zone de tracé ouverte pour le joueur actif (même forme que la Magie : id, titre, durée en s, cercles guides). */
export interface TraceTour { id: string; titre: string; duree: number; guide: boolean }

/** Ce que peut faire le PJ dont c'est le tour. Seul son écran (ou la tablette, s'il n'a pas de lien) l'affiche. */
export interface OptionsTour {
  /** Identifie le tour : une demande d'un tour passé est ignorée. */
  id: string;
  persoId: string;
  /** Pas de lien personnel : il joue depuis la tablette de la table. */
  tablette: boolean;
  jeton: CibleTour;
  reste: number;
  actionFaite: boolean;
  cases: string[];
  attaques: AttaqueTour[];
  cibles: CibleTour[];
  sorts: SortTour[];
  peutTracer: boolean;
  trace: TraceTour | null;
  /** Sort que le joueur vient de tracer : il le vise tout de suite. */
  viser: number | null;
}

/** Effet 3D d'un sceau tracé, montré à tous (données de la Magie, transmises telles quelles). */
export type EffetTour = Record<string, unknown> & { id: string };

/** Scène « table » de l'écran joueurs. */
export interface VueTable {
  image: Blob; camera: Camera; largeur: number; hauteur: number; grille: Grille;
  round: number;
  actif: { nom: string; camp: Jeton['camp'] } | null;
  ordre: string[];
  options: OptionsTour | null;
  /** Dernier évènement (attaque, sort), lisible par tous. */
  evenement: string | null;
  effet: EffetTour | null;
  /** Nom du PJ qui trace un sceau en ce moment (les autres ne voient pas le tracé). */
  traceur: string | null;
  /** Réponse du MJ à la dernière demande du joueur actif (`n` change à chaque réponse ; `texte` : refus ou résultat). */
  reponse: { n: number; texte: string | null } | null;
}

/** Demandes de l'écran joueurs pendant le tour. */
export type DemandeTour =
  | { tour: string; faire: 'deplacer'; cellule: Cellule }
  | { tour: string; faire: 'attaquer'; attaque: number; cible: number }
  | { tour: string; faire: 'sort'; sort: number; cellule: Cellule; angle: number }
  | { tour: string; faire: 'visee'; cellule: Cellule; angle: number; sort: number | null }
  | { tour: string; faire: 'tracer' }
  /** Traits du sceau, au fil du tracé puis à la fin (réponse de la zone de tracé de la Magie). */
  | { tour: string; faire: 'trace'; id: string; traits: unknown[]; fini: boolean; temps: number }
  | { tour: string; faire: 'finir' };

export const estDemandeTour = (d: Record<string, unknown>): d is DemandeTour & Record<string, unknown> =>
  typeof d.tour === 'string' && typeof d.faire === 'string';

export const idTour = (e: EtatTable): string => `${e.combat.round}:${e.combat.tour}:${e.combat.ordre[e.combat.tour] ?? ''}`;

/** Portée d'une arme de la fiche ("4/12" → 12 cases) ; sans portée : corps à corps. */
export const porteeArme = (p?: string): number => {
  const n = (p ?? '').match(/\d+/g)?.map(Number) ?? [];
  return n.length ? Math.max(...n) : 0;
};
export const porteeAttaque = (a: AttaqueTour): number => (a.portee > 0 ? a.portee : PORTEE_ATTAQUE.melee);

/** Attaques du PJ : celles de sa fiche, sinon l'attaque de son jeton. */
export function attaquesDuJeton(j: Jeton, fiche?: AttaqueCalculee[] | null): AttaqueTour[] {
  if (fiche?.length) return fiche.map((a) => ({ nom: a.nom, bonus: a.bonus, degats: a.degats, portee: porteeArme(a.portee) }));
  return [{ nom: 'Attaque', bonus: j.bonusAttaque ?? modCarac(j.carac.for), degats: j.degats || '1d6', portee: 0 }];
}

/** Ce que les joueurs voient et peuvent viser : debout, visible pour eux, pas soi-même. */
export const ciblesVisibles = (e: EtatTable, j: Jeton): CibleTour[] =>
  e.jetons.filter((x) => x.id !== j.id && x.pv > 0 && jetonVisible(e, x, 'joueurs')).map((x) => ({ id: x.id, nom: x.nom, x: x.x, y: x.y }));

/** Sorts de la table que ce personnage connaît. */
export const sortsDuPerso = (e: EtatTable, persoId: string): SortTour[] =>
  e.sorts.filter((s) => s.lanceurs?.includes(persoId)).map(({ id, nom, forme, rayon, largeur, portee, origine, couleur, desc }) => ({ id, nom, forme, rayon, largeur, portee, origine, couleur, desc }));

/** Options du tour en cours, si c'est le tour d'un PJ lié à un personnage. */
export function optionsTour(e: EtatTable, p: { attaques: AttaqueTour[]; tablette: boolean; peutTracer: boolean; trace: TraceTour | null; viser: number | null }): OptionsTour | null {
  const j = jetonActif(e);
  if (!j || !j.persoId || j.pv <= 0) return null;
  const reste = Math.max(0, j.vitesse - j.mouvementUtilise);
  const portee = porteeDeplacement(e.grille, e.zones, TERRAINS, e.jetons.filter((x) => x.id !== j.id), [j.x, j.y], reste);
  return {
    id: idTour(e), persoId: j.persoId, tablette: p.tablette, jeton: { id: j.id, nom: j.nom, x: j.x, y: j.y },
    reste, actionFaite: j.drapeaux.action, cases: Object.keys(portee).filter((k) => k !== cle([j.x, j.y])),
    attaques: p.attaques, cibles: ciblesVisibles(e, j), sorts: sortsDuPerso(e, j.persoId),
    peutTracer: p.peutTracer, trace: p.trace, viser: p.viser,
  };
}

/**
 * Le joueur a-t-il le droit d'agir ? `perso` : personnage du lien qui envoie (null : tablette ou écran local).
 * Renvoie la raison du refus, ou null.
 */
export function refus(o: OptionsTour | null, d: DemandeTour, perso: string | null): string | null {
  if (!o) return 'Ce n’est le tour d’aucun personnage joueur.';
  if (d.tour !== o.id) return 'Ce tour est terminé.';
  if (perso ? perso !== o.persoId : !o.tablette) return `C’est le tour de ${o.jeton.nom}.`;
  if ((d.faire === 'attaquer' || d.faire === 'sort' || d.faire === 'tracer') && o.actionFaite) return `${o.jeton.nom} a déjà utilisé son action ce tour-ci.`;
  if (d.faire === 'deplacer' && !o.cases.includes(cle(d.cellule))) return 'Case hors de portée de déplacement.';
  if (d.faire === 'attaquer') {
    const a = o.attaques[d.attaque], c = o.cibles.find((x) => x.id === d.cible);
    if (!a) return 'Attaque inconnue.';
    if (!c) return 'Cible invisible ou inconnue.';
  }
  if (d.faire === 'sort' && !o.sorts.some((s) => s.id === d.sort)) return `${o.jeton.nom} ne connaît pas ce sort.`;
  if (d.faire === 'tracer' && !o.peutTracer) return `${o.jeton.nom} ne sait pas tracer de sceau.`;
  return null;
}

/** Attaque avec une arme de la fiche (bonus, dégâts et portée de l'arme). */
export function attaqueAvecArme(e: EtatTable, idA: number, a: AttaqueTour, idC: number, rng: Rng): ReturnType<typeof attaquer> {
  const j = e.jetons.find((x) => x.id === idA), c = e.jetons.find((x) => x.id === idC);
  if (!j || !c) return { etat: e, erreur: 'Jeton introuvable' };
  const max = porteeAttaque(a), d = distance(e.grille, [j.x, j.y], [c.x, c.y]);
  if (d > max) return { etat: e, erreur: `Hors de portée (${d} cases, max ${max})` };
  const arme = { ...j, bonusAttaque: a.bonus, degats: a.degats };
  const r = attaquer({ ...e, jetons: e.jetons.map((x) => (x.id === idA ? arme : x)) }, idA, idC, a.portee > 0 ? 'distance' : 'melee', rng, max);
  // Le jeton garde ses propres valeurs d'attaque.
  return { ...r, etat: { ...r.etat, jetons: r.etat.jetons.map((x) => (x.id === idA ? { ...x, bonusAttaque: j.bonusAttaque, degats: j.degats } : x)) } };
}
