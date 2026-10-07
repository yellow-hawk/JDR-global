// Graphes génériques (nœuds + liens) et arbres : types partagés par les algorithmes et les vues.
export interface Noeud { id: string; libelle: string; sorte: string; taille?: number; couleur?: string; infos?: string; donnees?: unknown }
export interface Lien { de: string; vers: string; sorte?: string; oriente?: boolean; poids?: number }
export interface Graphe { noeuds: Noeud[]; liens: Lien[] }

export interface NoeudArbre { id: string; libelle: string; sousTitre?: string; sorte?: string; couleur?: string; enfants: NoeudArbre[]; donnees?: unknown }
export interface Position { x: number; y: number }
