// Types de l'interface de la table : outil courant, réglages des outils, contrôleur partagé par les panneaux.
import type { Historique } from '../moteur/historique';
import type { EtatTable, FormeZone, Gabarit } from '../moteur/types';
import type { Particule } from '../rendu';

export type Outil = 'choisir' | 'zone' | 'terrain' | 'brouillard' | 'mesure' | 'attaque' | 'sort';
export type Onglet = 'jetons' | 'detail' | 'sorts' | 'des' | 'journal' | 'affichage';

export interface Ui {
  outil: Outil;
  onglet: Onglet;
  selection: number | null;
  zoneChoisie: number | null;
  zone: { forme: Exclude<FormeZone, 'polygone'>; rayon: number; largeur: number; couleur: string };
  terrain: { type: string; forme: 'cercle' | 'carre' | 'polygone'; rayon: number };
  brouillard: { reveler: boolean; rayon: number };
  attaque: 'melee' | 'distance';
  sort: { id: number; lanceur: number; angle: number } | null;
  sons: boolean;
}

export const UI_INITIALE: Ui = {
  outil: 'choisir', onglet: 'jetons', selection: null, zoneChoisie: null,
  zone: { forme: 'cercle', rayon: 3, largeur: 1, couleur: 'rgba(74,144,217,0.5)' },
  terrain: { type: 'difficile', forme: 'cercle', rayon: 2 },
  brouillard: { reveler: true, rayon: 1 },
  attaque: 'melee', sort: null, sons: false,
};

export const COULEURS_ZONE: [string, string][] = [
  ['rgba(74,144,217,0.5)', 'Bleu'], ['rgba(217,72,72,0.5)', 'Rouge'], ['rgba(69,168,74,0.5)', 'Vert'], ['rgba(155,89,182,0.5)', 'Violet'],
  ['rgba(230,126,34,0.5)', 'Orange'], ['rgba(0,188,212,0.5)', 'Cyan'], ['rgba(201,168,76,0.5)', 'Or'], ['rgba(30,30,50,0.7)', 'Ombre'],
];

export const NOMS_FORMES: Record<FormeZone, string> = {
  cercle: 'Cercle', cone: 'Cône', ligne: 'Ligne', carre: 'Carré', rectangle: 'Rectangle', polygone: 'Polygone',
};

export interface Controleur {
  etat: EtatTable;
  histo: Historique<EtatTable>;
  /** Applique une modification ; `fusionner` remplace le présent sans créer d'étape d'annulation. */
  faire: (f: (e: EtatTable) => EtatTable, fusionner?: boolean) => void;
  annuler: () => void;
  retablir: () => void;
  /** Remplace tout l'état (chargement de rencontre) et vide l'historique. */
  remplacer: (e: EtatTable) => void;
  ui: Ui;
  regler: (p: Partial<Ui>) => void;
  dire: (texte: string, sorte?: 'info' | 'succes' | 'erreur') => void;
  particules: Particule[];
  /** Démarre la visée d'un sort par le jeton choisi. */
  viser: (s: Gabarit) => void;
  lectureSeule: boolean;
}
