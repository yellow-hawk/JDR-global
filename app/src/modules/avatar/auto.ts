// Apparence automatique d'un PNJ (preset presetVersion 1) tirée de sa description, de son genre et de son peuple.
// Pur et déterministe (même PNJ → même visage). Les valeurs restent modérées : c'est un point de départ à retoucher.
import { hashStr, mulberry32 } from '../../noyau/hasard';

export interface DescriptionPnj { nom: string; apparence?: string; feminin?: boolean; peuple?: string | number | null }

/** Teintes de peau (multiplient la texture du modèle) : une base par peuple, une variation par personne. */
const PEAUX = ['#ffffff', '#f3dcc8', '#e2bf9c', '#c99a74', '#a8784f', '#82593a', '#5f402a'];
const YEUX = ['#ffffff', '#9fc3e6', '#8fb38a', '#c8a26b', '#8a6a4a', '#b9c7cf'];

/** Règles de morphologie : mots de la description → réglages des morphs (−2..2). */
const REGLES: [RegExp, Record<string, number>][] = [
  [/grand(e)? et maigre|élancé|maigre/i, { legs_height: 1.2, belly: -1, arm_circumference: -0.8, chest_breadth: -0.5 }],
  [/\bpetit(e)?\b|menu(e)?/i, { legs_height: -1.3, chest_breadth: -0.3 }],
  [/massi(f|ve)|colosse|corpulent/i, { chest_breadth: 1.5, arm_circumference: 1.4, belly: 0.8 }],
  [/âgé(e)?|vieux|vieille|voûté(e)?/i, { belly: 0.7, chest_breadth: -0.4, cheeks: -0.6 }],
  [/jeune/i, { belly: -0.5, cheeks: 0.4 }],
  [/élégant(e)?/i, { belly: -0.4, chin_height: 0.4 }],
  [/regard perçant/i, { eye_corners: 0.8 }],
  [/souriant(e)?|jovial(e)?/i, { cheeks: 0.8, mouth_width: 0.5 }],
  [/chauve|crâne rasé/i, { skull_shape: 0.6 }],
];

const borne = (v: number) => Math.max(-2, Math.min(2, Math.round(v * 100) / 100));

export function apparenceAuto(d: DescriptionPnj): Record<string, unknown> {
  const r = mulberry32(hashStr(`avatar|${d.nom}|${d.peuple ?? ''}`));
  const texte = d.apparence ?? '';
  const values: Record<string, number> = {
    nose_depth: (r() - 0.5) * 1.6, mouth_width: (r() - 0.5) * 1.2, chin_height: (r() - 0.5) * 1.4, skull_shape: (r() - 0.5) * 1,
    cheeks: (r() - 0.5) * 1.2, eye_corners: (r() - 0.5) * 1.2, arm_circumference: (r() - 0.5) * 0.8, chest_breadth: (r() - 0.5) * 0.8,
    legs_height: (r() - 0.5) * 0.8, belly: (r() - 0.5) * 0.8, hips_width: (r() - 0.5) * 0.6, breast_position: 0,
  };
  if (d.feminin) { values.breast_position = 1.2 + r() * 0.5; values.hips_width += 1; values.chest_breadth -= 0.6; values.arm_circumference -= 0.5; }
  for (const [re, m] of REGLES) if (re.test(texte)) for (const [k, v] of Object.entries(m)) values[k] = (values[k] ?? 0) + v;
  for (const k of Object.keys(values)) values[k] = borne(values[k]);

  // Peau : base du peuple (stable), ± un cran au hasard.
  const base = d.peuple == null ? Math.floor(r() * PEAUX.length) : hashStr(`peau|${d.peuple}`) % PEAUX.length;
  const peau = PEAUX[Math.max(0, Math.min(PEAUX.length - 1, base + Math.floor(r() * 3) - 1))];
  const chauve = /chauve|crâne rasé/i.test(texte);
  return {
    presetVersion: 1, name: d.nom, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), thumbnail: null, auto: true,
    data: {
      species: 'human', gender: d.feminin ? 'female' : 'male',
      colors: { skin: peau, eyes: YEUX[Math.floor(r() * YEUX.length)], teeth: '#ffffff', tongue: '#ffffff' },
      morphs: { values, asymmetry: false, lr: {} },
      assets: { hair: chauve ? null : d.feminin || r() < 0.3 ? 'ponytail' : null, eyebrows: 'default', eyelashes: 'default' },
    },
  };
}
