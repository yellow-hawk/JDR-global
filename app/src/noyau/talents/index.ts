// Moteur des arbres de talents (pur, indépendant du système de règles) : arbres applicables, points,
// état d'un talent (acquis, disponible, verrouillé), acquisition et retrait, effets, magie des sceaux.
// Les arbres viennent des règles (talents.json) et de la campagne (arbres du MJ, enregistrés ici).
import type { Effet, Personnage } from '../contrat';

export interface MagieTalent { eveil?: boolean; signes?: string[]; rang?: number; emplacements?: number }

export interface NoeudTalent {
  id: string; nom: string; texte: string;
  /** Ligne dans la branche (1 = racine). */
  rang: number;
  /** Niveau de personnage requis. */
  niveau: number;
  cout: number;
  /** Talents à posséder (tous). */
  requis: string[];
  effets?: Effet[];
  magie?: MagieTalent;
}

export interface BrancheTalents { id: string; nom: string; couleur?: string; noeuds: NoeudTalent[] }

export interface ArbreTalents {
  id: string; nom: string; texte?: string;
  /** À qui l'arbre s'adresse : classes (ids), tous, magie (arbre des sceaux). */
  pour: { classes?: string[]; tous?: boolean; magie?: boolean };
  branches: BrancheTalents[];
  /** Arbre créé ou modifié par le MJ (rangé dans la campagne). */
  personnalise?: boolean;
}

export type EtatTalent = { etat: 'acquis' | 'disponible' | 'verrouille'; raison?: string };

// --- Registre : arbres des règles + arbres de la campagne (les seconds remplacent les premiers à id égal) ---
let DES_REGLES: ArbreTalents[] = [];
let DE_LA_CAMPAGNE: ArbreTalents[] = [];
export const enregistrerArbresDesRegles = (a: ArbreTalents[]): void => { DES_REGLES = a; };
export const enregistrerArbresDeCampagne = (a: ArbreTalents[] | undefined): void => { DE_LA_CAMPAGNE = a ?? []; };
export function tousLesArbres(): ArbreTalents[] {
  const ids = new Set(DE_LA_CAMPAGNE.map((a) => a.id));
  return [...DES_REGLES.filter((a) => !ids.has(a.id)), ...DE_LA_CAMPAGNE];
}
export const arbresDesRegles = (): ArbreTalents[] => DES_REGLES;

const noeuds = (arbres: ArbreTalents[]) => arbres.flatMap((a) => a.branches.flatMap((b) => b.noeuds));
export const noeudParId = (id: string, arbres = tousLesArbres()): NoeudTalent | undefined => noeuds(arbres).find((n) => n.id === id);

const acquis = (p: Personnage): string[] => p.fiche?.progression?.talents ?? [];
const niveauTotal = (p: Personnage): number =>
  Math.max(1, (p.fiche?.progression?.classes ?? []).reduce((s, c) => s + c.niveau, 0) || Number(p.combat.stats.niveau) || 1);

/** Arbres qui s'adressent au personnage (ses classes, les arbres communs). */
export function arbresPour(p: Personnage, arbres = tousLesArbres()): ArbreTalents[] {
  const classes = new Set((p.fiche?.progression?.classes ?? []).map((c) => c.id));
  return arbres.filter((a) => a.pour.tous || (a.pour.classes ?? []).some((c) => classes.has(c)));
}

export function pointsTalent(p: Personnage, parNiveau = 1, arbres = tousLesArbres()) {
  const total = niveauTotal(p) * parNiveau;
  const depenses = acquis(p).reduce((s, id) => s + (noeudParId(id, arbres)?.cout ?? 0), 0);
  return { total, depenses, restants: total - depenses };
}

