// API publique du module « Cartes ». Voir MODULE.md.
export { definition } from './definition';
export { TYPES_CARTE, libelleType, ajouterCarte, pixelsParCase } from './logique';
export { enregistrerImageCarte } from './enregistrer';
export { choisirCarte, genererPlan, libelleChoix, rectanglesTerrain, imagePlan, PX_CASE, type LieuQuete, type Choix, type PlanBataille } from './generateur';
