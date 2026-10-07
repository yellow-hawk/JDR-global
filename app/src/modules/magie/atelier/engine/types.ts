/** Un signe placé autour du Cœur. angle en degrés : 0 = haut de la feuille, sens horaire. */
export interface Placement {
  id: string;
  angle: number;
  inv: boolean;
  /** score de reconnaissance (tracé libre), 0..1 */
  score?: number;
}

export type Taille = 1 | 2 | 3;

export interface Sceau {
  coeur: { id: string; inv: boolean; score?: number } | null;
  rameaux: Placement[];
  noeuds: Placement[];
  /** 1 petit, 2 moyen, 3 grand */
  taille: Taille;
  /** angle de l'entaille si la cerne est ouverte, sinon null */
  entaille: number | null;
  /** cerne absente (tracé libre en cours) */
  sansCerne?: boolean;
  /** mesures du tracé libre */
  trace?: { nettete: number; rondeur: number; illisibles: number };
  /** Double cerne : signes tracés entre la cerne et une 2ᵉ cerne extérieure. Leurs formes s'ajoutent au sort. */
  couronne?: { rameaux: Placement[]; noeuds: Placement[] } | null;
  /** Sceau fendu : la cerne est coupée en deux moitiés (axe en degrés) ; actif seulement quand elles se rejoignent. */
  fendu?: { axe: number } | null;
  /** Greffe : un second sceau relié par un trait ; les deux sorts se combinent. */
  greffe?: Sceau | null;
}

export const sceauVide = (): Sceau => ({ coeur: null, rameaux: [], noeuds: [], taille: 2, entaille: null });

export interface SortEnregistre {
  id: string;
  nom: string;
  notes: string;
  sceau: Sceau;
  cree: number;
  categorie?: string;
  exemple?: boolean;
}