export function etatTalent(p: Personnage, n: NoeudTalent, parNiveau = 1, arbres = tousLesArbres()): EtatTalent {
  const a = acquis(p);
  if (a.includes(n.id)) return { etat: 'acquis' };
  if (niveauTotal(p) < n.niveau) return { etat: 'verrouille', raison: `niveau ${n.niveau} requis` };
  const manque = n.requis.filter((r) => !a.includes(r));
  if (manque.length) return { etat: 'verrouille', raison: `requiert ${manque.map((r) => noeudParId(r, arbres)?.nom ?? r).join(', ')}` };
  if (pointsTalent(p, parNiveau, arbres).restants < n.cout) return { etat: 'verrouille', raison: `${n.cout} point${n.cout > 1 ? 's' : ''} requis` };
  return { etat: 'disponible' };
}

/** Profil de magie des sceaux mis à jour par un talent (signes appris, rang, emplacements). */
function appliquerMagie(magie: Record<string, unknown> | null | undefined, m: MagieTalent, sens: 1 | -1, restants: MagieTalent[]): Record<string, unknown> | null {
  const base = (magie ?? { rang: 1, signes: [], emplacements: 0, grimoire: [], calibrage: {}, defis: {}, lecons: [], couleur: '#7e22ce', cree: Date.now() }) as Record<string, unknown> & { signes: string[]; emplacements: number; rang: number };
  if (sens > 0) {
    return {
      ...base,
      signes: [...new Set([...(base.signes ?? []), ...(m.signes ?? [])])],
      emplacements: (base.emplacements ?? 0) + (m.emplacements ?? 0),
      rang: Math.max(base.rang ?? 1, m.rang ?? 1),
    };
  }
  const encore = new Set(restants.flatMap((x) => x.signes ?? []));
  return {
    ...base,
    signes: (base.signes ?? []).filter((s) => !(m.signes ?? []).includes(s) || encore.has(s)),
    emplacements: Math.max(0, (base.emplacements ?? 0) - (m.emplacements ?? 0)),
    rang: Math.max(1, ...restants.map((x) => x.rang ?? 1)),
  };
}

const avecTalents = (p: Personnage, talents: string[]): Personnage => ({
  ...p, fiche: { ...(p.fiche ?? {}), progression: { ...(p.fiche?.progression ?? {}), talents } },
});

export function acquerir(p: Personnage, id: string, parNiveau = 1, arbres = tousLesArbres()): Personnage {
  const n = noeudParId(id, arbres);
  if (!n || etatTalent(p, n, parNiveau, arbres).etat !== 'disponible') return p;
  const q = avecTalents(p, [...acquis(p), id]);
  return n.magie ? { ...q, magie: appliquerMagie(p.magie, n.magie, 1, []) } : q;
}

/** Talents qui dépendent de `id` parmi les acquis (on ne peut pas retirer un talent dont d'autres dépendent). */
export const dependants = (p: Personnage, id: string, arbres = tousLesArbres()): NoeudTalent[] =>
  acquis(p).map((x) => noeudParId(x, arbres)).filter((n): n is NoeudTalent => !!n && n.requis.includes(id));

export function retirer(p: Personnage, id: string, arbres = tousLesArbres()): Personnage {
  const n = noeudParId(id, arbres);
  if (!n || !acquis(p).includes(id) || dependants(p, id, arbres).length) return p;
  const reste = acquis(p).filter((x) => x !== id);
  const q = avecTalents(p, reste);
  if (!n.magie) return q;
  const magiesRestantes = reste.map((x) => noeudParId(x, arbres)?.magie).filter((m): m is MagieTalent => !!m);
  return { ...q, magie: appliquerMagie(p.magie, n.magie, -1, magiesRestantes) };
}

/** Rend tous les points (le MJ remet l'arbre à zéro ; la magie apprise par les talents est retirée). */
export function toutRendre(p: Personnage, arbres = tousLesArbres()): Personnage {
  let q = p;
  for (let garde = 0; garde < 200 && acquis(q).length; garde++) {
    const feuille = acquis(q).find((id) => !dependants(q, id, arbres).length);
    if (!feuille) break;
    q = retirer(q, feuille, arbres);
  }
  return q;
}

/** Effets chiffrés des talents acquis (appliqués par le calcul de la fiche). */
export const effetsTalents = (p: Personnage, arbres = tousLesArbres()): Effet[] =>
  acquis(p).flatMap((id) => noeudParId(id, arbres)?.effets ?? []);
