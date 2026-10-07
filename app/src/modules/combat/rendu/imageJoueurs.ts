// Image de la table pour l'écran joueurs : toute la carte (ou tous les jetons visibles), vue joueurs, hors écran.
import type { EtatTable, TypeTerrain } from '../moteur/types';
import { cadrer } from './camera';
import { dessinerScene, echelleFond, type Fond } from './dessin';
import { bornes } from './visibilite';

export const TAILLE_IMAGE_JOUEURS = { largeur: 1920, hauteur: 1080 };

export function dessinerImageJoueurs(
  e: EtatTable, types: TypeTerrain[], fond: Fond | null, portraits: Map<number, CanvasImageSource>,
  largeur = TAILLE_IMAGE_JOUEURS.largeur, hauteur = TAILLE_IMAGE_JOUEURS.hauteur,
): HTMLCanvasElement {
  const k = echelleFond(e);
  const b = bornes(e, 'joueurs', fond ? { largeur: fond.largeur * k, hauteur: fond.hauteur * k } : null) ?? [0, 0, e.grille.taille * 20, e.grille.taille * 12];
  const camera = cadrer(b, largeur, hauteur, 16);
  const c = document.createElement('canvas');
  c.width = largeur; c.height = hauteur;
  dessinerScene(c.getContext('2d')!, { etat: e, types, camera, largeur, hauteur, public: 'joueurs', fond, portraits });
  return c;
}

export const imageJoueurs = (...args: Parameters<typeof dessinerImageJoueurs>): Promise<Blob> =>
  new Promise((ok, ko) => dessinerImageJoueurs(...args).toBlob((b) => (b ? ok(b) : ko(new Error('Image impossible'))), 'image/jpeg', 0.88));
