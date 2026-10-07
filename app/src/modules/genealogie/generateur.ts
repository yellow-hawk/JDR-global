// Générateur de familles et de dynasties (pur, déterministe : même graine → même arbre).
import type { Civilisation, Famille, MembreFamille, Personnage } from '../../noyau/contrat';
import { nouvelId } from '../../noyau/contrat';
import { hashStr, mulberry32, type Rng } from '../../noyau/hasard';
import donnees from './noms.json';

const NOMS_SECOURS: string[] = donnees.noms;

export interface Contexte { noms: string[]; an: number; rng: Rng; pris: Set<string> }

export function contexte(civ: Civilisation | null | undefined, graine: string): Contexte {
  const noms = civ?.noms?.length ? civ.noms : NOMS_SECOURS;
  return { noms, an: civ?.anActuel ?? 1000, rng: mulberry32(hashStr(`famille|${graine}`)), pris: new Set() };
}

/** Un prénom pas encore utilisé dans l'arbre (la réserve est réutilisée avec un numéro si elle s'épuise). */
export function prenom(x: Contexte): string {
  for (let t = 0; t < 40; t++) {
    const n = x.noms[Math.floor(x.rng() * x.noms.length)];
    if (!x.pris.has(n)) { x.pris.add(n); return n; }
  }
  const n = `${x.noms[Math.floor(x.rng() * x.noms.length)]} ${['II', 'III', 'IV', 'le Jeune', 'l’Ancien'][Math.floor(x.rng() * 5)]}`;
  x.pris.add(n); return n;
}

const membre = (m: Partial<MembreFamille> & { nom: string }): MembreFamille =>
  ({ id: nouvelId('mbr'), sexe: '?', parents: [], conjoints: [], naissance: null, mort: null, ...m });

/** Âge supposé d'un personnage d'après sa description. */
export function ageSuppose(texte: string): number {
  if (/âgé|vieux|vieille|voûté|ancien/i.test(texte)) return 64;
  if (/jeune|enfant/i.test(texte)) return 19;
  return 38;
}

const sexeDe = (p: Personnage): MembreFamille['sexe'] => {
  const g = (p.apparence as { data?: { gender?: string } } | null)?.data?.gender;
  return g === 'female' ? 'f' : g === 'male' ? 'm' : '?';
};

/** Marie deux membres (dans les deux sens). */
export function marier(a: MembreFamille, b: MembreFamille): void {
  if (!a.conjoints.includes(b.id)) a.conjoints.push(b.id);
  if (!b.conjoints.includes(a.id)) b.conjoints.push(a.id);
}

/** Parents, grands-parents, frères et sœurs, conjoint, enfants d'un personnage. */
export function familleDepuisPersonnage(p: Personnage, civ: Civilisation | null | undefined, graine = p.id): Famille {
  const x = contexte(civ, graine), r = x.rng;
  const morceaux = p.nom.trim().split(/\s+/);
  const nomFamille = morceaux.length > 1 ? morceaux[morceaux.length - 1] : null;
  const complet = (pr: string) => (nomFamille ? `${pr} ${nomFamille}` : pr);
  x.pris.add(morceaux[0]);
  const age = ageSuppose(`${p.notes ?? ''} ${p.role ?? ''}`);
  const ego = membre({ nom: p.nom, sexe: sexeDe(p), naissance: x.an - age, persoId: p.id, role: p.role });
  const membres = [ego];
  const parentsDe = (enfant: MembreFamille, profondeur: number) => {
    const ecart = 22 + Math.floor(r() * 12);
    const pere = membre({ nom: complet(prenom(x)), sexe: 'm', naissance: (enfant.naissance ?? x.an) - ecart - Math.floor(r() * 5) });
    const mere = membre({ nom: prenom(x), sexe: 'f', naissance: (enfant.naissance ?? x.an) - ecart });
    for (const m of [pere, mere]) if (x.an - (m.naissance ?? 0) > 58 + r() * 25) m.mort = Math.min(x.an, (m.naissance ?? 0) + 50 + Math.floor(r() * 30));
    marier(pere, mere);
    enfant.parents = [pere.id, mere.id];
    membres.push(pere, mere);
    if (profondeur > 1) parentsDe(pere, profondeur - 1);
    return [pere, mere];
  };
  const [pere] = parentsDe(ego, 2);
  // Frères et sœurs
  for (let i = 0, n = Math.floor(r() * 4); i < n; i++) {
    const s = r() < 0.5 ? 'f' : 'm';
    membres.push(membre({ nom: complet(prenom(x)), sexe: s, naissance: (ego.naissance ?? x.an) + Math.round((r() - 0.5) * 16), parents: [...ego.parents] }));
  }
  void pere;
  // Conjoint et enfants
  if (age > 21 && r() < 0.75) {
    const conj = membre({ nom: prenom(x), sexe: ego.sexe === 'f' ? 'm' : ego.sexe === 'm' ? 'f' : '?', naissance: (ego.naissance ?? x.an) + Math.round((r() - 0.5) * 10) });
    marier(ego, conj);
    membres.push(conj);
    const max = Math.min(4, Math.floor((age - 20) / 6));
    for (let i = 0, n = Math.floor(r() * (max + 1)); i < n; i++) {
      membres.push(membre({ nom: complet(prenom(x)), sexe: r() < 0.5 ? 'f' : 'm', naissance: (ego.naissance ?? x.an) + 21 + i * 3 + Math.floor(r() * 3), parents: [ego.id, conj.id] }));
    }
  }
  return { id: nouvelId('famille'), nom: nomFamille ? `Famille ${nomFamille}` : `Famille de ${p.nom}`, sorte: 'famille', membres, racine: ego.id, peuple: civ?.cle ?? null };
}

