// Personnages, relations et familles.
import type { Ref, Secret } from './base';

/** Lien d'un personnage vers un autre (allié, rival, dette…). `mj: { cache: true }` = lien secret. */
export interface RelationPersonnage { vers: Ref; sorte: string; texte?: string; mj?: Secret }

export type SortePersonnage = 'pj' | 'pnj' | 'allie' | 'ennemi' | 'neutre';

/** Effet chiffré d'un objet, d'un talent ou d'une aptitude : `cible` = chemin compris par le système de règles
 * (5e : "ca", "carac.for", "competence.perception", "sauvegarde.dex", "vitesse", "pvMax", "initiative", "attaque", "degats"). */
export interface Effet { cible: string; valeur: number; texte?: string }

/** Objet porté ou transporté. `ref` : entrée du catalogue des règles (ex. "arme:epee-longue", "armure:cotte-de-mailles"). */
export interface ObjetInventaire {
  id: string;
  nom: string;
  ref?: string | null;
  quantite: number;
  /** Poids unitaire (kg). */
  poids?: number;
  equipe?: boolean;
  harmonise?: boolean;
  description?: string;
  effets?: Effet[];
  mj?: Secret;
}

export interface ClasseNiveau { id: string; niveau: number; sousClasse?: string | null }

/** Fiche détaillée, commune aux systèmes de règles. Les valeurs de règles (PV, CA, caractéristiques…) restent dans `combat.stats`. */
export interface FichePersonnage {
  identite?: {
    age?: string; genre?: string; taille?: string; poids?: string; yeux?: string; cheveux?: string;
    alignement?: string; divinite?: string; historique?: string; origine?: string; langues?: string[];
  };
  personnalite?: { traits?: string; ideaux?: string; liens?: string; defauts?: string };
  progression?: {
    classes?: ClasseNiveau[];
    xp?: number;
    journalXp?: { quand: string; gain: number; raison: string }[];
    /** Talents acquis (ids des nœuds des arbres de talents). */
    talents?: string[];
    /** Aptitudes ou dons notés à la main. */
    aptitudes?: { nom: string; texte?: string; effets?: Effet[] }[];
  };
  /** Maîtrises : compétences (1 = maîtrise, 2 = expertise), jets de sauvegarde, armes, armures, outils. */
  maitrises?: { competences?: Record<string, number>; sauvegardes?: string[]; armes?: string[]; armures?: string[]; outils?: string[] };
  inventaire?: { objets: ObjetInventaire[]; monnaie?: Record<string, number> };
  defense?: { pvTemp?: number; desVie?: number; resistances?: string; immunites?: string; vulnerabilites?: string; mortSucces?: number; mortEchecs?: number };
  /** Journal du personnage (souvenirs, événements marquants). */
  journal?: { quand: string; texte: string; mj?: Secret }[];
}

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
  /** Fiche détaillée : identité, personnalité, progression, maîtrises, inventaire, défense, journal. */
  fiche?: FichePersonnage;
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
