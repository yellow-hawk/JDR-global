// API du sous-module de rendu (canevas 2D).
export * from './camera';
export * from './visibilite';
export { dessinerScene, echelleFond, type Fond, type Scene } from './dessin';
export type { Apercu } from './apercus';
export { emettre as emettreParticules, avancer as avancerParticules, PARTICULES, type Particule } from './particules';
export { imageJoueurs, dessinerImageJoueurs, TAILLE_IMAGE_JOUEURS } from './imageJoueurs';
export { COULEUR_CAMP, avecAlpha } from './peintre';
