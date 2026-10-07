// API publique du module « Combat ». Voir MODULE.md.
export { definition } from './definition';
export { gabarit, jetonDepuisPersonnage, METRES_PAR_CASE, tableDepuisPlan, packsDeLaCampagne, type PreparationTable } from './logique';
export { BIBLIOTHEQUE_DE_BASE } from './moteur';
export { lireEtat, nouvelEtat } from './moteur';
export type { EtatTable } from './moteur';
