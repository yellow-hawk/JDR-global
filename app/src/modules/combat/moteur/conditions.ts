// Effets des états sur le jeu (pur, testé) : qui peut agir, vitesse réelle, avantage / désavantage aux attaques,
// jets de sauvegarde (bonus de la fiche, échec automatique). Inspiré de D&D 5e, simplifié pour la table.
import type { Rng } from '../../../noyau/hasard';
import type { Carac, Jeton } from './types';

const mod = (v: number): number => Math.floor((v - 10) / 2);
const a = (j: Jeton, c: string): boolean => j.conditions.includes(c);

/** États qui empêchent toute action (le tour passe). */
export const EMPECHE_AGIR = ['Paralysé', 'Pétrifié', 'Étourdi', 'Inconscient'];
/** États qui retirent le déplacement. */
export const IMMOBILISE = [...EMPECHE_AGIR, 'Entravé'];
/** Retirés au début du tour du jeton (ils duraient « jusqu'à votre prochain tour »). */
export const EXPIRE_DEBUT_TOUR = ['Esquive', 'Fonce'];
/** Utilisés par la prochaine attaque du jeton, puis retirés. */
export const CONSOMME_ATTAQUE = ['Caché', 'Aidé', 'Inspiré', 'Invisible'];

export const peutAgir = (j: Jeton): boolean => j.pv > 0 && !j.conditions.some((c) => EMPECHE_AGIR.includes(c));

/** Vitesse du tour (cases) : 0 si immobilisé, moitié ralenti, double hâté, plus une fois en fonçant. */
export function vitesseEffective(j: Jeton): number {
  if (j.conditions.some((c) => IMMOBILISE.includes(c))) return 0;
  let v = j.vitesse;
  if (a(j, 'Ralenti')) v = Math.floor(v / 2);
  if (a(j, 'Hâté')) v *= 2;
  if (a(j, 'Fonce')) v += a(j, 'Ralenti') ? Math.floor(j.vitesse / 2) : j.vitesse;
  return v;
}
export const resteMouvement = (j: Jeton): number => Math.max(0, vitesseEffective(j) - j.mouvementUtilise);

export type Mode = 'normal' | 'avantage' | 'desavantage';

/** Avantage ou désavantage d'une attaque, avec les raisons (pour le journal). Les deux s'annulent. */
export function modeAttaque(att: Jeton, cible: Jeton, sorte: 'melee' | 'distance', ennemiAuContact = false): { mode: Mode; raisons: string[] } {
  const pour: string[] = [], contre: string[] = [];
  for (const c of ['Invisible', 'Caché', 'Aidé']) if (a(att, c)) pour.push(c.toLowerCase());
  for (const c of ['Aveuglé', 'Paralysé', 'Étourdi', 'Inconscient', 'Entravé', 'Pétrifié']) if (a(cible, c)) pour.push(`cible ${c.toLowerCase()}`);
  for (const c of ['Aveuglé', 'Empoisonné', 'Effrayé', 'Entravé', 'Maudit']) if (a(att, c)) contre.push(c.toLowerCase());
  if (a(cible, 'Invisible')) contre.push('cible invisible');
  if (a(cible, 'Esquive') && peutAgir(cible)) contre.push('cible en esquive');
  if (sorte === 'distance' && ennemiAuContact) contre.push('ennemi au contact');
  const mode: Mode = pour.length && !contre.length ? 'avantage' : contre.length && !pour.length ? 'desavantage' : 'normal';
  return { mode, raisons: mode === 'avantage' ? pour : mode === 'desavantage' ? contre : [] };
}

/** Un d20 selon le mode : renvoie le dé gardé et les deux dés. */
export function d20Mode(mode: Mode, rng: Rng): { garde: number; des: number[] } {
  const x = 1 + Math.floor(rng() * 20);
  if (mode === 'normal') return { garde: x, des: [x] };
  const y = 1 + Math.floor(rng() * 20);
  return { garde: mode === 'avantage' ? Math.max(x, y) : Math.min(x, y), des: [x, y] };
}

/** Bonus de sauvegarde : celui de la fiche (maîtrises, talents, dons), sinon le modificateur de la caractéristique. */
export const bonusSauvegarde = (j: Jeton, c: Carac): number => j.profil?.sauvegardes?.[c] ?? mod(j.carac[c]);

/** Jet de sauvegarde contre un DD. Paralysé, étourdi, inconscient, pétrifié : échec automatique en FOR et DEX. */
export function sauvegarde(j: Jeton, c: Carac, dd: number, rng: Rng): { reussi: boolean; jet: number; total: number; auto?: boolean } {
  if ((c === 'for' || c === 'dex') && j.conditions.some((x) => EMPECHE_AGIR.includes(x))) return { reussi: false, jet: 0, total: 0, auto: true };
  const mode: Mode = c === 'dex' && a(j, 'Entravé') ? 'desavantage' : 'normal';
  const { garde } = d20Mode(mode, rng);
  const beni = a(j, 'Béni') ? 1 + Math.floor(rng() * 4) : 0;
  const total = garde + bonusSauvegarde(j, c) + beni + (a(j, 'Protégé') ? 1 : 0);
  return { reussi: total >= dd, jet: garde, total };
}

/** DD des sorts du jeton : celui de sa fiche, sinon 8 + 2 + meilleur modificateur mental. */
export const ddSorts = (j: Jeton): number => j.profil?.ddSorts ?? 10 + Math.max(mod(j.carac.int), mod(j.carac.sag), mod(j.carac.cha));
