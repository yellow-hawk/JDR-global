// Interface d'un système de règles. Le reste de l'application ne connaît que cette interface :
// changer de système = écrire un nouveau dossier à côté de dnd5e/ et l'enregistrer.

/** Description d'un champ de statistique, pour générer les formulaires automatiquement. */
export interface ChampStat {
  cle: string;               // chemin dans stats, ex. "pv" ou "carac.for"
  libelle: string;
  sorte: 'nombre' | 'texte' | 'formule';
  groupe?: string;           // regroupement à l'affichage ("Défense", "Caractéristiques"…)
  min?: number;
  max?: number;
  /** Visible dans la vue joueurs pour un ennemi ? (les PJ voient toujours leurs stats) */
  publicEnnemi?: boolean;
}

/** Ce qu'on sait d'un PNJ pour lui donner des statistiques cohérentes. */
export interface ProfilPnj {
  role?: string;          // « capitaine de la garde », « herboriste »…
  description?: string;   // apparence, humeur, notes
  sorte?: string;         // pj, pnj, allie, ennemi, neutre
  antagoniste?: boolean;
  graine: string;         // même graine → mêmes stats
}

export interface SystemeRegles {
  id: string;
  nom: string;
  champs: ChampStat[];
  statsParDefaut(): Record<string, unknown>;
  /** Statistiques tirées du rôle et de l'histoire d'un PNJ (déterministe). */
  statsPourProfil(p: ProfilPnj): Record<string, unknown>;
  /** Résumé court affiché sur les fiches et jetons, ex. "PV 52/52 · CA 18". */
  resume(stats: Record<string, unknown>): string;
  /** Formule d'initiative à partir des stats, ex. "1d20+2". */
  initiative(stats: Record<string, unknown>): string;
  /** Dégâts (ou soins) d'un sort de l'Atelier selon sa puissance 1..12 : formule et valeur moyenne. */
  degatsSort(puissance: number): { formule: string; moyenne: number };
  /** Caractéristiques au format de la Table de combat v7 (for, dex… → str, dex…). */
  versTable(stats: Record<string, unknown>): Record<string, number | string>;
  /** Retour de la Table de combat : stats mises à jour à partir d'un jeton (PV restants…). */
  depuisTable(stats: Record<string, unknown>, jeton: Record<string, unknown>): Record<string, unknown>;
}
