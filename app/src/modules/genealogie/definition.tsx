import { lazy } from 'react';
import type { DefinitionModule } from '../../interface/types';
const Page = lazy(() => import('./Page').then((x) => ({ default: x.Page })));

export const definition: DefinitionModule = {
  id: 'genealogie', nom: 'Généalogie', etat: 'pret', besoinCampagne: true, dansMenu: true,
  icone: 'M12 3v5M6 13V9h12v4M6 13a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM18 13a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 3a2 2 0 1 0 0 .01M6 17v4M18 17v4',
  Page,
};
