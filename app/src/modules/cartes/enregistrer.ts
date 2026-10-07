// Range une image de carte dans le stockage de la campagne (PDF converti en PNG).
import type { Fichier } from '../../noyau/contrat';
import { ajouterFichier } from '../../noyau/stockage';
import { preparer, tailleImage } from './import';

export async function enregistrerImageCarte(
  idCampagne: string, f: Blob, nomFichier?: string,
): Promise<{ fichier: Fichier; taille: { l: number; h: number } }> {
  const nom = nomFichier ?? (f instanceof File ? f.name : 'carte.png');
  const { contenu, nom: nomFinal } = await preparer(f instanceof File ? f : new File([f], nom, { type: f.type }));
  const taille = await tailleImage(contenu);
  const fichier = await ajouterFichier(idCampagne, contenu, nomFinal);
  return { fichier, taille };
}
