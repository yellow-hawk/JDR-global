// Création de personnage D&D 5e (pur) : méthodes de caractéristiques, choix aléatoires reproductibles
// (même graine → même personnage), construction des stats et de la fiche à partir des choix.
import type { FichePersonnage, ObjetInventaire } from '../../contrat';
import { entier, pick, rngFor, shuffle, type Rng } from '../../hasard';
import type { ChoixCreation, OptionsAleatoire } from '../types';
import { CATALOGUE, calculer, entreeCatalogue } from './fiche';
import { CLASSES, PEUPLES, XP_NIVEAUX, classeDe, peupleDe } from './progression';
import DONNEES from './creation.json';

const D = DONNEES as unknown as {
  standard: number[]; achat: { points: number; couts: Record<string, number> };
  noms: Record<string, { m: string[]; f: string[] }>;
  personnalite: { traits: string[]; ideaux: string[]; liens: string[]; defauts: string[] };
  classesParRole: { motifs: string; classes: string[] }[];
};
const CARACS = ['for', 'dex', 'con', 'int', 'sag', 'cha'];

export const TABLEAU_STANDARD = D.standard;
export const ACHAT_POINTS = D.achat.points;
/** Coût d'une valeur (8 à 15) en achat de points ; undefined hors limites. */
export const coutAchat = (v: number): number | undefined => D.achat.couts[String(v)];
export const pointsDepenses = (caracs: Record<string, number>): number => CARACS.reduce((s, c) => s + (coutAchat(caracs[c] ?? 8) ?? 99), 0);

/** 4d6, on garde les trois meilleurs, six fois. */
export const tirage4d6 = (rng: Rng): number[] =>
  CARACS.map(() => [0, 0, 0, 0].map(() => entier(rng, 1, 6)).sort((a, b) => b - a).slice(0, 3).reduce((s, x) => s + x, 0));

/** Range les valeurs : les plus hautes dans les caractéristiques principales de la classe, puis CON, puis au hasard. */
export function repartir(valeurs: number[], classe: string | undefined, rng: Rng): Record<string, number> {
  const tri = [...valeurs].sort((a, b) => b - a);
  const principales = classeDe(classe)?.principales ?? [];
  const ordre = [...principales, ...(principales.includes('con') ? [] : ['con']), ...shuffle(rng, CARACS.filter((c) => !principales.includes(c) && c !== 'con'))];
  return Object.fromEntries(ordre.map((c, i) => [c, tri[i] ?? 10]));
}

/** Classe probable d'un PNJ d'après son rôle (aucune correspondance : null). */
export function classePourRole(role: string, rng: Rng): string | null {
  const r = D.classesParRole.find((x) => new RegExp(x.motifs, 'i').test(role));
  return r ? pick(rng, r.classes) : null;
}

/** Choix complets tirés au hasard (les options fixées sont respectées). */
export function choixAleatoires(graine: string, o: OptionsAleatoire = {}): ChoixCreation {
  const r = (cle: string) => rngFor(graine, cle);
  const espece = o.espece ?? pick(r('espece'), PEUPLES.map((p) => p.id));
  const classe = o.classe ?? (o.role ? classePourRole(o.role, r('role')) : null) ?? pick(r('classe'), CLASSES.map((c) => c.id));
  const cl = classeDe(classe)!;
  const feminin = o.feminin ?? r('genre')() < 0.5;
  const noms = D.noms[espece] ?? D.noms.humain;
  const pe = peupleDe(espece);
  const libres = pe?.bonusLibres ? shuffle(r('libres'), CARACS.filter((c) => !(c in pe.bonus))).slice(0, pe.bonusLibres) : [];
  const historique = pick(r('historique'), CATALOGUE.historiques).id;
  const dejaMaitrisees = new Set([...(CATALOGUE.historiques.find((h) => h.id === historique)?.competences ?? []), ...(pe?.competences ?? [])]);
  const competences = shuffle(r('competences'), cl.competences.parmi.filter((c) => !dejaMaitrisees.has(c))).slice(0, cl.competences.choix);
  const P = D.personnalite;
  return {
    nom: o.nom ?? pick(r('nom'), feminin ? noms.f : noms.m),
    feminin, espece, classe, niveau: o.niveau ?? 1,
    sousClasse: cl.sousClasses[0]?.id,
    historique,
    caracs: repartir(o.methode === 'standard' ? TABLEAU_STANDARD : tirage4d6(r('caracs')), classe, r('repartition')),
    bonusLibres: libres,
    competences,
    alignement: pick(r('alignement'), CATALOGUE.alignements),
    personnalite: { traits: pick(r('traits'), P.traits), ideaux: pick(r('ideaux'), P.ideaux), liens: pick(r('liens'), P.liens), defauts: pick(r('defauts'), P.defauts) },
    equipement: true,
  };
}

