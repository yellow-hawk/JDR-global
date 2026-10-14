import { lazy } from 'react';
import type { DefinitionModule } from '../../interface/types';
import { Synchro } from './Synchro';
const Page = lazy(() => import('./Page').then((x) => ({ default: x.Page })));

export const definition: DefinitionModule = {
  id: 'joueurs', nom: 'Joueurs', etat: 'pret', besoinCampagne: true, dansMenu: true,
  icone: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a7 7 0 0 1 14 0v1M19 8h4M21 6v4',
  Page,
  // En-tête : synchronisation des joueurs à distance (fiches, messages, notes) et indicateur des connectés.
  enTete: Synchro,
};
