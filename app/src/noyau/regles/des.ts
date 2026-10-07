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

/* ---------- jets pour le plateau de dés (affichés en 3D sur l'écran joueurs) ---------- */

export type ModeJet = 'normal' | 'avantage' | 'desavantage';

/** Un dé physique lancé. `ecarte` : le dé non retenu d'un avantage / désavantage ; `negatif` : terme soustrait. */
export interface DeJete { faces: number; valeur: number; ecarte?: boolean; negatif?: boolean }

export interface JetDes {
  id: string;
  formule: string;
  mode: ModeJet;
  des: DeJete[];
  modificateur: number;
  total: number;
  /** Qui lance (jeton, personnage), facultatif. */
  qui?: string;
  /** Horodatage (ms). */
  quand: number;
}

const MAX_DES = 40;

/**
 * Lance une formule pour le plateau. L'avantage / désavantage s'applique au premier terme d'un seul dé
 * (« 1d20+5 », « d8 ») : on lance un second dé identique et on garde le meilleur / le pire.
 */
export function jeter(formule: string, mode: ModeJet = 'normal', rng: Rng = Math.random, qui?: string): JetDes {
  if (!formuleValide(formule)) throw new Error(`Formule de dés invalide : « ${formule} »`);
  const des: DeJete[] = [];
  let modificateur = 0, total = 0, premier = true;
  for (const m of formule.replace(/\s+/g, '').matchAll(TERME)) {
    if (m[3]) {
      const negatif = m[1] === '-';
      const n = Math.min(MAX_DES, m[2] ? parseInt(m[2], 10) : 1);
      const faces = parseInt(m[3], 10);
      const tire = () => 1 + Math.floor(rng() * faces);
      if (premier && n === 1 && mode !== 'normal') {
        const a = tire(), b = tire();
        const garde = mode === 'avantage' ? Math.max(a, b) : Math.min(a, b);
        const iGarde = a === garde ? 0 : 1;
        des.push({ faces, valeur: a, ecarte: iGarde !== 0, negatif }, { faces, valeur: b, ecarte: iGarde !== 1, negatif });
        total += (negatif ? -1 : 1) * garde;
      } else {
        for (let i = 0; i < n; i++) { const v = tire(); des.push({ faces, valeur: v, negatif }); total += (negatif ? -1 : 1) * v; }
      }
      premier = false;
    } else if (m[5]) {
      const v = (m[4] === '-' ? -1 : 1) * parseInt(m[5], 10);
      modificateur += v; total += v;
    }
  }
  return { id: `jet-${Date.now().toString(36)}-${Math.floor(rng() * 1e6).toString(36)}`, formule, mode, des, modificateur, total, qui, quand: Date.now() };
}

/** Texte court d'un jet : « 1d20 avantage [12, 17] +3 = 20 ». */
export function texteJet(j: JetDes): string {
  const mode = j.mode === 'avantage' ? ' avantage' : j.mode === 'desavantage' ? ' désavantage' : '';
  const des = j.des.map((d) => `${d.negatif ? '−' : ''}${d.ecarte ? `(${d.valeur})` : d.valeur}`).join(', ');
  const mod = j.modificateur ? ` ${j.modificateur > 0 ? '+' : '−'}${Math.abs(j.modificateur)}` : '';
  return `${j.qui ? `${j.qui} : ` : ''}${j.formule}${mode} [${des}]${mod} = ${j.total}`;
}
