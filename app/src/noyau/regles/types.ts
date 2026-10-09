// Interface d'un système de règles. Le reste de l'application ne connaît que cette interface :
// changer de système = écrire un nouveau dossier à côté de dnd5e/ et l'enregistrer.
import type { Personnage } from '../contrat';

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

/** Une valeur calculée de la fiche (modificateur, compétence, CA…), avec le détail de son calcul. */
export interface ValeurCalculee {
  cle: string;
  libelle: string;
  valeur: number;
  /** Affichage (« +3 », « 16 »). */
  texte: string;
  /** 0 = aucune, 1 = maîtrise, 2 = expertise. */
  maitrise?: number;
  /** Caractéristique utilisée (« dex »). */
  carac?: string;
  /** Explication (« 11 armure de cuir + 3 DEX »). */
  detail?: string;
}

export interface AttaqueCalculee { nom: string; bonus: number; degats: string; portee?: string; proprietes?: string[] }

/** Tout ce que la fiche affiche sans saisie : calculé à partir des stats, des maîtrises, de l'équipement et des effets. */
export interface FicheCalculee {
  niveau: number;
  bonusMaitrise?: number;
  caracs: ValeurCalculee[];
  sauvegardes: ValeurCalculee[];
  competences: ValeurCalculee[];
  /** CA, initiative, perception passive, vitesse, encombrement… */
  derives: ValeurCalculee[];
  attaques: AttaqueCalculee[];
  /** Valeurs à reporter dans `combat.stats` (CA, dégâts, bonus d'attaque, niveau) quand la fiche les détermine. */
  stats: Record<string, unknown>;
}

/** Entrée d'un catalogue (arme, armure, historique, langue…). `avatar` : option de l'avatar 3D portée avec l'objet ("arme:epee"). */
export interface EntreeCatalogue {
  id: string;
  nom: string;
  sorte: string;
  poids?: number;
  prix?: string;
  avatar?: string;
  [cle: string]: unknown;
}

/** Données de référence d'un système : listes proposées par la fiche (tout est facultatif). */
export interface CatalogueRegles {
  competences: { id: string; libelle: string; carac: string }[];
  caracs: { id: string; libelle: string }[];
  objets: EntreeCatalogue[];
  alignements: string[];
  langues: string[];
  historiques: { id: string; nom: string; competences?: string[]; texte?: string }[];
  monnaies: { id: string; libelle: string }[];
  /** Mention de la source des données (licence). */
  source?: string;
}

/** Extension facultative d'un système : fiche détaillée calculée. */
export interface SystemeAvecFiche extends SystemeRegles {
  catalogue: CatalogueRegles;
  calculer(p: Personnage): FicheCalculee;
}

export const aUneFiche = (R: SystemeRegles): R is SystemeAvecFiche =>
  typeof (R as Partial<SystemeAvecFiche>).calculer === 'function' && !!(R as Partial<SystemeAvecFiche>).catalogue;
