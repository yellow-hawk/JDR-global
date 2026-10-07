// Documents à montrer aux joueurs (lettres, affiches, indices, images). Pur, testé.
// Un document est caché (`mj.cache`) tant qu'il n'a pas été montré : il n'apparaît alors ni en aperçu joueurs ni dans l'archive joueurs.
import type { Campagne, DocumentJoueurs } from '../../noyau/contrat';
import { nouvelId } from '../../noyau/contrat';
import type { Scene, StyleDocument } from '../../noyau/bus';
import donnees from './styles.json';

export const STYLES = donnees.styles as { id: StyleDocument; libelle: string }[];

export const estMontre = (d: DocumentJoueurs): boolean => !(d.mj as { cache?: boolean } | undefined)?.cache;

export function nouveauDocument(c: Campagne, sorte: DocumentJoueurs['sorte'] = 'texte', titre = 'Nouveau document', texte = ''): { campagne: Campagne; id: string } {
  const d: DocumentJoueurs = { id: nouvelId('doc'), titre, sorte, texte, image: null, style: 'parchemin', lien: null, montreLe: null, mj: { cache: true } };
  return { campagne: { ...c, documents: [...(c.documents ?? []), d] }, id: d.id };
}

export const modifierDocument = (c: Campagne, id: string, f: (d: DocumentJoueurs) => DocumentJoueurs): Campagne =>
  ({ ...c, documents: (c.documents ?? []).map((d) => (d.id === id ? f(d) : d)) });

/** Supprime le document ; renvoie le fichier image libéré (à effacer du stockage). */
export function supprimerDocument(c: Campagne, id: string): { campagne: Campagne; libere: string | null } {
  const d = (c.documents ?? []).find((x) => x.id === id);
  const fichier = d?.image ?? null;
  const documents = (c.documents ?? []).filter((x) => x.id !== id);
  const encoreUtilise = !!fichier && documents.some((x) => x.image === fichier);
  return {
    campagne: { ...c, documents, fichiers: fichier && !encoreUtilise ? c.fichiers.filter((f) => f.id !== fichier) : c.fichiers },
    libere: fichier && !encoreUtilise ? fichier : null,
  };
}

/** Révèle le document aux joueurs (la première fois, note la date). */
export function montrerDocument(c: Campagne, id: string, quand: string): Campagne {
  return modifierDocument(c, id, (d) => {
    const { cache: _c, ...mj } = (d.mj ?? {}) as { cache?: boolean };
    return { ...d, montreLe: d.montreLe ?? quand, mj };
  });
}

export const cacherDocument = (c: Campagne, id: string): Campagne =>
  modifierDocument(c, id, (d) => ({ ...d, mj: { ...(d.mj ?? {}), cache: true } }));

/** Scène de l'écran joueurs pour un document. */
export function sceneDocument(d: DocumentJoueurs, image: Blob | null): Scene {
  const style = (STYLES.some((s) => s.id === d.style) ? d.style : 'parchemin') as StyleDocument;
  return { sorte: 'document', titre: d.titre, texte: d.sorte === 'texte' ? d.texte ?? '' : d.texte || undefined, image, style };
}

/** Documents rangés : à montrer d'abord (ordre de création), puis déjà montrés (plus récents d'abord). */
export function trierDocuments(l: DocumentJoueurs[]): DocumentJoueurs[] {
  const caches = l.filter((d) => !estMontre(d));
  const montres = l.filter(estMontre).sort((a, b) => (b.montreLe ?? '').localeCompare(a.montreLe ?? ''));
  return [...caches, ...montres];
}
