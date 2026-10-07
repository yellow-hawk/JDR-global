import type { DefinitionModule } from '../../interface/types';
import { Page } from './Page';

export const definition: DefinitionModule = {
  id: 'organigrammes', nom: 'Organigrammes', etat: 'pret', besoinCampagne: true, dansMenu: true,
  icone: 'M9 3h6v4H9zM3 17h6v4H3zM15 17h6v4h-6zM12 7v5M6 12h12M6 12v5M18 12v5',
  Page,
};
