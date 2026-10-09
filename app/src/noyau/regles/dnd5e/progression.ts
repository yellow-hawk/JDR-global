// Progression D&D 5e (pur) : XP par niveau, aptitudes actives des classes et du peuple, PV suggérés,
// incantation et emplacements de sorts (tables du SRD 5.1).
import type { Effet, Personnage } from '../../contrat';
import type { AptitudeRegles, ClasseRegles, IncantationCalculee, PeupleRegles } from '../types';
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
