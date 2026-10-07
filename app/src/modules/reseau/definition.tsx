import { lazy } from 'react';
import type { DefinitionModule } from '../../interface/types';
const Page = lazy(() => import('./Page').then((x) => ({ default: x.Page })));

export const definition: DefinitionModule = {
  id: 'reseau', nom: 'Réseau', etat: 'pret', besoinCampagne: true, dansMenu: true,
  icone: 'M12 5a2 2 0 1 0 0-.01M5 17a2 2 0 1 0 0-.01M19 17a2 2 0 1 0 0-.01M12 7l-6 8M12 7l6 8M7 17h10',
  Page,
};
