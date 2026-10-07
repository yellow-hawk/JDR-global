// Cartes, repères, projection et brouillard.
import type { Ref, Secret } from './base';

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
