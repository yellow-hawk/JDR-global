import type { DefinitionModule } from '../../interface/types';
import { EnTete } from './EnTete';
import { Page } from './Page';

export const definition: DefinitionModule = {
  id: 'campagne', nom: 'Campagne', etat: 'pret', besoinCampagne: false, dansMenu: true,
  icone: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4zM5 17a3 3 0 0 1 3-3h11M9 8h6',
  Page,
  enTete: EnTete,
};
