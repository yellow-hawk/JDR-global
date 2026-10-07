import { lazy } from 'react';
import type { DefinitionModule } from '../../interface/types';

// Chargée à la demande (three.js et le module ne pèsent rien tant qu'on n'ouvre pas la page).
const Page = lazy(() => import('./Page').then((x) => ({ default: x.Page })));

export const definition: DefinitionModule = {
  id: 'avatar', nom: 'Avatar 3D', etat: 'pret', besoinCampagne: true, dansMenu: true,
  icone: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  Page,
};