/** Stats (`combat.stats`) et fiche détaillée à partir des choix. */
export function creer(c: ChoixCreation): { nom: string; stats: Record<string, unknown>; fiche: FichePersonnage } {
  const cl = classeDe(c.classe);
  const pe = peupleDe(c.espece);
  const niveau = Math.max(1, Math.min(20, c.niveau || 1));
  const carac: Record<string, number> = {};
  for (const k of CARACS) carac[k] = Math.min(20, (c.caracs[k] ?? 10) + (pe?.bonus[k] ?? 0) + ((c.bonusLibres ?? []).includes(k) ? 1 : 0));
  const historique = CATALOGUE.historiques.find((h) => h.id === c.historique);
  const competences: Record<string, number> = {};
  for (const k of [...(historique?.competences ?? []), ...(pe?.competences ?? []), ...(c.competences ?? [])]) competences[k] = 1;

  const objets: ObjetInventaire[] = [];
  if (c.equipement && cl) {
    let armes = 0;
    let armure = false;
    cl.equipement.forEach((ref, i) => {
      const e = entreeCatalogue(ref);
      if (!e) return;
      const existant = objets.find((o) => o.ref === ref);
      if (existant) { existant.quantite++; return; }
      const estArmure = e.sorte === 'armure' && e.categorie !== 'bouclier';
      const equipe = (e.sorte === 'arme' && armes++ < 1) || (estArmure && !armure) || e.categorie === 'bouclier';
      if (estArmure) armure = true;
      objets.push({ id: `obj-depart-${i}`, nom: e.nom, ref, quantite: 1, poids: e.poids, equipe });
    });
  }
  const sousClasse = cl && niveau >= cl.niveauSousClasse ? c.sousClasse ?? cl.sousClasses[0]?.id ?? null : null;
  const fiche: FichePersonnage = {
    identite: {
      espece: c.espece, historique: c.historique, alignement: c.alignement, genre: c.feminin ? 'femme' : 'homme',
      langues: [...(pe?.langues ?? ['Commun'])],
    },
    personnalite: c.personnalite,
    progression: { classes: cl ? [{ id: cl.id, niveau, sousClasse }] : [], xp: XP_NIVEAUX[niveau - 1] ?? 0 },
    maitrises: { competences, sauvegardes: cl?.sauvegardes ?? [], armes: cl?.maitrises.armes ?? [], armures: cl?.maitrises.armures ?? [] },
    inventaire: { objets, monnaie: { po: c.equipement ? 10 + 5 * niveau : 0 } },
    defense: { desVie: niveau },
  };
  const stats: Record<string, unknown> = { carac, vitesse: pe?.vitesse ?? 6, vision: pe?.vision ?? 0, ca: 10, niveau, degats: '1d4' };
  const calcul = calculer({ id: 'creation', nom: c.nom, sorte: 'pj', combat: { regles: 'dnd5e', stats }, fiche });
  const pv = calcul.pvMaxSuggere ?? 8;
  return { nom: c.nom, stats: { ...stats, ...calcul.stats, pv, pvMax: pv, vision: Math.max(pe?.vision ?? 0, 12) }, fiche };
}
