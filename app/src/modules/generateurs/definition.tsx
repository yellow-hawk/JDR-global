import type { DefinitionModule } from '../../interface/types';
import { Page } from './Page';

export const definition: DefinitionModule = {
  id: 'generateurs', nom: 'Générateurs', etat: 'pret', besoinCampagne: true, dansMenu: true,
  icone: 'M12 2l2.4 5 5.6.8-4 3.9.9 5.5L12 14.6 7.1 17.2l.9-5.5-4-3.9 5.6-.8zM5 21h14',
  Page,
};
