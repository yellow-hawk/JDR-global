// Plans de cartes de bataille : une grille de cases typées, des pièces, des positions de départ.
// Pur et sérialisable (aucun canevas ici). Le rendu en image est dans rendu.ts.

/** Ce qu'il y a sur une case. L'ordre sert d'index dans les tableaux ; ne pas réordonner. */
export const CASES = ['vide', 'sol', 'mur', 'porte', 'eau', 'arbre', 'rocher', 'meuble', 'colonne', 'escalier', 'chemin', 'gue'] as const;
export type Case = typeof CASES[number];
export const C = Object.fromEntries(CASES.map((n, i) => [n, i])) as Record<Case, number>;

export type Theme = 'donjon' | 'interieur' | 'exterieur';
/** Palette de rendu (sol et couleurs). */
export type Ambiance = 'pierre' | 'crypte' | 'grotte' | 'mine' | 'bois' | 'marbre' | 'herbe' | 'foret' | 'sable' | 'neige' | 'marais' | 'roche';

export interface Piece { x: number; y: number; l: number; h: number; nom: string }

export interface PlanBataille {
  titre: string;
  theme: Theme;
  ambiance: Ambiance;
  largeur: number;
  hauteur: number;
  /** cases[y * largeur + x] = index dans CASES. */
  cases: number[];
  pieces: Piece[];
  /** Cases de départ des PJ, puis des adversaires. */
  depart: [number, number][];
  ennemis: [number, number][];
  graine: string;
}

export interface OptionsDonjon { largeur?: number; hauteur?: number; pieces?: number; ambiance?: 'pierre' | 'crypte' | 'grotte' | 'mine' }
export type SorteInterieur = 'taverne' | 'temple' | 'palais' | 'maison' | 'tour' | 'fort' | 'entrepot' | 'bibliotheque';
export type SorteExterieur = 'plaine' | 'foret' | 'route' | 'gue' | 'ruines' | 'camp' | 'desert' | 'neige' | 'marais' | 'cercle' | 'cratere' | 'cote';

export const get = (p: { largeur: number; hauteur: number; cases: number[] }, x: number, y: number): number =>
  x < 0 || y < 0 || x >= p.largeur || y >= p.hauteur ? C.vide : p.cases[y * p.largeur + x];
export const set = (p: { largeur: number; cases: number[] }, x: number, y: number, v: number): void => { p.cases[y * p.largeur + x] = v; };
export const franchissable = (v: number): boolean => v === C.sol || v === C.porte || v === C.chemin || v === C.gue || v === C.escalier;
