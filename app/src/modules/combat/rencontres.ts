// Générateur de rencontres (pur, testé, reproductible) : selon le milieu, la difficulté et le niveau des PJ,
// un chef (vrai PNJ à créer) et des adversaires de la bibliothèque. Les humanoïdes reçoivent un nom et une
// description tirés du générateur de PNJ ; les créatures gardent leur nom et leur icône.
import type { Campagne } from '../../noyau/contrat';
import { pick, rngFor } from '../../noyau/hasard';
import type { SystemeRegles } from '../../noyau/regles';
import { aUneFiche } from '../../noyau/regles';
import { contexteDe, genererPnj } from '../generateurs';
import { BIBLIOTHEQUE_DE_BASE, type Modele } from './moteur';
import donnees from './rencontres.json';

export type Difficulte = 'facile' | 'moyenne' | 'difficile' | 'mortelle';
export const DIFFICULTES = donnees.difficultes as [Difficulte, string][];
export const MILIEUX = donnees.milieux;
const XP = donnees.xp as Record<string, number>;
const HUMANOIDES = new Set(donnees.humanoides);

export interface DemandeRencontre {
  milieu: string;
  difficulte: Difficulte;
  /** Niveaux des PJ (vide : 4 PJ de niveau 1). */
  niveaux: number[];
  /** Un chef : un vrai PNJ, avec fiche, avatar et portrait. */
  chef: boolean;
  /** Les humanoïdes reçoivent un nom et une description. */
  nommes: boolean;
}

export interface Adversaire { modele: Partial<Modele> & { nom: string }; xp: number }
export interface Composition {
  chef: { role: string; niveau: number; xp: number } | null;
  adversaires: Adversaire[];
  /** XP gagnée (somme) et XP « ajustée » au nombre d'adversaires, comparée au budget du groupe. */
  xp: number; xpAjustee: number; budget: number;
  resume: string;
}

const xpDe = (nom: string) => XP[nom] ?? 50;

/** Compose une rencontre. `bibliotheque` : celle de la table (les créatures ajoutées par le MJ ou un pack comptent aussi). */
export function composerRencontre(c: Campagne, R: SystemeRegles, d: DemandeRencontre, bibliotheque: Modele[], graine: string): Composition {
  const r = rngFor(graine, 'rencontre');
  const milieu = MILIEUX.find((m) => m.id === d.milieu) ?? MILIEUX[0];
  const niveaux = d.niveaux.length ? d.niveaux : [1, 1, 1, 1];
  const moyen = Math.round(niveaux.reduce((s, n) => s + n, 0) / niveaux.length);
  const iDiff = Math.max(0, DIFFICULTES.findIndex(([id]) => id === d.difficulte));
  const regles = aUneFiche(R) ? R.progression : null;
  const diff = regles?.difficulte;
  const budget = diff ? niveaux.reduce((s, n) => s + diff.seuils(n)[iDiff], 0) : niveaux.length * [1, 1.5, 2, 3][iDiff] * 50;
  const multiplicateur = diff?.multiplicateur ?? ((n: number) => (n <= 1 ? 1 : n === 2 ? 1.5 : n <= 6 ? 2 : 2.5));

  const chef = d.chef ? (() => {
    // Puissance du chef : la plus forte qui laisse au moins la moitié du budget à ses troupes ;
    // le niveau de sa fiche suit cette puissance, sans dépasser le groupe de plus d'un niveau.
    const xpDuFp = (fp: number) => (regles ? regles.xpAdversaire(fp) : 100);
    let fp = 0;
    while (fp < 20 && xpDuFp(fp + 1) <= budget * 0.45) fp++;
    const niveau = Math.max(1, Math.min(moyen + (iDiff >= 2 ? 1 : 0), Math.round(fp * 1.5) + 1));
    return { role: pick(r, milieu.chefs), niveau, xp: xpDuFp(fp) };
  })() : null;

  // Créatures du milieu présentes dans la bibliothèque de la table (sinon dans celle de base).
  const modeleDe = (nom: string) => bibliotheque.find((m) => m.nom === nom) ?? BIBLIOTHEQUE_DE_BASE.find((m) => m.nom === nom);
  const possibles = milieu.creatures.filter((n) => modeleDe(n));
  const choisis: string[] = [];
  const ajuste = (liste: string[]) => (liste.reduce((s, n) => s + xpDe(n), 0) + (chef?.xp ?? 0)) * multiplicateur(liste.length + (chef ? 1 : 0));
  // Tant que le budget le permet : une créature qui tient dans le budget, les plus fortes étant plus probables.
  while (choisis.length < 12) {
    const tiennent = possibles.filter((p) => ajuste([...choisis, p]) <= budget);
    if (!tiennent.length) break;
    let t = r() * tiennent.reduce((s, p) => s + xpDe(p), 0);
    choisis.push(tiennent.find((p) => (t -= xpDe(p)) < 0) ?? tiennent[tiennent.length - 1]);
  }
  // Au moins un adversaire : le moins coûteux, même si le budget est dépassé.
  if (!choisis.length && !chef && possibles.length) choisis.push([...possibles].sort((a, b) => xpDe(a) - xpDe(b))[0]);

  choisis.sort();
  const modeles = nommer(c, choisis.map((n) => modeleDe(n)!), graine, d.nommes);
  const adversaires: Adversaire[] = modeles.map((m, i) => ({ modele: m, xp: xpDe(choisis[i]) }));
  const compte = new Map<string, number>();
  for (const n of choisis) compte.set(n, (compte.get(n) ?? 0) + 1);
  const xp = adversaires.reduce((s, a) => s + a.xp, 0) + (chef?.xp ?? 0);
  const xpAjustee = Math.round(ajuste(choisis));
  const parNom = [...compte.entries()].map(([nom, n]) => `${n} ${nom.toLowerCase()}${n > 1 && !nom.endsWith('s') ? 's' : ''}`);
  const resume = [chef ? `${chef.role} (niveau ${chef.niveau})` : '', ...parNom].filter(Boolean).join(', ');
  return { chef, adversaires, xp, xpAjustee, budget, resume };
}

