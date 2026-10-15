import { lazy } from 'react';
import type { DefinitionModule } from '../../interface/types';
import { montrerAuxJoueurs } from '../../noyau/bus';
import { lireFichier } from '../../noyau/stockage';
import { sceneDocument } from './logique';
const Page = lazy(() => import('./Page').then((x) => ({ default: x.Page })));

export const definition: DefinitionModule = {
  id: 'documents', nom: 'Documents', etat: 'pret', besoinCampagne: true, dansMenu: true,
  icone: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h4',
  Page,
  montrables: {
    titre: 'Documents',
    lister: (c) => c.documents.map((d) => ({ id: d.id, nom: d.titre })),
    montrer: async (c, id) => {
      const d = c.documents.find((x) => x.id === id);
      if (!d) return false;
      montrerAuxJoueurs(sceneDocument(d, d.image ? (await lireFichier(c.campagne.id, d.image)) ?? null : null));
      return true;
    },
  },
};
