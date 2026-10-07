// Ce qui se joue : sorts, rencontres, quêtes, séances, chronologie, documents.
import type { DateMonde, Ref, Secret } from './base';

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
