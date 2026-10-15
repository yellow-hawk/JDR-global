// Progression D&D 5e (pur) : XP par niveau, aptitudes actives des classes et du peuple, PV suggérés,
// incantation et emplacements de sorts (tables du SRD 5.1).
import type { Effet, Personnage } from '../../contrat';
import type { AptitudeRegles, ClasseRegles, IncantationCalculee, NouveautesNiveau, PeupleRegles } from '../types';
import DONNEES from './classes.json';

export const CLASSES = (DONNEES as unknown as { classes: ClasseRegles[] }).classes;
export const PEUPLES = (DONNEES as unknown as { peuples: PeupleRegles[] }).peuples;
export const classeDe = (id: string | undefined): ClasseRegles | undefined => CLASSES.find((c) => c.id === id);
export const peupleDe = (id: string | undefined): PeupleRegles | undefined => PEUPLES.find((p) => p.id === id);

/** XP minimale de chaque niveau (index 0 = niveau 1). */
export const XP_NIVEAUX = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
export const niveauPourXp = (xp: number): number => XP_NIVEAUX.filter((s) => xp >= s).length || 1;

/** Aptitudes actives (classe, sous-classe, peuple) au niveau atteint dans chaque classe. */
export function aptitudesActives(p: Personnage): (AptitudeRegles & { source: string })[] {
  const res: (AptitudeRegles & { source: string })[] = [];
  for (const c of p.fiche?.progression?.classes ?? []) {
    const cl = classeDe(c.id);
    if (!cl) continue;
    for (const a of cl.aptitudes) if (a.niveau <= c.niveau && !a.amelioration) res.push({ ...a, source: cl.nom });
    const sc = cl.sousClasses.find((s) => s.id === c.sousClasse);
    if (sc) for (const a of sc.aptitudes) if (a.niveau <= c.niveau) res.push({ ...a, source: sc.nom });
  }
  const pe = peupleDe(p.fiche?.identite?.espece);
  if (pe) for (const t of pe.traits) res.push({ niveau: 1, nom: t.nom, texte: t.texte, effets: t.effets, source: pe.nom });
  return res.sort((a, b) => a.niveau - b.niveau);
}

export const effetsDesAptitudes = (p: Personnage): Effet[] => aptitudesActives(p).flatMap((a) => a.effets ?? []);

/** PV max : dé de vie plein au niveau 1 (première classe), moyenne arrondie au-dessus ensuite, + CON et bonus par niveau. */
export function pvMaxSuggere(p: Personnage, modCon: number, bonusParNiveau: number): number | undefined {
  const classes = (p.fiche?.progression?.classes ?? []).filter((c) => classeDe(c.id));
  if (!classes.length) return undefined;
  let pv = 0;
  classes.forEach((c, i) => {
    const dv = classeDe(c.id)!.deVie;
    for (let n = 1; n <= c.niveau; n++) pv += (i === 0 && n === 1 ? dv : dv / 2 + 1) + modCon + bonusParNiveau;
  });
  return Math.max(1, Math.round(pv));
}

/** Emplacements d'un lanceur complet par niveau de lanceur (SRD 5.1). */
const EMPLACEMENTS: number[][] = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
];
/** Magie de pacte : [nombre d'emplacements, niveau] par niveau d'occultiste. */
const PACTE: [number, number][] = [[1, 1], [2, 1], [2, 2], [2, 2], [2, 3], [2, 3], [2, 4], [2, 4], [2, 5], [2, 5], [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [4, 5], [4, 5], [4, 5], [4, 5]];

export function incantation(p: Personnage, modDe: (c: string) => number, pb: number): {
  incantation: IncantationCalculee[]; emplacements: number[]; pacte: { nombre: number; niveau: number } | null;
} {
  const inc: IncantationCalculee[] = [];
  let niveauLanceur = 0;
  let pacte: { nombre: number; niveau: number } | null = null;
  for (const c of p.fiche?.progression?.classes ?? []) {
    const i = classeDe(c.id)?.incantation;
    if (!i) continue;
    inc.push({ classe: classeDe(c.id)!.nom, carac: i.carac, dd: 8 + pb + modDe(i.carac), attaque: pb + modDe(i.carac) });
    if (i.type === 'complet') niveauLanceur += c.niveau;
    else if (i.type === 'demi') niveauLanceur += c.niveau >= 2 ? Math.floor(c.niveau / 2) : 0;
    else { const [nombre, niveau] = PACTE[Math.min(20, c.niveau) - 1]; pacte = { nombre, niveau }; }
  }
  return { incantation: inc, emplacements: niveauLanceur ? EMPLACEMENTS[Math.min(20, niveauLanceur) - 1] : [], pacte };
}

/** XP d'un adversaire selon son facteur de puissance (FP 0 à 20 ; on prend le niveau du PNJ). */
const XP_FP = [10, 200, 450, 700, 1100, 1800, 2300, 2900, 3900, 5000, 5900, 7200, 8400, 10000, 11500, 13000, 15000, 18000, 20000, 22000, 25000];
export const xpAdversaire = (niveau: number): number => XP_FP[Math.max(0, Math.min(20, Math.round(niveau)))];

/** Seuils d'XP d'une rencontre par personnage, du niveau 1 à 20 : facile, moyenne, difficile, mortelle. */
const SEUILS: [number, number, number, number][] = [
  [25, 50, 75, 100], [50, 100, 150, 200], [75, 150, 225, 400], [125, 250, 375, 500], [250, 500, 750, 1100],
  [300, 600, 900, 1400], [350, 750, 1100, 1700], [450, 900, 1400, 2100], [550, 1100, 1600, 2400], [600, 1200, 1900, 2800],
  [800, 1600, 2400, 3600], [1000, 2000, 3000, 4500], [1100, 2200, 3400, 5100], [1250, 2500, 3800, 5700], [1400, 2800, 4300, 6400],
  [1600, 3200, 4800, 7200], [2000, 3900, 5900, 8800], [2100, 4200, 6300, 9500], [2400, 4900, 7300, 10900], [2800, 5700, 8500, 12700],
];
export const difficulte = {
  seuils: (niveau: number) => SEUILS[Math.max(1, Math.min(20, Math.round(niveau))) - 1],
  /** Plus les adversaires sont nombreux, plus la rencontre est dure. */
  multiplicateur: (n: number) => (n <= 1 ? 1 : n === 2 ? 1.5 : n <= 6 ? 2 : n <= 10 ? 2.5 : n <= 14 ? 3 : 4),
};

export function gainPv(classe: string, modCon: number, jet?: number): number {
  const dv = classeDe(classe)?.deVie ?? 8;
  return Math.max(1, (jet ?? dv / 2 + 1) + modCon);
}

export function nouveautes(classe: string, niveau: number, sousClasse?: string | null): NouveautesNiveau | null {
  const cl = classeDe(classe);
  if (!cl || niveau < 1 || niveau > 20) return null;
  return {
    classe: cl.id, niveau, deVie: cl.deVie,
    aptitudes: cl.aptitudes.filter((a) => a.niveau === niveau && !a.amelioration),
    amelioration: cl.aptitudes.some((a) => a.niveau === niveau && a.amelioration),
    sousClasse: niveau === cl.niveauSousClasse ? cl.sousClasses.map((s) => ({ id: s.id, nom: s.nom, texte: s.texte, aptitudes: s.aptitudes })) : null,
    aptitudesSousClasse: cl.sousClasses.find((s) => s.id === sousClasse)?.aptitudes.filter((a) => a.niveau === niveau) ?? [],
  };
}