/**
 * Adversaires prêts à poser : les humanoïdes (bandit, garde, cultiste…) deviennent des personnes nommées et décrites
 * (« Garn, bandit »), les autres créatures sont numérotées quand elles sont plusieurs.
 */
export function nommer(c: Campagne, modeles: Modele[], graine: string, nommes = true): (Partial<Modele> & { nom: string })[] {
  const ctx = contexteDe(c);
  const pris = new Set<string>(), compte = new Map<string, number>();
  return modeles.map((m, i) => {
    const base = { ...m, carac: { ...m.carac }, camp: 'ennemi' as const };
    if (nommes && HUMANOIDES.has(m.nom)) {
      for (let essai = 0; essai < 6; essai++) {
        const g = genererPnj(`${graine}|${i}|${essai}`, ctx, m.nom.toLowerCase());
        const prenom = g.nom.split(' ')[0];
        if (pris.has(prenom) && essai < 5) continue;
        pris.add(prenom);
        return { ...base, nom: `${prenom}, ${m.nom.toLowerCase()}`, notes: `${g.apparence} ; ${g.maniere}. ${m.notes ?? ''}`.trim() };
      }
    }
    const k = (compte.get(m.nom) ?? 0) + 1;
    compte.set(m.nom, k);
    return { ...base, nom: modeles.filter((x) => x.nom === m.nom).length > 1 ? `${m.nom} ${k}` : m.nom };
  });
}

/** Difficulté atteinte par une XP ajustée, pour l'annoncer au MJ. */
export function difficulteAtteinte(R: SystemeRegles, niveaux: number[], xpAjustee: number): string {
  const diff = aUneFiche(R) ? R.progression.difficulte : undefined;
  if (!diff) return '';
  const seuils = [0, 1, 2, 3].map((i) => (niveaux.length ? niveaux : [1, 1, 1, 1]).reduce((s, n) => s + diff.seuils(n)[i], 0));
  const i = seuils.filter((s) => xpAjustee >= s).length;
  return ['très facile', 'facile', 'moyenne', 'difficile', 'mortelle'][i];
}
