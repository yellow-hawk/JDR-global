// Logique pure du module Cartes : ajout, modification, suppression, échelle, repères, emboîtement.
import type { Campagne, Carte, Fichier, Repere } from '../../noyau/contrat';
import { nouvelId, nouvelleCarte, maintenant } from '../../noyau/contrat';
import donnees from './types.json';

export const TYPES_CARTE: { id: string; libelle: string }[] = donnees.typesCarte;
export const SORTES_REPERE: { id: string; libelle: string }[] = donnees.sortesRepere;
export const libelleType = (id: string): string => TYPES_CARTE.find((t) => t.id === id)?.libelle ?? id;

/** Devine le type d'après le nom du fichier (« monde », « ville »…), sinon « lieu ». */
export function devinerType(nomFichier: string): string {
  const n = nomFichier.toLowerCase();
  if (/monde|world|globe/.test(n)) return 'monde';
  if (/pays|region|r[ée]gion|royaume|kingdom|country/.test(n)) return 'region';
  if (/ville|city|cit[ée]|village|town/.test(n)) return 'ville';
  if (/donjon|dungeon|cave|grotte|crypte|int[ée]rieur/.test(n)) return 'donjon';
  if (/bataille|battle|combat|rencontre/.test(n)) return 'bataille';
  return 'lieu';
}

/** Nom lisible tiré d'un nom de fichier : « royaume_d-orden.png » → « Royaume d orden ». */
export function nomDepuisFichier(nomFichier: string): string {
  const base = nomFichier.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Carte sans nom';
}

export function ajouterCarte(
  c: Campagne, f: Fichier, taille: { l: number; h: number }, nom?: string, type?: string,
): { campagne: Campagne; id: string } {
  const carte: Carte = {
    ...nouvelleCarte(nom ?? nomDepuisFichier(f.nom), type ?? devinerType(f.nom)),
    images: { joueurs: f.id }, taille,
  };
  return { campagne: { ...c, cartes: [...c.cartes, carte], fichiers: [...c.fichiers, f] }, id: carte.id };
}

export function modifierCarte(c: Campagne, id: string, f: (k: Carte) => Carte): Campagne {
  return { ...c, cartes: c.cartes.map((k) => (k.id === id ? { ...f(k), majLe: maintenant() } : k)) };
}

/** Ajoute ou remplace la version MJ. Renvoie l'ancien fichier MJ à effacer. */
export function definirVersionMj(c: Campagne, id: string, f: Fichier | null): { campagne: Campagne; libere: string | null } {
  const k = c.cartes.find((x) => x.id === id);
  const ancien = k?.images.mj?.image ?? null;
  let campagne = modifierCarte(c, id, (x) => {
    const { mj: _ancien, ...reste } = x.images;
    return { ...x, images: f ? { ...reste, mj: { image: f.id } } : reste };
  });
  campagne = { ...campagne, fichiers: [...campagne.fichiers.filter((x) => x.id !== ancien), ...(f ? [f] : [])] };
  return { campagne, libere: ancien };
}

/** Supprime une carte, ses fichiers, et détache les cartes enfants et les univers qui l'utilisaient. */
export function supprimerCarte(c: Campagne, id: string): { campagne: Campagne; liberes: string[] } {
  const k = c.cartes.find((x) => x.id === id);
  if (!k) return { campagne: c, liberes: [] };
  const liberes = [k.images.joueurs, k.images.mj?.image].filter((x): x is string => !!x);
  return {
    campagne: {
      ...c,
      cartes: c.cartes.filter((x) => x.id !== id).map((x) => (x.parent?.carte.id === id ? { ...x, parent: null } : x)),
      univers: c.univers.map((u) => (u.monde?.carte?.id === id ? { ...u, monde: { ...u.monde, carte: null } } : u)),
      fichiers: c.fichiers.filter((f) => !liberes.includes(f.id)),
    },
    liberes,
  };
}

/** Échelle à partir de deux points (pixels de l'image) et de leur distance réelle en mètres. */
export function echelleDepuisPoints(a: [number, number], b: [number, number], metres: number): number | null {
  const px = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (px < 1 || !(metres > 0)) return null;
  return metres / px;
}

/** Distance lisible : « 850 m », « 12,4 km ». */
export function distanceLisible(metres: number): string {
  if (metres < 1000) return `${Math.round(metres).toLocaleString('fr-FR')} m`;
  return `${(metres / 1000).toLocaleString('fr-FR', { maximumFractionDigits: metres < 10000 ? 1 : 0 })} km`;
}

/** Taille d'une case de combat (1,5 m) en pixels de la carte, si l'échelle est connue. */
export function pixelsParCase(k: Carte, metresParCase = 1.5): number | null {
  return k.echelle?.metresParPixel ? metresParCase / k.echelle.metresParPixel : null;
}

export function ajouterRepere(c: Campagne, idCarte: string, x: number, y: number, nom = 'Nouveau repère'): { campagne: Campagne; id: string } {
  const r: Repere = { id: nouvelId('rep'), nom, x: Math.round(x), y: Math.round(y), sorte: 'lieu', desc: '' };
  return { campagne: modifierCarte(c, idCarte, (k) => ({ ...k, reperes: [...k.reperes, r] })), id: r.id };
}

export function modifierRepere(c: Campagne, idCarte: string, idRep: string, f: (r: Repere) => Repere): Campagne {
  return modifierCarte(c, idCarte, (k) => ({ ...k, reperes: k.reperes.map((r) => (r.id === idRep ? f(r) : r)) }));
}

export function supprimerRepere(c: Campagne, idCarte: string, idRep: string): Campagne {
  return modifierCarte(c, idCarte, (k) => ({ ...k, reperes: k.reperes.filter((r) => r.id !== idRep) }));
}

/** Cartes enfants (placées dans une zone de cette carte). */
export const enfants = (c: Campagne, id: string): Carte[] => c.cartes.filter((k) => k.parent?.carte.id === id);

/** Chemin de la carte jusqu'à la racine (fil d'Ariane), de la racine vers la carte. */
export function chemin(c: Campagne, id: string): Carte[] {
  const res: Carte[] = [];
  const vus = new Set<string>();
  let k = c.cartes.find((x) => x.id === id);
  while (k && !vus.has(k.id)) {
    res.unshift(k);
    vus.add(k.id);
    const pid = k.parent?.carte.id;
    k = pid ? c.cartes.find((x) => x.id === pid) : undefined;
  }
  return res;
}

/** Peut-on placer `id` dans `parent` sans créer de boucle ? */
export const parentPossible = (c: Campagne, id: string, parent: string): boolean =>
  id !== parent && !chemin(c, parent).some((k) => k.id === id);
