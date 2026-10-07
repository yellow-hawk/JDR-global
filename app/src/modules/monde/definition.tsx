import { lazy } from 'react';
import type { DefinitionModule } from '../../interface/types';

// Chargée à la demande (three.js et le module ne pèsent rien tant qu'on n'ouvre pas la page).
const Page = lazy(() => import('./Page').then((x) => ({ default: x.Page })));

export const definition: DefinitionModule = {
  id: 'monde', nom: 'Monde', etat: 'pret', besoinCampagne: true, dansMenu: true,
  icone: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18',
  Page,
};
