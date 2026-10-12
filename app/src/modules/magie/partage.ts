// Tracé partagé avec l'écran joueurs (pur) : ce que le MJ envoie (zone de tracé, effet), ce que les joueurs
// renvoient (traits), et la lecture du tracé selon le personnage (signes connus, calibrage personnel).
import { analyser, type Analyse } from './atelier/engine/analyse';
import { lireTrace, type Lecture } from './atelier/engine/freehand';
import type { Pt, Stroke } from './atelier/engine/geometry';
import { modelesPerso } from './atelier/engine/recognizer';
import type { ProfilPJ } from './atelier/engine/profils';
import type { Sceau } from './atelier/engine/types';
import { SIGNE } from './atelier/data/signes';
import { STAGE } from './atelier/components/SceauSVG';

/** Zone de tracé montrée aux joueurs : `duree` en secondes (0 : sans limite), le chrono part au premier trait. */
export interface DemandeTrace { id: string; titre: string; duree: number; guide: boolean }
/** Réponse de l'écran joueurs, à chaque trait puis à la fin (`fini`). `temps` en ms depuis le premier trait. */
export interface ReponseTrace { id: string; traits: Stroke[]; fini: boolean; temps: number; horsDelai?: boolean }
/** Effet 3D montré aux joueurs une fois le tracé lu. */
export interface EffetTrace { traits: Stroke[]; centre: Pt; R: number; sceau: Sceau; nom: string; resume: string }

export const estReponseTrace = (d: Record<string, unknown>): d is ReponseTrace & Record<string, unknown> =>
  typeof d.id === 'string' && Array.isArray(d.traits) && typeof d.fini === 'boolean';

/** Lecture du tracé d'un personnage (sans profil : tous les signes sont permis). */
export function lireTracePartage(traits: Stroke[], profil: ProfilPJ | null): { lecture: Lecture; analyse: Analyse; inconnus: string[] } {
  const connus = profil ? new Set(profil.signes) : undefined;
  const perso = profil && Object.keys(profil.calibrage).length ? modelesPerso(profil.id, profil.calibrage, (id) => SIGNE[id].famille) : undefined;
  const lecture = lireTrace(traits, STAGE, 1, { connus, perso });
  return { lecture, analyse: analyser(lecture.sceau), inconnus: [...new Set(lecture.inconnus)].map((i) => SIGNE[i]?.nom ?? i) };
}

export const effetDe = (traits: Stroke[], lecture: Lecture, analyse: Analyse, nom?: string): EffetTrace =>
  ({ traits, centre: lecture.centre, R: lecture.R, sceau: lecture.sceau, nom: nom || analyse.nomSuggere, resume: analyse.resume });
