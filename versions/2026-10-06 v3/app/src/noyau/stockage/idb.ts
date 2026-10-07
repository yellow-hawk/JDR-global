// Petite couche IndexedDB (sans dépendance). Trois magasins :
//  - campagnes : JSON d'une campagne, clé = campagne.campagne.id
//  - fichiers  : contenu binaire (Blob), clé = "<idCampagne>/<idFichier>"
//  - reglages  : préférences de l'application (dernière campagne ouverte…)

const NOM_BASE = 'jdr-global';
const VERSION_BASE = 1;
export type Magasin = 'campagnes' | 'fichiers' | 'reglages';

let ouverture: Promise<IDBDatabase> | null = null;

export function base(): Promise<IDBDatabase> {
  if (ouverture) return ouverture;
  ouverture = new Promise((ok, ko) => {
    const req = indexedDB.open(NOM_BASE, VERSION_BASE);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const m of ['campagnes', 'fichiers', 'reglages']) {
        if (!db.objectStoreNames.contains(m)) db.createObjectStore(m);
      }
    };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => { ouverture = null; ko(req.error); };
  });
  return ouverture;
}

/** Ferme la base (utile pour les tests). */
export async function fermer(): Promise<void> {
  if (!ouverture) return;
  (await ouverture).close();
  ouverture = null;
}

function requete<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
}

async function magasin(m: Magasin, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return (await base()).transaction(m, mode).objectStore(m);
}

export async function lire<T>(m: Magasin, cle: string): Promise<T | undefined> {
  return requete((await magasin(m, 'readonly')).get(cle)) as Promise<T | undefined>;
}

export async function ecrire(m: Magasin, cle: string, valeur: unknown): Promise<void> {
  await requete((await magasin(m, 'readwrite')).put(valeur, cle));
}

export async function effacer(m: Magasin, cle: string | IDBKeyRange): Promise<void> {
  await requete((await magasin(m, 'readwrite')).delete(cle));
}

export async function cles(m: Magasin, plage?: IDBKeyRange): Promise<string[]> {
  return (await requete((await magasin(m, 'readonly')).getAllKeys(plage))) as string[];
}

export async function tout<T>(m: Magasin): Promise<T[]> {
  return requete((await magasin(m, 'readonly')).getAll()) as Promise<T[]>;
}

/** Plage de clés "prefixe/…" pour les fichiers d'une campagne. */
export const plagePrefixe = (prefixe: string): IDBKeyRange =>
  IDBKeyRange.bound(`${prefixe}/`, `${prefixe}/￿`);
