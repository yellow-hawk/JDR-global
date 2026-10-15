// API publique du module « Magie ». Voir MODULE.md.
export { definition } from './definition';
// Pour les autres modules (Combat, Personnages) : moteur de l'Atelier, sans interface.
export { analyser } from './atelier/engine/analyse';
export { decrire, valeurs } from './atelier/engine/effets';
export { svgSceau } from './atelier/engine/impression';
export type { Sceau, SortEnregistre } from './atelier/engine/types';
export { profilDe, aUneMagie, grimoireMjComplet, integrerGrimoireDeBase, donnerSortsAuxPnj, sortsPourRole, preparerCampagne } from './lien';
export { GRIMOIRE_DE_BASE } from './atelier/data/grimoire';
export { PanneauTrace, type SortTrace } from './PanneauTrace';
export type { ProfilPJ } from './atelier/engine/profils';
/* Pour la Table de combat : sceau tracé par un joueur pendant son tour (lecture, effet 3D) et vues à réutiliser. */
export { lireTracePartage, effetDe, estReponseTrace, type DemandeTrace, type ReponseTrace, type EffetTrace } from './partage';
export { VueTrace, VueEffet } from './vues';
export { STAGE } from './atelier/components/SceauSVG';
/* Pour le module Joueurs : zone d'entraînement sur l'écran d'un joueur. */
export { appliquerEntrainement, DROITS_PAR_DEFAUT, type DonneesEntrainement, type DroitsEntrainement } from './entrainement';
export { magieDepuisProfil } from './lien';
