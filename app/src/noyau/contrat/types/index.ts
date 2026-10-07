// Types du format jdr-global v1. Référence : docs/format-jdr-global.md
// Les objets peuvent porter des champs inconnus : ils sont conservés tels quels au chargement.
// Découpé par domaine ; on importe toujours depuis ce fichier (ou depuis l'index du contrat).
export * from './base';
export * from './monde';
export * from './cartes';
export * from './personnages';
export * from './jeu';
export * from './campagne';
