import { lazy } from 'react';
import type { DefinitionModule } from '../../interface/types';
const Page = lazy(() => import('./Page').then((x) => ({ default: x.Page })));

export const definition: DefinitionModule = {
  id: 'pays', nom: 'Pays', etat: 'pret', besoinCampagne: true, dansMenu: true,
  icone: 'M4 4h16v16H4zM4 10h16M10 4v16M14 14l2 2',
  Page,
};
