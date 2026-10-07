// Hasard déterministe, repris de l'Atlas des ciels (01-outils.js) pour rester compatible.
// Règle : aucune génération ne doit utiliser Math.random(). Même graine + même clé = même tirage.

export type Rng = () => number;

/** Empreinte 32 bits d'un texte (identique à hashStr de l'Atlas). */
export function hashStr(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** Générateur pseudo-aléatoire rapide, résultat dans [0, 1[. */
export function mulberry32(a: number): Rng {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Générateur propre à un sujet : graine + clé. Un nouveau sujet ne change pas les tirages existants. */
export const rngFor = (graine: string, cle: string): Rng => mulberry32(hashStr(`${graine}|${cle}`));

export const pick = <T>(rng: Rng, liste: readonly T[]): T => liste[Math.floor(rng() * liste.length)];

export function shuffle<T>(rng: Rng, liste: readonly T[]): T[] {
  const a = liste.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Entier dans [min, max]. */
export const entier = (rng: Rng, min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));
