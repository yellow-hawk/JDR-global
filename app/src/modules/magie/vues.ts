// Vues de l'écran joueurs réutilisées ailleurs (Table de combat), chargées à la demande : three.js n'est chargé
// qu'au moment de montrer l'effet 3D.
import { lazy } from 'react';

export const VueTrace = lazy(() => import('./joueurs/Trace'));
export const VueEffet = lazy(() => import('./joueurs/Effet'));
export const VueEntrainement = lazy(() => import('./joueurs/Entrainement'));
