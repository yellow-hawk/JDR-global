// Édition des familles dans la campagne (pur, testé) : ajouter parents, enfants, conjoints, frères et sœurs,
// étendre un membre, supprimer, promouvoir un membre en vrai personnage.
import type { Campagne, Civilisation, Famille, MembreFamille } from '../../noyau/contrat';
import { nouvelId, nouveauPersonnage } from '../../noyau/contrat';
import type { SystemeRegles } from '../../noyau/regles';
import { contexte, marier, prenom } from './generateur';

/** Peuple (civilisation) d'une famille, cherché dans le monde par défaut puis dans tous les univers. */
export function civilisationDe(c: Campagne, peuple: Famille['peuple']): Civilisation | null {
  if (peuple === null || peuple === undefined) return null;
  const defaut = c.univers.find((u) => u.id === c.campagne.univers?.id);
  for (const u of [defaut, ...c.univers].filter(Boolean)) {
    const p = u!.civilisations?.peuples.find((x) => String(x.cle) === String(peuple));
    if (p) return p;
  }
  return null;
}

export const ajouterFamille = (c: Campagne, f: Famille): Campagne => ({ ...c, familles: [...(c.familles ?? []), f] });
export const modifierFamille = (c: Campagne, id: string, f: (x: Famille) => Famille): Campagne =>
  ({ ...c, familles: (c.familles ?? []).map((x) => (x.id === id ? f(x) : x)) });
export const supprimerFamille = (c: Campagne, id: string): Campagne => ({ ...c, familles: (c.familles ?? []).filter((x) => x.id !== id) });

const copie = (f: Famille): Famille => ({ ...f, membres: f.membres.map((m) => ({ ...m, parents: [...m.parents], conjoints: [...m.conjoints] })) });
const trouver = (f: Famille, id: string) => f.membres.find((m) => m.id === id)!;

export function modifierMembre(f: Famille, id: string, g: (m: MembreFamille) => MembreFamille): Famille {
  return { ...f, membres: f.membres.map((m) => (m.id === id ? g(m) : m)) };
}

/** Nouveau membre relié à `id`. Renvoie la famille et l'id créé. */
export function ajouterProche(f0: Famille, id: string, lien: 'parent' | 'enfant' | 'conjoint' | 'fratrie', civ: Civilisation | null, graine: string): { famille: Famille; id: string } {
  const f = copie(f0), x = contexte(civ, `${graine}|${f.membres.length}`);
  f.membres.forEach((m) => x.pris.add(m.nom.split(' ')[0]));
  const m = trouver(f, id);
  const neuf: MembreFamille = { id: nouvelId('mbr'), nom: prenom(x), sexe: x.rng() < 0.5 ? 'f' : 'm', parents: [], conjoints: [], naissance: null, mort: null };
  const n = m.naissance ?? null;
  if (lien === 'parent') {
    if (m.parents.length >= 2) return { famille: f0, id };
    neuf.naissance = n !== null ? n - 25 : null;
    const autre = m.parents[0] ? trouver(f, m.parents[0]) : null;
    if (autre) { neuf.sexe = autre.sexe === 'f' ? 'm' : 'f'; marier(autre, neuf); }
    m.parents.push(neuf.id);
  } else if (lien === 'enfant') {
    neuf.naissance = n !== null ? n + 24 : null;
    neuf.parents = [m.id, ...m.conjoints.slice(0, 1)];
  } else if (lien === 'conjoint') {
    neuf.naissance = n;
    if (m.sexe !== '?') neuf.sexe = m.sexe === 'f' ? 'm' : 'f';
    marier(m, neuf);
  } else {
    if (!m.parents.length) {
      // Pas de parents connus : on en crée d'abord, pour que le lien fraternel existe.
      const pa = ajouterProche(f, id, 'parent', civ, `${graine}|p`);
      return ajouterProche(pa.famille, id, 'fratrie', civ, `${graine}|f`);
    }
    neuf.naissance = n !== null ? n + Math.round((x.rng() - 0.5) * 10) : null;
    neuf.parents = [...m.parents];
  }
  f.membres.push(neuf);
  return { famille: f, id: neuf.id };
}

/** Étend un membre : ajoute ce qui manque (deux parents, un conjoint, un ou deux enfants). */
export function etendre(f0: Famille, id: string, civ: Civilisation | null, graine: string): Famille {
  let f = f0;
  const m = () => trouver(f, id);
  while (m().parents.length < 2) f = ajouterProche(f, id, 'parent', civ, `${graine}|e${f.membres.length}`).famille;
  if (!m().conjoints.length) f = ajouterProche(f, id, 'conjoint', civ, `${graine}|c`).famille;
  if (!f.membres.some((x) => x.parents.includes(id))) for (let i = 0; i < 2; i++) f = ajouterProche(f, id, 'enfant', civ, `${graine}|k${i}`).famille;
  return f;
}

/** Supprime un membre et toutes les références vers lui. */
export function supprimerMembre(f: Famille, id: string): Famille {
  return {
    ...f, racine: f.racine === id ? f.membres.find((m) => m.id !== id)?.id ?? null : f.racine,
    membres: f.membres.filter((m) => m.id !== id).map((m) => ({ ...m, parents: m.parents.filter((x) => x !== id), conjoints: m.conjoints.filter((x) => x !== id) })),
  };
}

/** Fait d'un membre un vrai personnage (PNJ avec stats selon son rôle ou son titre). */
export function promouvoir(c: Campagne, familleId: string, membreId: string, R: SystemeRegles): { campagne: Campagne; persoId: string } {
  const f = (c.familles ?? []).find((x) => x.id === familleId)!;
  const m = trouver(f, membreId);
  if (m.persoId) return { campagne: c, persoId: m.persoId };
  const role = m.role && m.role !== 'souverain' && m.role !== 'souverain actuel' ? m.role : m.titre || 'noble';
  const p = { ...nouveauPersonnage(m.nom, 'pnj', R.id, R.statsPourProfil({ role, description: m.notes, graine: m.id })), role,
    notes: [m.titre, m.naissance !== null && m.naissance !== undefined ? `né${m.sexe === 'f' ? 'e' : ''} en ${m.naissance}` : '', m.notes].filter(Boolean).join(', '),
    ...(f.peuple !== null && f.peuple !== undefined ? { peuple: { atlas: String(f.peuple) } } : {}) };
  const familles = (c.familles ?? []).map((x) => (x.id === familleId ? modifierMembre(x, membreId, (y) => ({ ...y, persoId: p.id })) : x));
  return { campagne: { ...c, personnages: [...c.personnages, p], familles }, persoId: p.id };
}

/** Famille à laquelle appartient un personnage (première trouvée). */
export const familleDuPersonnage = (c: Campagne, persoId: string): Famille | undefined =>
  (c.familles ?? []).find((f) => f.membres.some((m) => m.persoId === persoId));
