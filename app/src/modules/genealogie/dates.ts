// Cohérence des dates d'un arbre (pur, testé) : naissances déduites des proches, morts posées quand l'âge l'exige,
// aucune naissance après l'année en cours, parents assez âgés, règnes compris dans la vie du souverain.
import type { Famille, MembreFamille } from '../../noyau/contrat';
import { hashStr, mulberry32 } from '../../noyau/hasard';

/** Longévité d'un peuple : âge adulte et âge maximal. */
export interface Vie { adulte: number; max: number }
export const VIE_HUMAINE: Vie = { adulte: 18, max: 80 };
export const vieDepuis = (v?: readonly number[] | null): Vie => (v && v.length >= 2 ? { adulte: v[0], max: v[1] } : VIE_HUMAINE);

/** Écart habituel entre deux générations, et âge minimal d'un parent. */
export const ecartGeneration = (v: Vie): number => Math.round(v.adulte * 1.5);
export const ageMinParent = (v: Vie): number => Math.round(v.adulte * 0.85);

/** Âge auquel ce membre meurt (stable : tiré de son identifiant), entre 55 % et 100 % de la longévité. */
export function ageDeMort(id: string, v: Vie): number {
  const r = mulberry32(hashStr(`mort|${id}`))();
  return Math.round(v.max * (0.55 + 0.45 * Math.sqrt(r)));
}

/** Mort déduite pour un membre sans date de mort, s'il serait déjà mort en l'an `an` (sinon null). */
export function mortAttendue(m: MembreFamille, an: number, v: Vie): number | null {
  if (m.naissance === null || m.naissance === undefined) return null;
  const fin = m.naissance + ageDeMort(m.id, v);
  return fin < an ? fin : null;
}

export interface Bilan { famille: Famille; corrections: number }

/**
 * Rend les dates d'un arbre cohérentes avec l'année en cours `an`. Les membres liés à une fiche de personnage
 * ne sont jamais déclarés morts d'office (leur âge vient de la fiche).
 */
export function harmoniserDates(f0: Famille, an: number, v: Vie = VIE_HUMAINE): Bilan {
  const membres = f0.membres.map((m) => ({ ...m }));
  const parId = new Map(membres.map((m) => [m.id, m]));
  const enfants = (id: string) => membres.filter((m) => m.parents.includes(id));
  const G = ecartGeneration(v), minP = ageMinParent(v);
  let corrections = 0;
  const poser = (m: MembreFamille, cle: 'naissance' | 'mort', val: number | null) => {
    if (m[cle] === val) return;
    m[cle] = val; corrections++;
  };
  const connu = (n: number | null | undefined): n is number => n !== null && n !== undefined;

  // 1. Naissances manquantes : déduites des parents, des enfants, puis du conjoint (quelques passes).
  for (let passe = 0; passe < 6; passe++) {
    let change = false;
    for (const m of membres) {
      if (connu(m.naissance)) continue;
      const ps = m.parents.map((p) => parId.get(p)?.naissance).filter(connu);
      const es = enfants(m.id).map((e) => e.naissance).filter(connu);
      const cs = m.conjoints.map((c) => parId.get(c)?.naissance).filter(connu);
      const n = ps.length ? Math.max(...ps) + G : es.length ? Math.min(...es) - G : cs.length ? cs[0] : m.regne ? m.regne[0] - G : null;
      if (n !== null) { poser(m, 'naissance', Math.min(n, an)); change = true; }
    }
    if (!change) break;
  }

  // 2. Règnes : le souverain est né avant son règne.
  for (const m of membres) if (m.regne && connu(m.naissance) && m.naissance > m.regne[0] - 1) poser(m, 'naissance', m.regne[0] - Math.max(1, Math.round(v.adulte * 0.5)));

  // 3. Parents assez âgés à la naissance de leurs enfants (on vieillit le parent, sauf s'il a une fiche ou un règne).
  for (let passe = 0; passe < 6; passe++) {
    let change = false;
    for (const e of membres) {
      if (!connu(e.naissance)) continue;
      for (const p of e.parents.map((id) => parId.get(id)).filter((x): x is MembreFamille => !!x)) {
        if (!connu(p.naissance) || e.naissance - p.naissance >= minP) continue;
        if (p.persoId || p.regne) poser(e, 'naissance', Math.min(an, p.naissance + minP));
        else poser(p, 'naissance', e.naissance - minP);
        change = true;
      }
    }
    if (!change) break;
  }

  // 4. Personne n'est né après l'année en cours.
  for (const m of membres) if (connu(m.naissance) && m.naissance > an) poser(m, 'naissance', an);

  // 5. Morts : jamais avant la naissance ni dans le futur, posées quand l'âge l'exige,
  //    jamais avant la fin du règne ni avant la naissance des enfants.
  for (const m of membres) {
    if (connu(m.mort) && connu(m.naissance) && m.mort < m.naissance) poser(m, 'mort', null);
    if (connu(m.mort) && m.mort > an) poser(m, 'mort', null);
    if (!connu(m.mort) && !m.persoId && !(m.regne && m.regne[1] >= an)) poser(m, 'mort', mortAttendue(m, an, v));
    if (connu(m.mort) && m.regne && m.mort < m.regne[1]) poser(m, 'mort', Math.min(an, m.regne[1]));
    const derniers = enfants(m.id).map((e) => e.naissance).filter(connu);
    if (connu(m.mort) && derniers.length && m.mort < Math.max(...derniers) - 1) poser(m, 'mort', Math.max(...derniers));
  }
  return { famille: corrections ? { ...f0, membres } : f0, corrections };
}

/** Incohérences de dates d'un membre, en clair (vide : tout va bien). */
export function incoherences(f: Famille, m: MembreFamille, an: number): string[] {
  const n = m.naissance, d = m.mort, v = vieDepuis(f.vie);
  const res: string[] = [];
  if (connu(n) && n > an) res.push(`naissance après l’année en cours (${an})`);
  if (connu(d) && d > an) res.push(`mort après l’année en cours (${an})`);
  if (connu(n) && connu(d) && d < n) res.push('mort avant sa naissance');
  if (connu(n) && !connu(d) && an - n > v.max) res.push(`aurait ${an - n} ans : sans doute mort`);
  if (m.regne && connu(n) && m.regne[0] < n) res.push('règne avant sa naissance');
  if (m.regne && connu(d) && m.regne[1] > d) res.push('règne après sa mort');
  for (const p of m.parents.map((id) => f.membres.find((x) => x.id === id))) {
    if (p && connu(p.naissance) && connu(n) && n - p.naissance < ageMinParent(v)) res.push(`trop jeune pour être l’enfant de ${p.nom}`);
    if (p && connu(p.mort) && connu(n) && n > p.mort + 1) res.push(`né après la mort de ${p.nom}`);
  }
  return res;
}

const connu = (n: number | null | undefined): n is number => n !== null && n !== undefined;

/** Âge d'un membre en l'an `an` (ou à sa mort). */
export function ageDe(m: MembreFamille, an: number): number | null {
  if (m.naissance === null || m.naissance === undefined) return null;
  return (m.mort ?? an) - m.naissance;
}
