// Univers, peuples, calendriers et civilisations.
import type { Ref, Secret } from './base';

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
