// Personnages, relations et familles.
import type { Ref, Secret } from './base';

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
