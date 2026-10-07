// Campagnes et fichiers stockés dans le navigateur (IndexedDB).
import type { Campagne, Fichier } from '../contrat';
import { chargerCampagne, maintenant, nouvelId } from '../contrat';
import { cles, ecrire, effacer, lire, plagePrefixe, tout } from './idb';

export interface ResumeCampagne { id: string; nom: string; majLe: string; regles: string }

export async function listerCampagnes(): Promise<ResumeCampagne[]> {
  const toutes = await tout<Campagne>('campagnes');
  return toutes
    .map((c) => ({ id: c.campagne.id, nom: c.campagne.nom, majLe: c.campagne.majLe, regles: c.campagne.regles }))
    .sort((a, b) => b.majLe.localeCompare(a.majLe));
}

/** Lit une campagne et la passe par le chargement tolérant. */
export async function lireCampagne(id: string): Promise<{ campagne: Campagne; alertes: string[] } | null> {
  const brut = await lire<unknown>('campagnes', id);
  return brut ? chargerCampagne(brut) : null;
}

/** Enregistre (met à jour majLe). */
export async function sauverCampagne(c: Campagne): Promise<Campagne> {
  const copie: Campagne = { ...c, campagne: { ...c.campagne, majLe: maintenant() } };
  await ecrire('campagnes', copie.campagne.id, copie);
  return copie;
}

export async function supprimerCampagne(id: string): Promise<void> {
  await effacer('campagnes', id);
  await effacer('fichiers', plagePrefixe(id));
}

/* ---------- fichiers (images, PDF…) ---------- */

const cleFichier = (idCampagne: string, idFichier: string): string => `${idCampagne}/${idFichier}`;

/** Range un contenu binaire et renvoie sa fiche, à ajouter dans campagne.fichiers. */
export async function ajouterFichier(idCampagne: string, contenu: Blob, nom: string): Promise<Fichier> {
  const f: Fichier = { id: nouvelId('fichier'), nom, mime: contenu.type || 'application/octet-stream', octets: contenu.size };
  await ecrire('fichiers', cleFichier(idCampagne, f.id), contenu);
  return f;
}

export async function ecrireFichier(idCampagne: string, idFichier: string, contenu: Blob): Promise<void> {
  await ecrire('fichiers', cleFichier(idCampagne, idFichier), contenu);
}

export async function lireFichier(idCampagne: string, idFichier: string): Promise<Blob | undefined> {
  return lire<Blob>('fichiers', cleFichier(idCampagne, idFichier));
}

export async function supprimerFichier(idCampagne: string, idFichier: string): Promise<void> {
  await effacer('fichiers', cleFichier(idCampagne, idFichier));
}

/** Identifiants des fichiers présents pour une campagne. */
export async function fichiersStockes(idCampagne: string): Promise<string[]> {
  return (await cles('fichiers', plagePrefixe(idCampagne))).map((k) => k.slice(idCampagne.length + 1));
}

/* ---------- réglages ---------- */

export const lireReglage = <T>(cle: string): Promise<T | undefined> => lire<T>('reglages', cle);
export const ecrireReglage = (cle: string, v: unknown): Promise<void> => ecrire('reglages', cle, v);
