// API publique du module « Magie ». Voir MODULE.md.
export { definition } from './definition';
// Pour les autres modules (Combat, Personnages) : moteur de l'Atelier, sans interface.
export { analyser } from './atelier/engine/analyse';
export { decrire, valeurs } from './atelier/engine/effets';
export { svgSceau } from './atelier/engine/impression';
export type { Sceau, SortEnregistre } from './atelier/engine/types';
export { profilDe, aUneMagie, grimoireMjComplet, integrerGrimoireDeBase, donnerSortsAuxPnj, sortsPourRole, preparerCampagne } from './lien';
export { GRIMOIRE_DE_BASE } from './atelier/data/grimoire';
