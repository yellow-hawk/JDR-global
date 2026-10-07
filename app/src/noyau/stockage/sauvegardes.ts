// Instantanés automatiques des campagnes (IndexedDB) : pris à l'ouverture, toutes les 10 minutes de travail,
// avant une restauration ou une grosse opération. On garde les 12 plus récents et un par jour sur 30 jours.
// Les fichiers (images) ne sont pas copiés : ils restent dans le magasin « fichiers ».
import type { Campagne } from '../contrat';
import { chargerCampagne } from '../contrat';
import { cles, ecrire, effacer, lire, plagePrefixe } from './idb';

export interface Instantane { id: string; campagne: string; nom: string; quand: string; raison: string; taille: number }
interface Enregistrement extends Instantane { donnees: Campagne }

export const GARDER_RECENTS = 12;
export const GARDER_JOURS = 30;
export const INTERVALLE_MS = 10 * 60 * 1000;

/** Instantanés à garder : les plus récents, plus le premier de chaque jour sur les derniers jours. Pur. */
export function aGarder(liste: { id: string; quand: string }[], maintenant: Date, recents = GARDER_RECENTS, jours = GARDER_JOURS): Set<string> {
  const tries = [...liste].sort((a, b) => b.quand.localeCompare(a.quand));
  const garde = new Set(tries.slice(0, recents).map((x) => x.id));
  const limite = maintenant.getTime() - jours * 86_400_000;
  const vus = new Set<string>();
  for (const x of [...tries].reverse()) {
    if (new Date(x.quand).getTime() < limite) continue;
    const jour = x.quand.slice(0, 10);
    if (!vus.has(jour)) { vus.add(jour); garde.add(x.id); }
  }
  return garde;
}

async function enregistrements(idCampagne: string): Promise<Instantane[]> {
  const ids = await cles('sauvegardes', plagePrefixe(idCampagne));
  return ids.map((id) => { const quand = id.slice(idCampagne.length + 1); return { id, campagne: idCampagne, nom: '', quand, raison: '', taille: 0 }; });
}

/** Prend un instantané et fait le ménage. */
export async function faireInstantane(c: Campagne, raison: string): Promise<Instantane> {
  const quand = new Date().toISOString();
  const taille = JSON.stringify(c).length;
  const e: Enregistrement = { id: `${c.campagne.id}/${quand}`, campagne: c.campagne.id, nom: c.campagne.nom, quand, raison, taille, donnees: c };
  await ecrire('sauvegardes', e.id, e);
  const tous = await enregistrements(c.campagne.id);
  const garde = aGarder(tous, new Date());
  for (const x of tous) if (!garde.has(x.id)) await effacer('sauvegardes', x.id);
  const { donnees: _d, ...meta } = e;
  return meta;
}

/** Instantanés d'une campagne, du plus récent au plus ancien (sans leur contenu). */
export async function listerInstantanes(idCampagne: string): Promise<Instantane[]> {
  const ids = (await cles('sauvegardes', plagePrefixe(idCampagne))).sort().reverse();
  const sortie: Instantane[] = [];
  for (const id of ids) {
    const e = await lire<Enregistrement>('sauvegardes', id);
    if (e) { const { donnees: _d, ...meta } = e; sortie.push(meta); }
  }
  return sortie;
}

/** Contenu d'un instantané, repassé par le chargement tolérant. */
export async function lireInstantane(id: string): Promise<{ campagne: Campagne; alertes: string[] } | null> {
  const e = await lire<Enregistrement>('sauvegardes', id);
  return e ? chargerCampagne(e.donnees) : null;
}

export async function dernierInstantane(idCampagne: string): Promise<string | null> {
  const ids = (await cles('sauvegardes', plagePrefixe(idCampagne))).sort();
  return ids.length ? ids[ids.length - 1].slice(idCampagne.length + 1) : null;
}

export const supprimerInstantanes = async (idCampagne: string): Promise<void> => effacer('sauvegardes', plagePrefixe(idCampagne));
