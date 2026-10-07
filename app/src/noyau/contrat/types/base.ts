// Briques communes du format : identité du format, références, dates, secrets, fichiers.

export const FORMAT = 'jdr-global';
export const VERSION = 1;

/** Types d'objets adressables par une référence. */
export type TypeObjet =
  | 'univers' | 'carte' | 'personnage' | 'sort' | 'rencontre'
  | 'quete' | 'seance' | 'fichier' | 'peuple' | 'famille' | 'evenement' | 'document';

/** Lien vers un autre objet de la campagne. */
export interface Ref { type: TypeObjet; id: string }

/** Date dans le calendrier du monde (inventé). mois et jour commencent à 1. */
export interface DateMonde { an: number; mois: number; jour: number }

/** Temps de jeu : date et heure courantes, dans le calendrier d'un peuple de référence. */
export interface TempsMonde {
  date: DateMonde;
  /** Heure du jour (0 à jourHeures − 1). */
  heure: number;
  /** Calendrier de référence : peuple (clé de civilisation) d'un univers. Absent = premier peuple du monde par défaut. */
  reference?: { univers: string; peuple: number | string } | null;
}

/** Bloc secret : tout ce qui est sous `mj` disparaît de la vue joueurs. */
export type Secret = Record<string, unknown>;

export interface Fichier { id: string; nom: string; mime: string; octets: number }
