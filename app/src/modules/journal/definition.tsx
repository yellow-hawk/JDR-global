import { lazy } from 'react';
import type { DefinitionModule } from '../../interface/types';
import { estCache } from '../../noyau/contrat';
import { montrerAuxJoueurs } from '../../noyau/bus';
import { sceneQuete } from './logique';
const Page = lazy(() => import('./Page').then((x) => ({ default: x.Page })));

export const definition: DefinitionModule = {
  id: 'journal', nom: 'Journal', etat: 'pret', besoinCampagne: true, dansMenu: true,
  icone: 'M6 3h11a2 2 0 0 1 2 2v16l-7.5-4L4 21V5a2 2 0 0 1 2-2zM8 8h8M8 12h5',
  Page,
  montrables: {
    titre: 'Quêtes',
    lister: (c) => c.quetes.filter((q) => !estCache(q)).map((q) => ({ id: q.id, nom: q.titre })),
    montrer: async (c, id) => { const q = c.quetes.find((x) => x.id === id); if (!q) return false; montrerAuxJoueurs(sceneQuete(q)); return true; },
  },
};