/** Sépare « le roi Kael II » en titre et nom, d'après les titres du régime. */
export function separerTitre(souverain: string, titres: string[] = []): { titre: string; nom: string; sexe: MembreFamille['sexe'] } {
  for (const [i, t] of titres.entries()) if (souverain.startsWith(`${t} `)) return { titre: t, nom: souverain.slice(t.length + 1), sexe: i === 1 ? 'f' : 'm' };
  return { titre: '', nom: souverain, sexe: '?' };
}

/** Dynastie d'un peuple : du fondateur (an 1) au souverain actuel, avec conjoints et cadets. */
export function dynastieDepuisCivilisation(civ: Civilisation, graine = `${civ.nom}`): Famille {
  const x = contexte(civ, `dynastie|${graine}`), r = x.rng;
  const an = civ.anActuel ?? 500;
  const n = Math.max(4, Math.min(24, Math.round(an / 32)));
  const titres = civ.titres ?? [];
  const actuel = separerTitre(civ.souverain ?? '', titres);
  x.pris.add(actuel.nom.split(' ')[0]);
  const membres: MembreFamille[] = [];
  const titreDe = (s: MembreFamille['sexe']) => titres[s === 'f' ? 1 : 0] ?? '';
  let precedent: MembreFamille | null = null;
  let debut = 1;
  for (let i = 0; i < n; i++) {
    const dernier = i === n - 1;
    const fin = dernier ? an : Math.min(an - 1, Math.round(1 + ((i + 1) * (an - 1)) / n + (r() - 0.5) * (an / n) * 0.5));
    const sexe: MembreFamille['sexe'] = dernier ? (actuel.sexe === '?' ? 'm' : actuel.sexe) : i === 0 ? 'm' : r() < 0.35 ? 'f' : 'm';
    const nom = i === 0 ? civ.fondateur ?? prenom(x) : dernier ? actuel.nom || prenom(x) : prenom(x);
    const age = 20 + Math.floor(r() * 25);
    const souv = membre({ nom, sexe, naissance: debut - age, mort: dernier ? null : fin, titre: i === 0 ? 'fondateur' : titreDe(sexe), regne: [debut, fin], role: dernier ? 'souverain actuel' : 'souverain' });
    // Succession : enfant du précédent le plus souvent, parfois frère ou sœur, rarement usurpateur.
    if (precedent) {
      const t = r();
      if (t < 0.8) souv.parents = [precedent.id, ...precedent.conjoints.slice(0, 1)];
      else if (t < 0.95 && precedent.parents.length) { souv.parents = [...precedent.parents]; souv.naissance = (precedent.naissance ?? 0) + 2 + Math.floor(r() * 8); }
      else souv.notes = 'Usurpateur : prend le pouvoir sans lien de sang.';
    }
    membres.push(souv);
    const conj = membre({ nom: prenom(x), sexe: sexe === 'f' ? 'm' : 'f', naissance: (souv.naissance ?? 0) + Math.round((r() - 0.5) * 8) });
    marier(souv, conj);
    membres.push(conj);
    // Cadets (hors ligne de succession)
    for (let k = 0, nb = Math.floor(r() * 3); k < nb; k++) {
      membres.push(membre({ nom: prenom(x), sexe: r() < 0.5 ? 'f' : 'm', naissance: (souv.naissance ?? 0) + 22 + k * 3, parents: [souv.id, conj.id] }));
    }
    precedent = souv;
    debut = fin;
  }
  const nomMaison = civ.fondateur ? `Dynastie de ${civ.fondateur}` : `Dynastie ${civ.nom.replace(/^les /, 'des ')}`;
  return { id: nouvelId('famille'), nom: `${nomMaison} (${civ.nom.replace(/^les /, '')})`, sorte: 'dynastie', membres, racine: membres[0].id, peuple: civ.cle };
}
