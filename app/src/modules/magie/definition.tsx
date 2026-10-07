import { lazy } from 'react';
import type { DefinitionModule } from '../../interface/types';
import { preparerCampagne } from './lien';

// Chargée à la demande (three.js et le module ne pèsent rien tant qu'on n'ouvre pas la page).
const Page = lazy(() => import('./Page').then((x) => ({ default: x.Page })));

export const definition: DefinitionModule = {
  id: 'magie', nom: 'Magie', etat: 'pret', besoinCampagne: true, dansMenu: true,
  icone: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5l1.4 2.9 3.1.4-2.3 2.2.6 3.1L12 14.6l-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z',
  Page, preparerCampagne,
};
