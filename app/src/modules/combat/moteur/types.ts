// Types du moteur de combat (réécriture en TS de la Table de combat v7).
// Unité de distance : la case (1 case = 1,5 m). Coordonnées : (x, y) en grille carrée, (q, r) axiales en hexagonal.

export type Cellule = [number, number];
export type TypeGrille = 'carree' | 'hex';
export interface Grille { type: TypeGrille; taille: number } // taille = côté d'une case en pixels « monde »

export type Camp = 'pj' | 'allie' | 'ennemi' | 'neutre';
export type Carac = 'for' | 'dex' | 'con' | 'int' | 'sag' | 'cha';
export const CARACS: Carac[] = ['for', 'dex', 'con', 'int', 'sag', 'cha'];

export interface Aura { nom: string; rayon: number; couleur: string }
export interface DrapeauxTour { action: boolean; bonus: boolean; reaction: boolean; mouvement: boolean }

export interface Jeton {
  id: number;
  nom: string;
  camp: Camp;
  pv: number;
  pvMax: number;
  ca: number;
  vitesse: number;          // en cases
  carac: Record<Carac, number>;
  x: number;
  y: number;
  taille: 1 | 2 | 3 | 4;
  conditions: string[];
  notes: string;
  couleur?: string | null;
  visible: boolean;         // false = caché à tous (y compris en vue joueurs)
  auras: Aura[];
  drapeaux: DrapeauxTour;
  concentration: string | null;
  mouvementUtilise: number;
  vision: number;           // portée de vue en cases
  degats: string;           // formule, ex. "1d8+2"
  bonusAttaque?: number | null;
  initiative: number;
  persoId?: string | null;  // lien vers un personnage de la campagne
  portrait?: string | null; // adresse data: de l'image
}

export type FormeZone = 'cercle' | 'cone' | 'ligne' | 'carre' | 'rectangle' | 'polygone';

export interface Zone {
  id: number;
  categorie: 'sort' | 'terrain';
  forme: FormeZone;
  x: number;
  y: number;
  rayon: number;            // en cases (longueur pour ligne / rectangle)
  largeur?: number;         // rectangle
  angle: number;            // radians (cône, ligne, rectangle)
  couleur: string;
  nom: string;
  points?: Cellule[];       // polygone
  terrain?: string;         // id du type de terrain
  sortId?: number;
}

export interface TypeTerrain {
  id: string; nom: string; couleur: string; desc: string;
  motif: 'hachures' | 'croix' | 'vagues' | 'points';
  cout: number;             // coût de déplacement (999 = infranchissable)
  bloque: boolean;
  bloqueVue: boolean;
  antimagie?: boolean;
}

export type Effet =
  | { type: 'degats'; valeur: number; nature?: string }
  | { type: 'soin'; valeur: number }
  | { type: 'condition'; valeur: string; bonus?: boolean };

export interface Gabarit {
  id: number;
  nom: string;
  forme: Exclude<FormeZone, 'polygone'>;
  rayon: number;
  largeur?: number;
  portee: number;           // cases (0 = depuis le lanceur)
  origine: 'soi' | 'point';
  effets: Effet[];
  couleur: string;
  particule: string | null;
  concentration: boolean;
  desc: string;
  atelier?: boolean;        // venu de l'Atelier de tracé
  lanceurs?: string[];      // personnages de la campagne qui connaissent ce sort (persoId)
}

/** Modèle de créature (bibliothèque). */
export type Modele = Omit<Jeton, 'id' | 'x' | 'y' | 'conditions' | 'drapeaux' | 'concentration' | 'mouvementUtilise' | 'initiative' | 'visible' | 'pv'> & { pv?: number };

export interface LigneJournal { t: string; msg: string; cls: 'info' | 'degats' | 'soin' | 'cond' | 'init' | 'attaque' }

export interface EtatTable {
  version: 1;
  grille: Grille;
  jetons: Jeton[];
  zones: Zone[];
  sorts: Gabarit[];
  bibliotheque: Modele[];
  prochainId: number;
  prochaineZone: number;
  combat: { actif: boolean; round: number; tour: number; ordre: number[] };
  brouillard: { actif: boolean; cases: Record<string, true> };
  vision: boolean;            // la vue des PJ révèle le brouillard
  porteeDeplacement: boolean; // afficher la portée de déplacement en combat
  journal: LigneJournal[];
  fond?: { carte: string; pxCase?: number | null } | null;
  opacites: { carte: number; jetons: number; sorts: number; terrains: number };
  /** États supplémentaires apportés par des packs (en plus de la liste de base). */
  etatsSup?: string[];
}

export const cle = (c: Cellule | { x: number; y: number }): string =>
  Array.isArray(c) ? `${c[0]},${c[1]}` : `${c.x},${c.y}`;
export const depuisCle = (k: string): Cellule => k.split(',').map(Number) as Cellule;
