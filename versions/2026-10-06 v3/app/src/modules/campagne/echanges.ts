// Import / export d'archives de campagne depuis l'interface.
import type { Campagne } from '../../noyau/contrat';
import { nouvelId } from '../../noyau/contrat';
import {
  choisirFichier, construireArchive, lireArchive, lireCampagne, lireFichier, nomArchive, telecharger,
} from '../../noyau/stockage';
import { emettre } from '../../noyau/bus';

export async function exporterCampagne(c: Campagne, joueurs: boolean): Promise<void> {
  const { octets, manquants } = await construireArchive(
    c,
    async (id) => {
      const b = await lireFichier(c.campagne.id, id);
      return b ? new Uint8Array(await b.arrayBuffer()) : undefined;
    },
    { joueurs },
  );
  telecharger(octets, nomArchive(c, joueurs), 'application/zip');
  emettre('message', {
    texte: manquants.length
      ? `Archive créée, mais ${manquants.length} fichier(s) introuvable(s) ont été omis.`
      : `Archive ${joueurs ? 'joueurs' : 'complète'} créée.`,
    sorte: manquants.length ? 'erreur' : 'succes',
  });
}

/** Demande un fichier, le lit, et règle le cas d'une campagne déjà présente. null si annulé ou invalide. */
export async function importerCampagne(): Promise<{
  campagne: Campagne; fichiers: Map<string, Uint8Array>; alertes: string[];
} | null> {
  const choix = await choisirFichier('.zip,.json,application/zip,application/json');
  if (!choix) return null;
  try {
    const r = lireArchive(new Uint8Array(await choix[0].arrayBuffer()));
    const existante = await lireCampagne(r.campagne.campagne.id);
    if (existante) {
      const remplacer = window.confirm(
        `La campagne « ${existante.campagne.campagne.nom} » existe déjà.\n\nOK : la remplacer par l'archive.\nAnnuler : importer une copie à côté.`,
      );
      if (!remplacer) {
        r.campagne = {
          ...r.campagne,
          campagne: { ...r.campagne.campagne, id: nouvelId('camp'), nom: `${r.campagne.campagne.nom} (copie)` },
        };
      }
    }
    return r;
  } catch (err) {
    emettre('message', { texte: `Import impossible : ${(err as Error).message}`, sorte: 'erreur' });
    return null;
  }
}
