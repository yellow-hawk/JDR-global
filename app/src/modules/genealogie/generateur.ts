// Générateur de familles et de dynasties (pur, déterministe : même graine → même arbre).
// Les dates suivent l'année en cours (horloge du temps de jeu) et la longévité du peuple.
import type { Civilisation, Famille, MembreFamille, Personnage } from '../../noyau/contrat';
import { nouvelId } from '../../noyau/contrat';
import { hashStr, mulberry32, type Rng } from '../../noyau/hasard';
import { ageMinParent, harmoniserDates, vieDepuis, VIE_HUMAINE, type Vie } from './dates';
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

/** Âge supposé d'un personnage d'après sa description (vieux, jeune, sinon adulte d'âge mûr). */
export function ageSuppose(texte: string, v: Vie = VIE_HUMAINE): number {
  if (/âgé|vieux|vieille|voûté|ancien/i.test(texte)) return Math.round(v.adulte + (v.max - v.adulte) * 0.75);
  if (/jeune|enfant/i.test(texte)) return v.adulte + 1;
  return Math.round(v.adulte + (v.max - v.adulte) * 0.32);
}

/** Âge écrit sur la fiche (« 34 », « 34 ans »), ou null. */
export function ageDeLaFiche(p: Personnage): number | null {
  const m = /\d+/.exec(p.fiche?.identite?.age ?? '');
  return m ? Number(m[0]) : null;
}

const sexeDe = (p: Personnage): MembreFamille['sexe'] => {
  const g = p.fiche?.identite?.genre ?? (p.apparence as { data?: { gender?: string } } | null)?.data?.gender;
  return g === 'female' || g === 'femme' ? 'f' : g === 'male' || g === 'homme' ? 'm' : '?';
};

/** Marie deux membres (dans les deux sens). */
export function marier(a: MembreFamille, b: MembreFamille): void {
  if (!a.conjoints.includes(b.id)) a.conjoints.push(b.id);
  if (!b.conjoints.includes(a.id)) b.conjoints.push(a.id);
}

/** Options de génération : graine, année en cours (horloge du temps de jeu) et longévité du peuple [adulte, max]. */
export interface OptionsArbre { graine?: string; an?: number; vie?: readonly number[] | null }

const avecVie = (o: OptionsArbre) => (o.vie && o.vie.length >= 2 ? { vie: [o.vie[0], o.vie[1]] as [number, number] } : {});

/** Parents, grands-parents, frères et sœurs, conjoint, enfants d'un personnage. Âge : celui de la fiche, sinon déduit de sa description. */
export function familleDepuisPersonnage(p: Personnage, civ: Civilisation | null | undefined, o: OptionsArbre = {}): Famille {
  const x = contexte(civ, o.graine ?? p.id), r = x.rng;
  const an = o.an ?? x.an, v = vieDepuis(o.vie);
  const morceaux = p.nom.trim().split(/\s+/);
  const nomFamille = morceaux.length > 1 ? morceaux[morceaux.length - 1] : null;
  const complet = (pr: string) => (nomFamille ? `${pr} ${nomFamille}` : pr);
  x.pris.add(morceaux[0]);
  const age = ageDeLaFiche(p) ?? ageSuppose(`${p.notes ?? ''} ${p.role ?? ''}`, v);
  const ego = membre({ nom: p.nom, sexe: sexeDe(p), naissance: an - age, persoId: p.id, role: p.role });
  const membres = [ego];
  const ecart = () => Math.round(v.adulte * (1.25 + r() * 0.65));
  const parentsDe = (enfant: MembreFamille, profondeur: number) => {
    const e = ecart();
    const pere = membre({ nom: complet(prenom(x)), sexe: 'm', naissance: (enfant.naissance ?? an) - e - Math.floor(r() * v.adulte * 0.25) });
    const mere = membre({ nom: prenom(x), sexe: 'f', naissance: (enfant.naissance ?? an) - e });
    marier(pere, mere);
    enfant.parents = [pere.id, mere.id];
    membres.push(pere, mere);
    if (profondeur > 1) parentsDe(pere, profondeur - 1);
  };
  parentsDe(ego, 2);
  const mere = membres.find((m) => m.id === ego.parents[1])!;
  // Frères et sœurs : nés quand la mère était en âge d'avoir des enfants, jamais après l'année en cours.
  for (let i = 0, n = Math.floor(r() * 4); i < n; i++) {
    const naissance = Math.min(an, (ego.naissance ?? an) + Math.round((r() - 0.5) * v.adulte * 0.9));
    if (naissance - (mere.naissance ?? 0) < ageMinParent(v)) continue;
    membres.push(membre({ nom: complet(prenom(x)), sexe: r() < 0.5 ? 'f' : 'm', naissance, parents: [...ego.parents] }));
  }
  // Conjoint et enfants (seulement ceux déjà nés).
  if (age > v.adulte + 3 && r() < 0.75) {
    const conj = membre({ nom: prenom(x), sexe: ego.sexe === 'f' ? 'm' : ego.sexe === 'm' ? 'f' : '?', naissance: (ego.naissance ?? an) + Math.round((r() - 0.5) * v.adulte * 0.55) });
    marier(ego, conj);
    membres.push(conj);
    const max = Math.min(4, Math.floor((age - v.adulte - 2) / Math.max(1, v.adulte * 0.33)));
    for (let i = 0, n = Math.floor(r() * (max + 1)); i < n; i++) {
      const naissance = (ego.naissance ?? an) + v.adulte + 3 + Math.round(i * v.adulte * 0.17) + Math.floor(r() * 3);
      if (naissance > an) break;
      membres.push(membre({ nom: complet(prenom(x)), sexe: r() < 0.5 ? 'f' : 'm', naissance, parents: [ego.id, conj.id] }));
    }
  }
  const f: Famille = { id: nouvelId('famille'), nom: nomFamille ? `Famille ${nomFamille}` : `Famille de ${p.nom}`, sorte: 'famille', membres, racine: ego.id, peuple: civ?.cle ?? null, ...avecVie(o) };
  return harmoniserDates(f, an, v).famille;
}

