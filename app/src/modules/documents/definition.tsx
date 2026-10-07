import { lazy } from 'react';
import type { DefinitionModule } from '../../interface/types';
const Page = lazy(() => import('./Page').then((x) => ({ default: x.Page })));

export const definition: DefinitionModule = {
  id: 'documents', nom: 'Documents', etat: 'pret', besoinCampagne: true, dansMenu: true,
  icone: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h4',
  Page,
};
