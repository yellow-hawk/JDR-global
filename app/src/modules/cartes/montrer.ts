// Montrer une carte sur l'écran joueurs : vue interactive « carte » (zoom, annotations des joueurs), image en version
// joueurs avec son brouillard. Utilisé par la fiche de la carte et par le programme de la séance.
import type { Campagne, Carte } from '../../noyau/contrat';
import { montrerAuxJoueurs } from '../../noyau/bus';
import { lireFichier } from '../../noyau/stockage';
import { annotationPermise, annotationsDe } from './annotations';
import { brouillardDe, imageAvecBrouillard } from './brouillard';

/** Source de l'écran joueurs pour une carte (les annotations ne s'appliquent qu'à la carte affichée). */
export const sourceCarte = (id: string): string => `carte:${id}`;

async function tailleDe(k: Carte, image: Blob): Promise<{ l: number; h: number }> {
  if (k.taille) return k.taille;
  try { const b = await createImageBitmap(image); const t = { l: b.width, h: b.height }; b.close(); return t; } catch { return { l: 1000, h: 1000 }; }
}

/** Affiche la carte aux joueurs ; false s'il n'y a pas d'image joueurs. */
export async function montrerCarte(c: Campagne, k: Carte): Promise<boolean> {
  const img = k.images.joueurs ? await lireFichier(c.campagne.id, k.images.joueurs) : undefined;
  if (!img) return false;
  const b = brouillardDe(k);
  const image = b.actif ? await imageAvecBrouillard(img, b) : img;
  const { l, h } = await tailleDe(k, img);
  montrerAuxJoueurs({
    sorte: 'module', module: 'cartes', vue: 'carte', titre: k.nom,
    donnees: { carteId: k.id, image, largeur: l, hauteur: h, annotations: annotationsDe(c, k.id), annoter: annotationPermise(c, k.id) },
  }, sourceCarte(k.id));
  return true;
}
