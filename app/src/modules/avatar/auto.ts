// Apparence automatique d'un PNJ (preset presetVersion 1) tirée de sa description, de son rôle, de son genre et de son peuple.
// Pur et déterministe (même PNJ → même visage, même tenue). Les valeurs restent modérées : c'est un point de départ à retoucher.
// Tenues, palettes, coiffures et traits de peuple : données dans auto.json.
import { hashStr, mulberry32 } from '../../noyau/hasard';
import REGLES_AUTO from './auto.json';

export interface DescriptionPnj {
  nom: string;
  apparence?: string;
  feminin?: boolean;
  peuple?: string | number | null;
  /** Rôle ou métier (« capitaine de la garde ») : choisit la tenue. */
  role?: string;
  /** Nom du peuple (« Elfes des brumes ») : traits physiques (oreilles pointues…). */
  peupleNom?: string;
}

type Choix = string | null | (string | null)[];
interface Tenue { id?: string; motifs?: string; assets: Record<string, Choix>; palette: string; muscle?: number }
const R = REGLES_AUTO as unknown as {
  tenues: Tenue[]; defaut: Tenue; feminin: { robe: number; jupe: number };
  palettes: Record<string, Record<string, string[]>>; cheveux: string[]; cheveuxAges: string[];
  coiffures: { f: (string | null)[]; m: (string | null)[] };
  peuples: { motifs: string; morphs: Record<string, number>; barbe?: string }[];
  barbes: { m: (string | null)[]; ages: (string | null)[] };
};

/** Teintes de peau (multiplient la texture du modèle) : une base par peuple, une variation par personne. */
const PEAUX = ['#ffffff', '#f3dcc8', '#e2bf9c', '#c99a74', '#a8784f', '#82593a', '#5f402a'];
const YEUX = ['#ffffff', '#9fc3e6', '#8fb38a', '#c8a26b', '#8a6a4a', '#b9c7cf'];

/** Règles de morphologie : mots de la description → réglages des morphs. */
const MOTS: [RegExp, Record<string, number>][] = [
  [/grand(e)? et maigre|élancé|maigre/i, { legs_height: 1.2, belly: -1, poids: -0.6, arm_circumference: -0.8, chest_breadth: -0.5 }],
  [/\bpetit(e)?\b|menu(e)?/i, { stature: -0.8, legs_height: -0.6 }],
  [/\bgrand(e)?\b|imposant(e)?|géant/i, { stature: 0.7 }],
  [/massi(f|ve)|colosse|corpulent|robuste|trapu/i, { chest_breadth: 1.2, arm_circumference: 1.2, belly: 0.8, muscle: 0.5, poids: 0.4 }],
  [/gros(se)?\b|bedonnant|ventru|replet/i, { poids: 0.8, belly: 1.2 }],
  [/musclé|athlétique|carrure/i, { muscle: 0.7, shoulders: 0.5 }],
  [/âgé(e)?|vieux|vieille|voûté(e)?|ridé|barbe blanche|cheveux blancs/i, { age: 0.75 }],
  [/jeune|adolescent|gamin/i, { age: -0.5 }],
  [/élégant(e)?|raffiné/i, { belly: -0.4, chin_height: 0.4, poids: -0.2 }],
  [/regard perçant|yeux perçants/i, { eye_corners: 0.8 }],
  [/souriant(e)?|jovial(e)?|bonhomme/i, { cheeks: 0.8, mouth_corners: 0.6 }],
  [/sévère|austère|renfrogné|sombre/i, { mouth_corners: -0.5, brow_angle: -0.5 }],
  [/nez crochu|nez aquilin|grand nez/i, { nose_hump: 0.8, nose_length: 0.5 }],
  [/mâchoire carrée|menton volontaire/i, { jaw_width: 0.8, chin_prominent: 0.6 }],
  [/chauve|crâne rasé/i, { skull_shape: 0.6 }],
];

const borne = (v: number) => Math.max(-2, Math.min(2, Math.round(v * 100) / 100));

