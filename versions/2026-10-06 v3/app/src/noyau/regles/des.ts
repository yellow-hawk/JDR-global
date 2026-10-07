// Lanceur de dés générique (indépendant du système de règles).
// Formules : "1d20", "2d6+4", "1d8+1d4-1", "d100", "3" ; options avantage / désavantage pour un d20 seul.
import type { Rng } from '../hasard';

export interface ResultatDes {
  formule: string;
  total: number;
  /** Détail par terme : dés lancés ou constante. */
  termes: { texte: string; des: number[]; valeur: number }[];
}

const TERME = /([+-]?)\s*(\d*)d(\d+)|([+-]?)\s*(\d+)/gi;

export function formuleValide(f: string): boolean {
  const propre = f.replace(/\s+/g, '');
  if (!propre) return false;
  return /^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/i.test(propre);
}

/** Lance une formule. `rng` permet des tests reproductibles (Math.random par défaut, c'est du jeu, pas de la génération). */
export function lancer(formule: string, rng: Rng = Math.random, critique = false): ResultatDes {
  if (!formuleValide(formule)) throw new Error(`Formule de dés invalide : « ${formule} »`);
  const termes: ResultatDes['termes'] = [];
  let total = 0;
  for (const m of formule.replace(/\s+/g, '').matchAll(TERME)) {
    if (m[3]) {
      const signe = m[1] === '-' ? -1 : 1;
      const n = (m[2] ? parseInt(m[2], 10) : 1) * (critique ? 2 : 1);
      const faces = parseInt(m[3], 10);
      const des = Array.from({ length: n }, () => 1 + Math.floor(rng() * faces));
      const valeur = signe * des.reduce((a, b) => a + b, 0);
      termes.push({ texte: `${m[1] || ''}${n}d${faces}`, des, valeur });
      total += valeur;
    } else if (m[5]) {
      const valeur = (m[4] === '-' ? -1 : 1) * parseInt(m[5], 10);
      termes.push({ texte: m[0], des: [], valeur });
      total += valeur;
    }
  }
  return { formule, total, termes };
}

/** d20 avec avantage (meilleur de 2) ou désavantage (pire de 2). */
export function d20(mode: 'normal' | 'avantage' | 'desavantage' = 'normal', rng: Rng = Math.random): { garde: number; des: number[] } {
  const a = 1 + Math.floor(rng() * 20);
  if (mode === 'normal') return { garde: a, des: [a] };
  const b = 1 + Math.floor(rng() * 20);
  return { garde: mode === 'avantage' ? Math.max(a, b) : Math.min(a, b), des: [a, b] };
}
