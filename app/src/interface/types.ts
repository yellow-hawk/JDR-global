// Contrat entre la coquille et les modules.
import type { ComponentType } from 'react';
import type { Campagne } from '../noyau/contrat';

export interface DefinitionModule {
  /** Identifiant, utilisé dans l'adresse (#personnages) et l'événement « naviguer ». */
  id: string;
  nom: string;
  /** Tracé SVG (attribut d) d'une icône 24×24 dessinée au trait. */
  icone: string;
  /** 'pret' = utilisable ; 'bientot' = page d'annonce. */
  etat: 'pret' | 'bientot';
  /** La page a-t-elle besoin d'une campagne ouverte ? */
  besoinCampagne: boolean;
  /** Afficher dans la navigation ? (l'Avatar s'ouvre depuis Personnages) */
  dansMenu: boolean;
  Page: ComponentType;
  /** Petit élément affiché dans l'en-tête quand une campagne est ouverte (ex. horloge du monde). */
  enTete?: ComponentType;
  /** Mise à niveau d'une campagne à son ouverture (doit renvoyer la même campagne si rien ne change). */
  preparerCampagne?: (c: Campagne) => Campagne;
}
