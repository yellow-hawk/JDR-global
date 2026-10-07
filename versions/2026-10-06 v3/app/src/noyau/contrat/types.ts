// Types du format jdr-global v1. Référence : docs/format-jdr-global.md
// Les objets peuvent porter des champs inconnus : ils sont conservés tels quels au chargement.

export const FORMAT = 'jdr-global';
export const VERSION = 1;

/** Types d'objets adressables par une référence. */
export type TypeObjet =
  | 'univers' | 'carte' | 'personnage' | 'sort' | 'rencontre'
  | 'quete' | 'seance' | 'fichier' | 'peuple' | 'famille';

/** Lien vers un autre objet de la campagne. */
export interface Ref { type: TypeObjet; id: string }

/** Date dans le calendrier du monde (inventé). */
export interface DateMonde { an: number; mois: number; jour: number }

/** Bloc secret : tout ce qui est sous `mj` disparaît de la vue joueurs. */
export type Secret = Record<string, unknown>;

export interface InfosCampagne {
  id: string;
  nom: string;
  regles: string;
  /** Monde par défaut de la campagne (univers enregistré depuis l'Atlas ou fait main). */
  univers?: Ref | null;
  creeLe: string;
  majLe: string;
  mj?: Secret;
}

export interface Peuple { id: string; nom: string; couleur?: string; desc?: string; mj?: Secret }

export interface Calendrier {
  joursParAn: number;
  mois: { nom: string; jours: number }[];
  /** mois : index dans `mois` ; jour : 1..jours du mois. */
  fetes: { nom: string; mois: number; jour: number; texte?: string }[];
}

/** Fiche d'un peuple / pays (tirée de l'Atlas, ou saisie à la main). */
export interface Civilisation {
  cle: number | string;
  nom: string;
  couleur?: string;
  style?: string;
  capitale?: string;
  villes: { nom: string; capitale?: boolean; desc?: string }[];
  regime?: string;
  regimeTexte?: string;
  /** Titres du souverain [masculin, féminin]. */
  titres?: string[];
  souverain?: string;
  fondateur?: string;
  ere?: string;
  ereTexte?: string;
  population?: string;
  populationN?: number;
  /** Année courante dans le calendrier de ce peuple. */
  anActuel?: number;
  traits: string[];
  coutumes: string[];
  croyance?: string;
  langue?: string;
  relations: { peuple: number | string; nom: string; sorte: string }[];
  histoire: { an: number; texte: string }[];
  calendrier?: Calendrier | null;
  /** Réserve de noms dans la langue de ce peuple (généalogies, PNJ). */
  noms: string[];
  mj?: Secret;
}

export interface Civilisations {
  peuples: Civilisation[];
  monde: { nom: string; soleils: string[]; lunes: { nom: string; periode: number }[]; jourHeures: number } | null;
}

export interface Univers {
  id: string;
  nom: string;
  sorte: 'genere' | 'fait-main';
  /** sorte "genere" : entrée SAVE de l'Atlas (format atlas-des-ciels v1), telle quelle. */
  atlas?: Record<string, unknown>;
  /** sorte "fait-main". */
  monde?: { carte?: Ref | null; peuples: Peuple[]; calendrier?: Calendrier | null };
  /** Monde fait main : ciel et système stellaire empruntés à l'Atlas. */
  cielAtlas?: Record<string, unknown> | null;
  /** Peuples et pays détaillés (Atlas : copiés à l'installation du monde). */
  civilisations?: Civilisations | null;
  mj?: Secret;
}

export interface Projection {
  sorte: 'equirectangulaire' | 'plate';
  lonMin: number; lonMax: number;
  latMin: number; latMax: number;
  remplissagePoles: 'glace' | 'ocean' | 'couleur';
}

export interface Repere {
  id: string;
  nom: string;
  x: number;
  y: number;
  sorte: string;
  lien?: Ref | null;
  desc?: string;
  mj?: Secret;
}

export interface Carte {
  id: string;
  nom: string;
  type: string;
  univers?: Ref | null;
  source: { sorte: 'import' | 'atlas' | 'generateur'; cle?: string; ref?: string };
  images: { joueurs: string | null; mj?: { image: string } };
  taille?: { l: number; h: number } | null;
  echelle?: { metresParPixel: number } | null;
  projection?: Projection | null;
  parent?: { carte: Ref; zone: [number, number, number, number] } | null;
  reperes: Repere[];
  grille?: { type: 'carree' | 'hex'; taille: number; decalage: [number, number] } | null;
  creeLe: string;
  majLe: string;
  mj?: Secret;
}

export type SortePersonnage = 'pj' | 'pnj' | 'allie' | 'ennemi' | 'neutre';

