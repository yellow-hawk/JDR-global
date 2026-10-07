import type { DefinitionModule } from '../../interface/types';
import { Page } from './Page';

export const definition: DefinitionModule = {
  id: 'combat', nom: 'Combat', etat: 'pret', besoinCampagne: true, dansMenu: true,
  icone: 'M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M9.5 17.5 21 6V3h-3L6.5 14.5M11 19l-6-6M8 16l-4 4',
  Page,
};
