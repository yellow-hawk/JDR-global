import { lazy } from 'react';
import type { DefinitionModule } from '../../interface/types';
const Page = lazy(() => import('./Page').then((x) => ({ default: x.Page })));

export const definition: DefinitionModule = {
  id: 'livre', nom: 'Livre (PDF)', etat: 'pret', besoinCampagne: true, dansMenu: true,
  icone: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7M8 11h5',
  Page,
};
