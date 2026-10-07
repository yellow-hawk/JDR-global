// Fabriques : objets neufs avec toutes leurs valeurs par défaut.
import type { Campagne, Carte, Personnage, SortePersonnage, Univers } from './types';
import { FORMAT, VERSION } from './types';

let compteur = 0;

/** Partie aléatoire d'un identifiant : crypto si disponible (navigateur, Node 19+), sinon Math.random (ce n'est pas de la génération). */
function aleatoire(): string {
  const c = globalThis.crypto;
  if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0].toString(36).padStart(7, '0').slice(-4);
  return Math.floor(Math.random() * 36 ** 4).toString(36).padStart(4, '0');
}

/** Identifiant unique préfixé par le type : "perso-lq3k9a2f3x1". Court et lisible, ordonné dans le temps. */
export function nouvelId(prefixe: string): string {
  compteur = (compteur + 1) % 1296;
  return `${prefixe}-${Date.now().toString(36)}${compteur.toString(36)}${aleatoire()}`;
}

export const maintenant = (): string => new Date().toISOString();

export function nouvelleCampagne(nom: string, regles = 'dnd5e'): Campagne {
  const t = maintenant();
  return {
    format: FORMAT,
    version: VERSION,
    campagne: { id: nouvelId('camp'), nom, regles, creeLe: t, majLe: t, mj: { notes: '' } },
    univers: [], cartes: [], personnages: [], sorts: [],
    rencontres: [], quetes: [], seances: [], fichiers: [], familles: [], evenements: [], documents: [],
  };
}

export function nouvelUnivers(nom: string, sorte: Univers['sorte'] = 'fait-main'): Univers {
  return sorte === 'fait-main'
    ? { id: nouvelId('univ'), nom, sorte, monde: { carte: null, peuples: [], calendrier: null } }
    : { id: nouvelId('univ'), nom, sorte, atlas: {} };
}

export function nouvelleCarte(nom: string, type = 'lieu'): Carte {
  const t = maintenant();
  return {
    id: nouvelId('carte'), nom, type,
    source: { sorte: 'import' },
    images: { joueurs: null },
    reperes: [], creeLe: t, majLe: t,
  };
}

export function nouveauPersonnage(
  nom: string,
  sorte: SortePersonnage,
  regles: string,
  stats: Record<string, unknown>,
): Personnage {
  return { id: nouvelId('perso'), nom, sorte, combat: { regles, stats }, notes: '', mj: {} };
}
