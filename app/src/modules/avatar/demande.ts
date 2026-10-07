// Demande d'ouverture de l'Avatar pour un personnage précis (posée par le module Personnages).
let demande: string | null = null;

/** À appeler avant de naviguer vers « avatar ». */
export function ouvrirAvatarPour(idPersonnage: string): void { demande = idPersonnage; }

/** Lue une seule fois par la page Avatar. */
export function prendreDemande(): string | null { const d = demande; demande = null; return d; }
