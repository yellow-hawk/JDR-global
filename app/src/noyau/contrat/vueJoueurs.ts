// Règle MJ / joueurs en une ligne : tout ce qui est rangé sous une clé `mj` est secret.
// vueJoueurs() supprime récursivement ces clés. Aucun module n'a besoin de sa propre règle.
import type { Campagne } from './types';
import { fichiersCites } from './references';

/** Vrai si l'objet entier est secret : `{ …, mj: { cache: true } }`. */
export function estCache(v: unknown): boolean {
  if (typeof v !== 'object' || v === null) return false;
  const mj = (v as Record<string, unknown>).mj;
  return typeof mj === 'object' && mj !== null && (mj as Record<string, unknown>).cache === true;
}

/**
 * Copie profonde d'une valeur quelconque sans aucune clé `mj`.
 * Dans une liste, un objet marqué `mj: { cache: true }` disparaît entièrement.
 */
export function sansSecrets<T>(v: T): T {
  if (Array.isArray(v)) return v.filter((x) => !estCache(x)).map((x) => sansSecrets(x)) as T;
  if (typeof v === 'object' && v !== null) {
    // Blob, Date, tableaux typés… : gardés tels quels (ils ne contiennent pas de clé mj).
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) return v;
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) if (k !== 'mj') o[k] = sansSecrets(x);
    return o as T;
  }
  return v;
}

/**
 * Vue joueurs d'une campagne : sans secrets, et sans les fichiers qui ne sont
 * cités que dans des blocs `mj` (ex. la version MJ d'une carte).
 */
export function vueJoueurs(c: Campagne): Campagne {
  const v = sansSecrets(c);
  const utiles = fichiersCites(v, true);
  v.fichiers = v.fichiers.filter((f) => utiles.has(f.id));
  return v;
}
