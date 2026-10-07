// Racine d'une campagne et liste de ses collections.
import type { FORMAT, Fichier, Ref, Secret, TempsMonde, TypeObjet } from './base';
import type { Carte } from './cartes';
import type { DocumentJoueurs, Evenement, Quete, Rencontre, Seance, Sort } from './jeu';
import type { Univers } from './monde';
import type { Famille, Personnage } from './personnages';

export interface InfosCampagne {
  id: string;
  nom: string;
  regles: string;
  /** Monde par défaut de la campagne (univers enregistré depuis l'Atlas ou fait main). */
  univers?: Ref | null;
  /** Horloge du temps de jeu. */
  temps?: TempsMonde | null;
  creeLe: string;
  majLe: string;
  mj?: Secret;
}

/** Racine d'une campagne. */
export interface Campagne {
  format: typeof FORMAT;
  version: number;
  campagne: InfosCampagne;
  univers: Univers[];
  cartes: Carte[];
  personnages: Personnage[];
  sorts: Sort[];
  rencontres: Rencontre[];
  quetes: Quete[];
  seances: Seance[];
  fichiers: Fichier[];
  /** Arbres généalogiques (familles et dynasties). */
  familles: Famille[];
  /** Événements de la chronologie. */
  evenements: Evenement[];
  /** Documents à montrer aux joueurs. */
  documents: DocumentJoueurs[];
  /** Réglages propres à chaque module, rangés par id de module (ex. modules.magie.exemplesRetires). */
  modules?: Record<string, Record<string, unknown>>;
}

/** Noms des collections de la racine, dans l'ordre du format. */
export const COLLECTIONS = [
  'univers', 'cartes', 'personnages', 'sorts', 'rencontres', 'quetes', 'seances', 'fichiers', 'familles',
  'evenements', 'documents',
] as const;
export type NomCollection = typeof COLLECTIONS[number];

/** Type d'objet porté par chaque collection. */
export const TYPE_DE_COLLECTION: Record<NomCollection, TypeObjet> = {
  univers: 'univers', cartes: 'carte', personnages: 'personnage', sorts: 'sort',
  rencontres: 'rencontre', quetes: 'quete', seances: 'seance', fichiers: 'fichier', familles: 'famille',
  evenements: 'evenement', documents: 'document',
};
