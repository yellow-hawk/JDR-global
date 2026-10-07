// Lien entre l'Atelier de tracé et la campagne (logique pure, testée).
//  - un ProfilPJ de l'Atelier = la partie « magie » d'un personnage de la campagne ;
//  - le grimoire du MJ = les sorts de la campagne sans propriétaire ;
//  - les exemples de base supprimés = campagne.modules.magie.exemplesRetires.
import type { Campagne, Personnage, Sort } from '../../noyau/contrat';
import { nouveauPersonnage } from '../../noyau/contrat';
import { regles } from '../../noyau/regles';
import { nouveauProfil, type ProfilPJ } from './atelier/engine/profils';
import type { Sceau, SortEnregistre } from './atelier/engine/types';
import { GRIMOIRE_DE_BASE } from './atelier/data/grimoire';
import { fusionnerAvecBase } from './atelier/engine/storage';
import { hashStr, mulberry32 } from '../../noyau/hasard';
import lanceurs from './lanceurs.json';

/** Personnages qui ont une magie : les PJ, et tout personnage dont la fiche magie existe déjà. */
export const aUneMagie = (p: Personnage): boolean => p.sorte === 'pj' || !!p.magie;

/** Profil de l'Atelier pour un personnage (valeurs de départ si sa magie n'existe pas encore). */
export function profilDe(p: Personnage): ProfilPJ {
  const base = nouveauProfil(p.nom, p.joueur ?? '');
  const m = (p.magie ?? {}) as Partial<ProfilPJ>;
  return { ...base, ...m, id: p.id, nom: p.nom, joueur: p.joueur ?? '', cree: m.cree ?? base.cree };
}

/** Partie à ranger dans personnage.magie (sans id, nom, joueur qui appartiennent au personnage). */
export function magieDepuisProfil(pr: ProfilPJ): Record<string, unknown> {
  const { id: _id, nom: _nom, joueur: _joueur, ...reste } = pr;
  return reste;
}

/**
 * Applique la liste de profils modifiée par l'Atelier à la campagne :
 * profil existant → met à jour la magie (et nom / joueur) ; nouveau profil → crée un PJ ;
 * profil retiré → le personnage reste, seule sa magie est effacée.
 */
export function appliquerProfils(c: Campagne, profils: ProfilPJ[]): Campagne {
  const parId = new Map(profils.map((p) => [p.id, p]));
  const personnages = c.personnages.map((p): Personnage => {
    const pr = parId.get(p.id);
    if (pr) return { ...p, nom: pr.nom, joueur: pr.joueur, magie: magieDepuisProfil(pr) };
    if (aUneMagie(p) && p.magie) return { ...p, magie: null };
    return p;
  });
  const connus = new Set(c.personnages.map((p) => p.id));
  const R = regles(c.campagne.regles);
  for (const pr of profils) {
    if (connus.has(pr.id)) continue;
    const neuf = nouveauPersonnage(pr.nom, 'pj', R.id, R.statsParDefaut());
    personnages.push({ ...neuf, id: pr.id, joueur: pr.joueur, magie: magieDepuisProfil(pr) });
  }
  return { ...c, personnages };
}

/* ---------- grimoire du MJ ---------- */

export function sortsMj(c: Campagne): SortEnregistre[] {
  return c.sorts
    .filter((s) => !s.proprietaire)
    .map((s) => ({
      id: s.id, nom: s.nom, notes: s.notes ?? '', sceau: s.sceau as unknown as Sceau,
      cree: s.cree ?? 0, ...(s.categorie ? { categorie: s.categorie } : {}),
    }));
}


/** Range le grimoire du MJ dans la campagne (tous les sorts, y compris les exemples de base : ce sont des sorts de la campagne). */
export function appliquerSortsMj(c: Campagne, liste: SortEnregistre[]): Campagne {
  const anciens = new Map(c.sorts.map((s) => [s.id, s]));
  const mj: Sort[] = liste
    .map((s) => ({
      ...(anciens.get(s.id) ?? {}),
      id: s.id, nom: s.nom, notes: s.notes, sceau: s.sceau as unknown as Record<string, unknown>,
      cree: s.cree, categorie: s.categorie, proprietaire: null,
    }));
  return { ...c, sorts: [...c.sorts.filter((s) => s.proprietaire), ...mj] };
}