/** Sépare « le roi Kael II » en titre et nom, d'après les titres du régime. */
export function separerTitre(souverain: string, titres: string[] = []): { titre: string; nom: string; sexe: MembreFamille['sexe'] } {
  for (const [i, t] of titres.entries()) if (souverain.startsWith(`${t} `)) return { titre: t, nom: souverain.slice(t.length + 1), sexe: i === 1 ? 'f' : 'm' };
  return { titre: '', nom: souverain, sexe: '?' };
}

/**
 * Dynastie d'un peuple : du fondateur au souverain actuel, règnes continus d'environ une génération
 * (une longue histoire fait commencer la dynastie plus tard). Successions : enfant du précédent le plus souvent,
 * parfois frère ou sœur, rarement usurpateur. Chaque souverain meurt à la fin de son règne ; les autres dates
 * (conjoints, cadets) sont rendues cohérentes avec l'année en cours.
 */
export function dynastieDepuisCivilisation(civ: Civilisation, o: OptionsArbre = {}): Famille {
  const x = contexte(civ, `dynastie|${o.graine ?? civ.nom}`), r = x.rng;
  const an = o.an ?? civ.anActuel ?? 500, v = vieDepuis(o.vie);
  const duree = 26 * (v.max / 80);
  const n = Math.max(4, Math.min(24, Math.round(an / duree)));
  const depart = Math.max(1, Math.round(an - n * duree * (0.9 + r() * 0.2)));
  const pas = (an - depart) / n;
  const titres = civ.titres ?? [];
  const actuel = separerTitre(civ.souverain ?? '', titres);
  x.pris.add(actuel.nom.split(' ')[0]);
  const membres: MembreFamille[] = [];
  const titreDe = (s: MembreFamille['sexe']) => titres[s === 'f' ? 1 : 0] ?? '';
  const ageAvenement = () => Math.round(v.adulte + 2 + r() * v.adulte * 1.4);
  let precedent: MembreFamille | null = null;
  let debut = depart;
  for (let i = 0; i < n; i++) {
    const dernier = i === n - 1;
    const fin = dernier ? an : Math.max(debut + 2, Math.min(an - 1, Math.round(depart + (i + 1) * pas + (r() - 0.5) * pas * 0.5)));
    const sexe: MembreFamille['sexe'] = dernier ? (actuel.sexe === '?' ? 'm' : actuel.sexe) : i === 0 ? 'm' : r() < 0.35 ? 'f' : 'm';
    const nom = i === 0 ? civ.fondateur ?? prenom(x) : dernier ? actuel.nom || prenom(x) : prenom(x);
    // Le souverain ne dépasse pas la longévité de son peuple à la fin de son règne.
    const plafond = Math.round(v.max * 0.92) - (fin - debut);
    let naissance = debut - Math.max(1, Math.min(ageAvenement(), plafond));
    let parents: string[] = [];
    let notes: string | undefined;
    if (precedent) {
      const pn = precedent.naissance ?? 0, t = r();
      // Enfant du précédent : né quand celui-ci était adulte, avant sa mort (fin de son règne),
      // et pas trop tôt pour vivre jusqu'à la fin de son propre règne.
      const auPlusVieux = fin - Math.round(v.max * 0.92);
      const tot = Math.max(pn + ageMinParent(v), auPlusVieux), tard = Math.min(pn + Math.round(v.adulte * 2.5), debut - 1);
      if (t < 0.8 && tot <= tard) {
        naissance = Math.max(tot, Math.min(tard, naissance));
        parents = [precedent.id, ...precedent.conjoints.slice(0, 1)];
      } else if (t < 0.95 && precedent.parents.length && pn + 2 >= auPlusVieux) {
        naissance = Math.min(debut - 1, pn + 2 + Math.floor(r() * 8));
        parents = [...precedent.parents];
      } else notes = 'Usurpateur : prend le pouvoir sans lien de sang.';
    }
    const souv = membre({ nom, sexe, naissance, mort: dernier ? null : fin, titre: i === 0 ? 'fondateur' : titreDe(sexe), regne: [debut, fin], role: dernier ? 'souverain actuel' : 'souverain', parents, notes });
    membres.push(souv);
    const conj = membre({ nom: prenom(x), sexe: sexe === 'f' ? 'm' : 'f', naissance: Math.min(an, naissance + Math.round((r() - 0.5) * v.adulte * 0.45)) });
    marier(souv, conj);
    membres.push(conj);
    // Cadets (hors ligne de succession), seulement ceux déjà nés.
    for (let k = 0, nb = Math.floor(r() * 3); k < nb; k++) {
      const nk = naissance + v.adulte + 4 + k * 3 + Math.floor(r() * 3);
      if (nk > an) break;
      membres.push(membre({ nom: prenom(x), sexe: r() < 0.5 ? 'f' : 'm', naissance: nk, parents: [souv.id, conj.id] }));
    }
    precedent = souv;
    debut = fin;
  }
  const nomMaison = civ.fondateur ? `Dynastie de ${civ.fondateur}` : `Dynastie ${civ.nom.replace(/^les /, 'des ')}`;
  const f: Famille = { id: nouvelId('famille'), nom: `${nomMaison} (${civ.nom.replace(/^les /, '')})`, sorte: 'dynastie', membres, racine: membres[0].id, peuple: civ.cle, ...avecVie(o) };
  return harmoniserDates(f, an, v).famille;
}
