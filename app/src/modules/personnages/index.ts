// API publique du module « Personnages ». Voir MODULE.md.
export { definition } from './definition';
export { SORTES, libelleSorte, campJoueurs, sceneJoueurs } from './logique';
export { genererLot } from './creation/logique';
export { ficheCorpsHtml, FICHE_CSS } from './impression';
export { arbreTalentsSvg } from './talents/impression';
export { arbresDeCampagne } from './talents/EditeurTalents';
export { RELATIONS, sorteRelation, ajouterRelation, retirerRelation, relationsDe, type SorteRelation, type RelationVue } from './relations';
