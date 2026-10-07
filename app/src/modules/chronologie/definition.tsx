import type { DefinitionModule } from '../../interface/types';
import { EnTete } from './EnTete';
import { Page } from './Page';

export const definition: DefinitionModule = {
  id: 'chronologie', nom: 'Chronologie', etat: 'pret', besoinCampagne: true, dansMenu: true,
  icone: 'M12 7v5l3 2M12 3a9 9 0 1 0 0.01 0M3 21h18',
  Page,
  enTete: EnTete,
};
