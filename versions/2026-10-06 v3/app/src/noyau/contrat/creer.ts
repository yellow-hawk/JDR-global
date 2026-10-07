// Fabriques : objets neufs avec toutes leurs valeurs par défaut.
import type { Campagne, Carte, Personnage, SortePersonnage, Univers } from './types';
import { FORMAT, VERSION } from './types';

let compteur = 0;

/** Identifiant unique préfixé par le type : "perso-lq3k9a-2f". */
export function nouvelId(prefixe: string): string {
  compteur = (compteur + 1) % 1296;
  const temps = Date.now().toString(36);
  const hasard = Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
  return `${prefixe}-${temps}${compteur.toString(36)}${hasard}`;
}

export const maintenant = (): string => new Date().toISOString();

export function nouvelleCampagne(nom: string, regles = 'dnd5e'): Campagne {
  const t = maintenant();
  return {
    format: FORMAT,
    version: VERSION,
    campagne: { id: nouvelId('camp'), nom, regles, creeLe: t, majLe: t, mj: { notes: '' } },
    univers: [], cartes: [], personnages: [], sorts: [],
    rencontres: [], quetes: [], seances: [], fichiers: [], familles: [],
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
