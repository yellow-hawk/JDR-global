// Résolution et vérification des liens entre objets ({ type, id }).
import type { Campagne, Ref, TypeObjet } from './types';
import { COLLECTIONS, TYPE_DE_COLLECTION } from './types';

const TYPES = new Set<string>(Object.values(TYPE_DE_COLLECTION).concat('peuple'));

export function estRef(v: unknown): v is Ref {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.type === 'string' && typeof o.id === 'string' && TYPES.has(o.type)
    && Object.keys(o).length === 2;
}

/** Tous les identifiants existants, par type. */
export function index(c: Campagne): Map<TypeObjet, Set<string>> {
  const m = new Map<TypeObjet, Set<string>>();
  for (const nom of COLLECTIONS) {
    m.set(TYPE_DE_COLLECTION[nom], new Set((c[nom] as { id: string }[]).map((o) => o.id)));
  }
  const peuples = new Set<string>();
  for (const u of c.univers) for (const p of u.monde?.peuples ?? []) peuples.add(p.id);
  m.set('peuple', peuples);
  return m;
}

/** Retrouve l'objet désigné par une référence, ou undefined. */
export function trouver<T = unknown>(c: Campagne, ref: Ref): T | undefined {
  if (ref.type === 'peuple') {
    for (const u of c.univers) {
      const p = u.monde?.peuples.find((x) => x.id === ref.id);
      if (p) return p as T;
    }
    return undefined;
  }
  const nom = COLLECTIONS.find((n) => TYPE_DE_COLLECTION[n] === ref.type);
  if (!nom) return undefined;
  return (c[nom] as { id: string }[]).find((o) => o.id === ref.id) as T | undefined;
}

/** Parcourt un objet et appelle `f` sur chaque référence trouvée, avec son chemin. */
export function parcourirRefs(v: unknown, f: (ref: Ref, chemin: string) => void, chemin = ''): void {
  if (estRef(v)) { f(v, chemin); return; }
  if (Array.isArray(v)) { v.forEach((x, i) => parcourirRefs(x, f, `${chemin}[${i}]`)); return; }
  if (typeof v === 'object' && v !== null) {
    for (const [k, x] of Object.entries(v)) parcourirRefs(x, f, chemin ? `${chemin}.${k}` : k);
  }
}

/** Liste les références qui pointent vers un objet absent. */
export function referencesCassees(c: Campagne): { depuis: string; ref: Ref }[] {
  const ids = index(c);
  const cassees: { depuis: string; ref: Ref }[] = [];
  for (const nom of COLLECTIONS) {
    for (const o of c[nom] as { id: string }[]) {
      parcourirRefs(o, (ref, chemin) => {
        if (!ids.get(ref.type)?.has(ref.id)) cassees.push({ depuis: `${o.id}.${chemin}`, ref });
      });
    }
  }
  return cassees;
}

/** Identifiants des fichiers cités (champs texte "fichier-…"), hors ou avec les blocs mj. */
export function fichiersCites(v: unknown, horsMj = false): Set<string> {
  const s = new Set<string>();
  const visite = (x: unknown): void => {
    if (typeof x === 'string') { if (x.startsWith('fichier-')) s.add(x); return; }
    if (Array.isArray(x)) { x.forEach(visite); return; }
    if (typeof x === 'object' && x !== null) {
      for (const [k, y] of Object.entries(x)) {
        if (horsMj && k === 'mj') continue;
        if (k === 'fichiers') continue; // la liste des fichiers elle-même
        visite(y);
      }
    }
  };
  visite(v);
  return s;
}
