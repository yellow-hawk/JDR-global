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

/** Aptitude d'une classe, d'une sous-classe ou d'un peuple ; `effets` appliqués automatiquement. */
export interface AptitudeRegles { niveau: number; nom: string; texte: string; effets?: import('../contrat').Effet[]; amelioration?: boolean }

export interface ClasseRegles {
  id: string; nom: string; texte?: string;
  deVie: number;
  principales: string[];
  sauvegardes: string[];
  competences: { choix: number; parmi: string[] };
  maitrises: { armes: string[]; armures: string[] };
  /** Équipement de départ (refs du catalogue). */
  equipement: string[];
  aptitudes: AptitudeRegles[];
  niveauSousClasse: number;
  sousClasses: { id: string; nom: string; aptitudes: AptitudeRegles[] }[];
  incantation?: { carac: string; type: 'complet' | 'demi' | 'pacte' };
}

export interface PeupleRegles {
  id: string; nom: string;
  bonus: Record<string, number>;
  /** Points de caractéristique à répartir librement (+1 chacun). */
  bonusLibres?: number;
  vitesse: number; taille: string; vision: number;
  langues: string[]; languesLibres?: number;
  competences?: string[]; competencesLibres?: number;
  traits: { nom: string; texte: string; effets?: import('../contrat').Effet[] }[];
  /** Nom de peuple donné à l'avatar automatique (oreilles d'elfe, stature des nains…). */
  avatar?: string;
}

export interface IncantationCalculee { classe: string; carac: string; dd: number; attaque: number }

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
  /** Aptitudes actives (classes, sous-classes, peuple), dans l'ordre des niveaux. */
  aptitudes?: (AptitudeRegles & { source: string })[];
  incantation?: IncantationCalculee[];
  /** Emplacements de sorts par niveau de sort (index 0 = niveau 1) ; pacte d'occultiste à part. */
  emplacements?: number[];
  pacte?: { nombre: number; niveau: number } | null;
  /** PV maximum suggérés (dé de vie maximal au niveau 1, moyenne ensuite, CON et bonus par niveau). */
  pvMaxSuggere?: number;
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
  classes: ClasseRegles[];
  peuples: PeupleRegles[];
  /** Mention de la source des données (licence). */
  source?: string;
}

/** Choix de l'assistant de création (ou tirés au hasard). `caracs` : valeurs de base, avant les bonus du peuple. */
export interface ChoixCreation {
  nom: string;
  feminin?: boolean;
  espece?: string;
  classe?: string;
  sousClasse?: string;
  niveau: number;
  historique?: string;
  caracs: Record<string, number>;
  /** Caractéristiques recevant les +1 libres du peuple (demi-elfe). */
  bonusLibres?: string[];
  competences?: string[];
  alignement?: string;
  personnalite?: { traits?: string; ideaux?: string; liens?: string; defauts?: string };
  /** Équipement de départ de la classe. */
  equipement?: boolean;
}

export interface OptionsAleatoire {
  nom?: string; feminin?: boolean; espece?: string; classe?: string; niveau?: number;
  /** Rôle d'un PNJ (« capitaine de la garde ») : oriente la classe. */
  role?: string;
  methode?: 'standard' | 'tirage';
}

/** Création de personnage propre au système. */
export interface CreationRegles {
  tableauStandard: number[];
  achat: { points: number; cout(v: number): number | undefined };
  tirage(graine: string): number[];
  aleatoire(graine: string, options?: OptionsAleatoire): ChoixCreation;
  creer(choix: ChoixCreation): { nom: string; stats: Record<string, unknown>; fiche: import('../contrat').FichePersonnage };
}

/** Ce qu'apporte un nouveau niveau dans une classe. */
export interface NouveautesNiveau {
  classe: string; niveau: number;
  aptitudes: AptitudeRegles[];
  /** Amélioration de caractéristiques (ou don) à ce niveau. */
  amelioration: boolean;
  /** Choix de sous-classe à ce niveau. */
  sousClasse: { id: string; nom: string }[] | null;
  deVie: number;
}

export interface ProgressionRegles {
  xpNiveaux: number[];
  niveauPourXp(xp: number): number;
  /** XP rapportée par un adversaire vaincu de ce niveau (ou facteur de puissance). */
  xpAdversaire(niveau: number): number;
  /** PV gagnés : moyenne (arrondie au-dessus) ou jet du dé de vie, + modificateur de CON (minimum 1). */
  gainPv(classe: string, modCon: number, jet?: number): number;
  nouveautes(classe: string, niveau: number): NouveautesNiveau | null;
}

/** Extension facultative d'un système : fiche détaillée calculée et création de personnage. */
export interface SystemeAvecFiche extends SystemeRegles {
  catalogue: CatalogueRegles;
  calculer(p: Personnage): FicheCalculee;
  creation: CreationRegles;
  progression: ProgressionRegles;
}

export const aUneFiche = (R: SystemeRegles): R is SystemeAvecFiche =>
  typeof (R as Partial<SystemeAvecFiche>).calculer === 'function' && !!(R as Partial<SystemeAvecFiche>).catalogue;