export interface Personnage {
  id: string;
  nom: string;
  joueur?: string;
  sorte: SortePersonnage;
  /** Rôle ou métier (« capitaine de la garde », « herboriste »…) : sert aux stats, aux sorts, aux organigrammes. */
  role?: string;
  peuple?: Ref | { atlas: string } | null;
  portrait?: string | null;
  /** Preset de l'Avatar (presetVersion 1), tel quel. */
  apparence?: Record<string, unknown> | null;
  /** ProfilPJ de l'Atelier de tracé, tel quel. */
  magie?: Record<string, unknown> | null;
  /** conditions : états en cours (Aveuglé, En feu…), reportés depuis la Table de combat. */
  combat: { regles: string; stats: Record<string, unknown>; conditions?: string[] };
  notes?: string;
  mj?: Secret;
}

export interface Sort {
  id: string;
  nom: string;
  /** Sceau de l'Atelier de tracé, tel quel. */
  sceau: Record<string, unknown>;
  categorie?: string;
  notes?: string;
  proprietaire?: Ref | null;
  /** Date de création (ms), reprise de l'Atelier. */
  cree?: number;
  mj?: Secret;
}

export interface Rencontre {
  id: string;
  nom: string;
  carte?: Ref | null;
  jetons: { perso: Ref; x: number; y: number; visible: boolean }[];
  terrain: Record<string, unknown>[];
  /** État complet de la table de combat (EtatTable du module Combat ; ancien format v7 accepté). */
  table?: Record<string, unknown> | null;
  /** Quête dont la rencontre fait partie (rencontres préparées automatiquement). */
  quete?: Ref | null;
  mj?: Secret;
}

export type StatutQuete = 'a-venir' | 'en-cours' | 'terminee' | 'abandonnee';

export interface EtapeQuete {
  titre: string;
  lieu?: string;
  /** Ce que les joueurs vivent / savent. */
  joueurs: string;
  mj?: Secret;
}

export interface Quete {
  id: string;
  titre: string;
  source: { sorte: 'atlas' | 'fait-main'; cle?: string };
  /** principale, secondaire, annexe… (liste ouverte) */
  sorte?: string;
  statut?: StatutQuete;
  univers?: Ref | null;
  resume?: string;
  /** Lieux nommés en texte (quêtes de l'Atlas) ; `lieux` garde les liens vers des cartes. */
  lieuxTexte?: string[];
  lieux: Ref[];
  personnages: Ref[];
  etapes?: EtapeQuete[];
  recompenses?: string[];
  mj?: Secret;
}

/** Membre d'un arbre généalogique : fiche légère, éventuellement liée à un vrai personnage. */
export interface MembreFamille {
  id: string;
  nom: string;
  sexe: 'f' | 'm' | '?';
  naissance?: number | null;   // année dans le calendrier du peuple
  mort?: number | null;
  /** Titre (« la reine », « le Grand Astrologue »…) ; regne : années de règne pour une dynastie. */
  titre?: string;
  regne?: [number, number] | null;
  role?: string;
  persoId?: string | null;
  parents: string[];           // ids de membres (0 à 2)
  conjoints: string[];
  notes?: string;
  mj?: Secret;
}

export interface Famille {
  id: string;
  nom: string;
  sorte: 'famille' | 'dynastie';
  univers?: Ref | null;
  /** Peuple (clé de civilisation) dont la famille tire ses noms. */
  peuple?: number | string | null;
  membres: MembreFamille[];
  /** Membre de départ (le personnage dont on a généré la famille, ou le fondateur). */
  racine?: string | null;
  mj?: Secret;
}

export interface Seance {
  id: string;
  numero: number;
  date: string;
  dateMonde?: DateMonde | null;
  resume?: string;
  liens: Ref[];
  mj?: Secret;
}

export interface Fichier { id: string; nom: string; mime: string; octets: number }

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
  /** Réglages propres à chaque module, rangés par id de module (ex. modules.magie.exemplesRetires). */
  modules?: Record<string, Record<string, unknown>>;
}

/** Noms des collections de la racine, dans l'ordre du format. */
export const COLLECTIONS = [
  'univers', 'cartes', 'personnages', 'sorts', 'rencontres', 'quetes', 'seances', 'fichiers', 'familles',
] as const;
export type NomCollection = typeof COLLECTIONS[number];

/** Type d'objet porté par chaque collection. */
export const TYPE_DE_COLLECTION: Record<NomCollection, TypeObjet> = {
  univers: 'univers', cartes: 'carte', personnages: 'personnage', sorts: 'sort',
  rencontres: 'rencontre', quetes: 'quete', seances: 'seance', fichiers: 'fichier', familles: 'famille',
};