export function exemplesRetires(c: Campagne): string[] {
  const l = c.modules?.magie?.exemplesRetires;
  return Array.isArray(l) ? (l as string[]) : [];
}

export function avecExemplesRetires(c: Campagne, ids: string[]): Campagne {
  return { ...c, modules: { ...(c.modules ?? {}), magie: { ...(c.modules?.magie ?? {}), exemplesRetires: ids } } };
}

/** Grimoire complet du MJ (sorts de la campagne + exemples de base non retirés), pour les autres modules. */
export function grimoireMjComplet(c: Campagne): SortEnregistre[] {
  return fusionnerAvecBase(sortsMj(c), exemplesRetires(c));
}

/* ---------- sorts réels de campagne ---------- */

/** Le grimoire de base de l'Atelier devient de vrais sorts de la campagne (sauf ceux retirés). Sans effet s'ils y sont. */
export function integrerGrimoireDeBase(c: Campagne): Campagne {
  const presents = new Set(c.sorts.map((s) => s.id));
  const retires = new Set(exemplesRetires(c));
  const neufs: Sort[] = GRIMOIRE_DE_BASE.filter((s) => !presents.has(s.id) && !retires.has(s.id)).map((s) => ({
    id: s.id, nom: s.nom, notes: s.notes, sceau: s.sceau as unknown as Record<string, unknown>, cree: s.cree, categorie: s.categorie, proprietaire: null,
  }));
  return neufs.length ? { ...c, sorts: [...c.sorts, ...neufs] } : c;
}

/* ---------- PNJ lanceurs de sorts ---------- */

interface RegleLanceur { motif: string; coeurs: string[]; nombre: number }
const REGLES_LANCEURS = lanceurs.regles as RegleLanceur[];

export const regleLanceur = (role: string): RegleLanceur | undefined => REGLES_LANCEURS.find((r) => new RegExp(r.motif, 'i').test(role));

/** Sorts du grimoire du MJ qui conviennent à un rôle (Cœurs préférés), choix déterministe. */
export function sortsPourRole(c: Campagne, role: string, graine: string): SortEnregistre[] {
  const r = regleLanceur(role);
  if (!r) return [];
  const rng = mulberry32(hashStr(`sorts|${graine}`));
  const cle = (s: SortEnregistre) => (s.sceau.coeur ? s.sceau.coeur.id + (s.sceau.coeur.inv ? '~' : '') : '');
  const candidats = grimoireMjComplet(c).filter((s) => r.coeurs.includes(cle(s)) && s.categorie !== 'Interdit');
  const melange = candidats.map((s) => [rng(), s] as const).sort((a, b) => a[0] - b[0]).map(([, s]) => s);
  return melange.slice(0, r.nombre);
}

/** Donne des sorts aux PNJ lanceurs qui n'ont pas encore de magie (un PNJ dont on a retiré la magie n'est plus touché : drapeau magieAuto). */
export function donnerSortsAuxPnj(c: Campagne): Campagne {
  let change = false;
  const personnages = c.personnages.map((p): Personnage => {
    if (p.sorte === 'pj' || p.magie || !p.role || (p.mj as { magieAuto?: boolean } | undefined)?.magieAuto) return p;
    const grimoire = sortsPourRole(c, p.role, p.id);
    if (!grimoire.length) return p;
    change = true;
    const pr = { ...profilDe(p), rang: 2 as ProfilPJ['rang'], emplacements: Math.max(5, grimoire.length), grimoire };
    return { ...p, magie: magieDepuisProfil(pr), mj: { ...(p.mj ?? {}), magieAuto: true } };
  });
  return change ? { ...c, personnages } : c;
}

/** Préparation d'une campagne à l'ouverture : grimoire de base intégré, PNJ lanceurs équipés. */
export const preparerCampagne = (c: Campagne): Campagne => donnerSortsAuxPnj(integrerGrimoireDeBase(c));
