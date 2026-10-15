import { lazy } from 'react';
import type { DefinitionModule } from '../../interface/types';
const Page = lazy(() => import('./Page').then((x) => ({ default: x.Page })));

export const definition: DefinitionModule = {
  id: 'ecrans', nom: 'Écrans', etat: 'pret', besoinCampagne: true, dansMenu: true,
  icone: 'M3 4h8v6H3zM13 4h8v6h-8zM3 14h8v6H3zM13 14h8v6h-8z',
  Page,
};
