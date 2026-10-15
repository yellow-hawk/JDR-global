import { lazy } from 'react';
import type { DefinitionModule } from '../../interface/types';
import { cleDe, peuplesDeCampagne } from './logique';
import { montrerPeuple } from './MontrerPays';
const Page = lazy(() => import('./Page').then((x) => ({ default: x.Page })));

export const definition: DefinitionModule = {
  id: 'pays', nom: 'Pays', etat: 'pret', besoinCampagne: true, dansMenu: true,
  icone: 'M4 4h16v16H4zM4 10h16M10 4v16M14 14l2 2',
  Page,
  montrables: {
    titre: 'Peuples',
    lister: (c) => peuplesDeCampagne(c).map((p) => ({ id: cleDe(p), nom: p.civ.nom.replace(/^les /, 'Les ') })),
    // Avec les rubriques cochées la dernière fois sur cet ordinateur.
    montrer: async (c, id) => { const p = peuplesDeCampagne(c).find((x) => cleDe(x) === id); if (!p) return false; montrerPeuple(p.civ); return true; },
  },
};
