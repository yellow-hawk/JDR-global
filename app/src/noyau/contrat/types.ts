// Types du format jdr-global v1. Référence : docs/format-jdr-global.md
// Les objets peuvent porter des champs inconnus : ils sont conservés tels quels au chargement.

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

export interface InfosCampagne {
  id: string;
  nom: string;
  regles: string;
  /** Monde par défaut de la campagne (univers enregistré depuis l'Atlas ou fait main). */
  univers?: Ref | null;
  /** Horloge du temps de jeu. */
  temps?: TempsMonde | null;
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
  /** Réputation du groupe des PJ auprès de ce peuple, de −100 à +100 (absent = 0). */
  reputation?: number;
  /** Historique des changements de réputation. */
  reputationJournal?: { quand: string; delta: number; raison: string }[];
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
  /** Brouillard de guerre : traits de pinceau (pixels de l'image) appliqués dans l'ordre sur une carte d'abord couverte. */
  brouillard?: Brouillard | null;
  creeLe: string;
  majLe: string;
  mj?: Secret;
}

export interface Brouillard {
  actif: boolean;
  /** revele : true = efface le brouillard, false = le remet. */
  traits: { x: number; y: number; r: number; revele: boolean }[];
}

/** Lien d'un personnage vers un autre (allié, rival, dette…). `mj: { cache: true }` = lien secret. */
export interface RelationPersonnage { vers: Ref; sorte: string; texte?: string; mj?: Secret }

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
  /** Liens vers d'autres personnages (affichés et modifiables dans le Réseau). */
  relations?: RelationPersonnage[];
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
  /** Effets sur la réputation, appliqués une fois quand la quête passe à « terminée ». */
  reputation?: { univers: string; peuple: number | string; delta: number }[];
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

/** Événement de la chronologie (fait main, ou noté pendant une séance). */
export interface Evenement {
  id: string;
  titre: string;
  date: DateMonde;
  texte?: string;
  /** Catégorie libre (bataille, rencontre, mort, découverte…). */
  sorte?: string;
  liens: Ref[];
  mj?: Secret;
}

/** Document à montrer aux joueurs (lettre, affiche, indice, image). Caché (`mj.cache`) tant qu'il n'a pas été montré. */
export interface DocumentJoueurs {
  id: string;
  titre: string;
  sorte: 'texte' | 'image';
  texte?: string;
  /** Identifiant du fichier image (sorte « image », ou illustration d'un texte). */
  image?: string | null;
  /** Habillage : parchemin, lettre, affiche, note. */
  style?: string;
  lien?: Ref | null;
  /** Date (réelle) où il a été montré pour la première fois. */
  montreLe?: string | null;
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
  /** Événements de la chronologie. */
  evenements: Evenement[];
  /** Documents à montrer aux joueurs. */
  documents: DocumentJoueurs[];
  /** Réglages propres à chaque module, rangés par id de module (ex. modules.magie.exemplesRetires). */
  modules?: Record<string, Record<string, unknown>>;
}

/** Noms des collections de la racine, dans l'ordre du format. */
export const COLLECTIONS = [
  'univers', 'cartes', 'personnages', 'sorts', 'rencontres', 'quetes', 'seances', 'fichiers', 'familles',
  'evenements', 'documents',
] as const;
export type NomCollection = typeof COLLECTIONS[number];

/** Type d'objet porté par chaque collection. */
export const TYPE_DE_COLLECTION: Record<NomCollection, TypeObjet> = {
  univers: 'univers', cartes: 'carte', personnages: 'personnage', sorts: 'sort',
  rencontres: 'rencontre', quetes: 'quete', seances: 'seance', fichiers: 'fichier', familles: 'famille',
  evenements: 'evenement', documents: 'document',
};
