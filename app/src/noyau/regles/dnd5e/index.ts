// Système D&D 5e (version simplifiée reprise de la Table de combat v7).
import type { SystemeRegles } from '../types';
import { statsPourProfil } from './profil';

const CARACS = [
  ['for', 'FOR'], ['dex', 'DEX'], ['con', 'CON'], ['int', 'INT'], ['sag', 'SAG'], ['cha', 'CHA'],
] as const;

/** Modificateur de caractéristique : (valeur − 10) / 2 arrondi vers le bas. */
export const mod = (v: number): number => Math.floor((v - 10) / 2);
export const signe = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);

const num = (v: unknown, defaut: number): number => (typeof v === 'number' && isFinite(v) ? v : defaut);
const carac = (s: Record<string, unknown>, k: string): number =>
  num((s.carac as Record<string, unknown> | undefined)?.[k], 10);

export const dnd5e: SystemeRegles = {
  id: 'dnd5e',
  nom: 'D&D 5e',
  champs: [
    { cle: 'pv', libelle: 'PV', sorte: 'nombre', groupe: 'Défense', min: 0 },
    { cle: 'pvMax', libelle: 'PV max', sorte: 'nombre', groupe: 'Défense', min: 1 },
    { cle: 'ca', libelle: 'CA', sorte: 'nombre', groupe: 'Défense', min: 0 },
    { cle: 'vitesse', libelle: 'Vitesse (cases)', sorte: 'nombre', groupe: 'Défense', min: 0, publicEnnemi: true },
    ...CARACS.map(([cle, libelle]) => ({
      cle: `carac.${cle}`, libelle, sorte: 'nombre' as const, groupe: 'Caractéristiques', min: 1, max: 30,
    })),
    { cle: 'degats', libelle: 'Dégâts', sorte: 'formule', groupe: 'Attaque' },
    { cle: 'vision', libelle: 'Vision (cases)', sorte: 'nombre', groupe: 'Attaque', min: 0 },
    { cle: 'bonusAttaque', libelle: 'Bonus d’attaque', sorte: 'nombre', groupe: 'Attaque' },
    { cle: 'niveau', libelle: 'Niveau', sorte: 'nombre', groupe: 'Profil', min: 1, max: 20 },
  ],
  statsParDefaut: () => ({
    pv: 20, pvMax: 20, ca: 10, vitesse: 6,
    carac: { for: 10, dex: 10, con: 10, int: 10, sag: 10, cha: 10 },
    degats: '1d8', vision: 12,
  }),
  statsPourProfil,
  resume: (s) => `PV ${num(s.pv, 0)}/${num(s.pvMax, 0)} · CA ${num(s.ca, 10)} · Vit ${num(s.vitesse, 6)}`,
  initiative: (s) => `1d20${signe(mod(carac(s, 'dex')))}`,
  // Choix maison (modifiable) : 1 point de puissance = 1d6, plafonné à 10d6.
  degatsSort: (p) => {
    const n = Math.max(1, Math.min(10, Math.round(p)));
    return { formule: `${n}d6`, moyenne: Math.round(n * 3.5) };
  },
  versTable: (s) => ({
    hpMax: num(s.pvMax, 20), hp: num(s.pv, num(s.pvMax, 20)), ac: num(s.ca, 10), speed: num(s.vitesse, 6),
    str: carac(s, 'for'), dex: carac(s, 'dex'), con: carac(s, 'con'), int: carac(s, 'int'), wis: carac(s, 'sag'), cha: carac(s, 'cha'),
    damageFormula: typeof s.degats === 'string' && s.degats ? s.degats : '1d8', visionRange: num(s.vision, 12),
    ...(typeof s.bonusAttaque === 'number' ? { attackBonus: s.bonusAttaque } : {}),
  }),
  depuisTable: (s, j) => ({ ...s, pv: Math.max(0, num(j.hp, num(s.pv, 0))) }),
};
