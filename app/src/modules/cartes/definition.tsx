import { lazy } from 'react';
import type { DefinitionModule } from '../../interface/types';
import { SuiviAnnotations } from './SuiviAnnotations';
const Page = lazy(() => import('./Page').then((x) => ({ default: x.Page })));
// Écran joueurs : la carte montrée, zoomable, que la table peut annoter (repères, traits).
const Carte = lazy(() => import('./joueurs/Carte'));

export const definition: DefinitionModule = {
  id: 'cartes', nom: 'Cartes', etat: 'pret', besoinCampagne: true, dansMenu: true,
  icone: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  Page,
  // En-tête (MJ) : annotations proposées par les écrans joueurs sur la carte affichée.
  enTete: SuiviAnnotations,
  ecranJoueurs: { carte: Carte },
  montrables: {
    titre: 'Cartes',
    lister: (c) => c.cartes.filter((k) => k.images.joueurs).map((k) => ({ id: k.id, nom: k.nom })),
    montrer: async (c, id) => { const k = c.cartes.find((x) => x.id === id); return !!k && (await import('./montrer')).montrerCarte(c, k); },
  },
};
