// API publique du stockage.
export {
  listerCampagnes, lireCampagne, sauverCampagne, supprimerCampagne,
  ajouterFichier, ecrireFichier, lireFichier, supprimerFichier, fichiersStockes,
  lireReglage, ecrireReglage,
} from './campagnes';
export type { ResumeCampagne } from './campagnes';
export { construireArchive, lireArchive, nomArchive } from './archive';
export type { OptionsExport } from './archive';
export { telecharger, choisirFichier } from './navigateur';
export { faireInstantane, listerInstantanes, lireInstantane, dernierInstantane, supprimerInstantanes, aGarder, INTERVALLE_MS } from './sauvegardes';
export type { Instantane } from './sauvegardes';
export { dossierPossible, choisirDossier, oublierDossier, etatDossier, autoriserDossier, ecrireDansDossier } from './dossier';