export function apparenceAuto(d: DescriptionPnj): Record<string, unknown> {
  const r = mulberry32(hashStr(`avatar|${d.nom}|${d.peuple ?? ''}`));
  const tirer = <T,>(l: T[]): T => l[Math.floor(r() * l.length)];
  const choisir = (c: Choix | undefined): string | null => (Array.isArray(c) ? tirer(c) : c ?? null);
  const texte = d.apparence ?? '';
  const quoi = `${d.role ?? ''} ${texte}`;

  // 1. Morphologie : variations douces + genre + mots de la description + traits du peuple
  const values: Record<string, number> = {
    nose_depth: (r() - 0.5) * 1.6, mouth_width: (r() - 0.5) * 1.2, chin_height: (r() - 0.5) * 1.4, skull_shape: (r() - 0.5) * 1,
    cheeks: (r() - 0.5) * 1.2, eye_corners: (r() - 0.5) * 1.2, arm_circumference: (r() - 0.5) * 0.8, chest_breadth: (r() - 0.5) * 0.8,
    legs_height: (r() - 0.5) * 0.8, belly: (r() - 0.5) * 0.8, hips_width: (r() - 0.5) * 0.6, breast_position: 0,
    nose_width: (r() - 0.5) * 0.8, lip_upper: (r() - 0.5) * 0.6, lip_lower: (r() - 0.5) * 0.6, jaw_width: (r() - 0.5) * 0.6,
    poids: (r() - 0.5) * 0.6, stature: (r() - 0.5) * 0.6, age: (r() - 0.5) * 0.4, muscle: (r() - 0.5) * 0.4,
    genre: d.feminin ? 0.8 + r() * 0.2 : -(0.8 + r() * 0.2),
  };
  if (d.feminin) { values.breast_position = 0.3 + r() * 0.5; values.hips_width += 0.5; values.poitrine_volume = (r() - 0.3) * 0.8; }
  const tenue = R.tenues.find((t) => t.motifs && new RegExp(t.motifs, 'i').test(quoi)) ?? R.defaut;
  if (tenue.muscle) values.muscle += tenue.muscle;
  for (const [re, m] of MOTS) if (re.test(texte)) for (const [k, v] of Object.entries(m)) values[k] = (values[k] ?? 0) + v;
  for (const p of R.peuples) if (new RegExp(p.motifs, 'i').test(`${d.peupleNom ?? ''} ${texte}`)) for (const [k, v] of Object.entries(p.morphs)) values[k] = (values[k] ?? 0) + v;
  for (const k of Object.keys(values)) values[k] = borne(values[k]);
  if (values.ear_pointed !== undefined) values.ear_pointed = Math.max(0, Math.min(1, values.ear_pointed));
  for (const k of ['genre', 'age', 'muscle', 'poids', 'stature', 'poitrine_volume']) if (k in values) values[k] = Math.max(-1, Math.min(1, values[k]));

  // 2. Tenue : selon le rôle, avec une variante féminine (robe ou jupe) quand rien ne l'interdit
  const assets: Record<string, string | null> = {};
  for (const [slot, c] of Object.entries(tenue.assets)) assets[slot] = choisir(c);
  if (d.feminin && !assets.armure && assets.haut !== 'robe') {
    const x = r();
    if (x < R.feminin.robe) { assets.haut = 'robe'; assets.bas = null; }
    else if (x < R.feminin.robe + R.feminin.jupe) assets.bas = 'jupe';
  }
  const palette = R.palettes[tenue.palette] ?? R.palettes.terre;
  const couleursTenue: Record<string, string> = {};
  for (const slot of ['haut', 'bas', 'pieds', 'armure', 'ceinture', 'cape']) {
    const l = palette[slot] ?? R.palettes.terre[slot];
    if (l) couleursTenue[`tenue_${slot}`] = tirer(l);
  }

  // 3. Peau (base du peuple, ± un cran), yeux, cheveux
  const base = d.peuple == null ? Math.floor(r() * PEAUX.length) : hashStr(`peau|${d.peuple}`) % PEAUX.length;
  const peau = PEAUX[Math.max(0, Math.min(PEAUX.length - 1, base + Math.floor(r() * 3) - 1))];
  const chauve = /chauve|crâne rasé/i.test(texte);
  const cheveux = values.age > 0.5 ? tirer(R.cheveuxAges) : tirer(R.cheveux);
  assets.hair = chauve ? null : tirer(d.feminin ? R.coiffures.f : R.coiffures.m);
  assets.eyebrows = tirer(['default', 'default', 'fins', 'epais', 'arques']);
  assets.eyelashes = d.feminin ? 'longs' : 'default';
  const peupleBarbu = R.peuples.find((p) => p.barbe && new RegExp(p.motifs, 'i').test(`${d.peupleNom ?? ''} ${texte}`));
  assets.barbe = d.feminin ? null : /imberbe|rasé de près/i.test(texte) ? null
    : /barbe|barbu/i.test(texte) || peupleBarbu ? (peupleBarbu?.barbe ?? 'fournie') : tirer(values.age > 0.5 ? R.barbes.ages : R.barbes.m);

  return {
    presetVersion: 1, name: d.nom, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), thumbnail: null, auto: true,
    data: {
      species: 'human', gender: d.feminin ? 'female' : 'male',
      colors: { skin: peau, eyes: tirer(YEUX), teeth: '#ffffff', tongue: '#ffffff', hair: cheveux, eyebrows: cheveux, barbe: cheveux, eyelashes: '#ffffff', ...couleursTenue },
      morphs: { values, asymmetry: false, lr: {} },
      assets,
    },
  };
}
