// Profils de joueurs (PJ) : rang, signes connus, grimoire personnel limité en emplacements, calibrage de la main, défis et leçons.
import { SIGNE, TOUS, type Rang } from '../data/signes';
import type { Stroke } from './geometry';
import type { Sceau, SortEnregistre } from './types';

export interface ResultatDefi { score: number; temps: number; date: number }

export interface ProfilPJ {
  id: string;
  nom: string;
  joueur: string;
  couleur: string;
  rang: Rang;
  signes: string[];                       // signes connus (endroit et inversé)
  emplacements: number;                   // nombre de sorts que le grimoire peut contenir
  grimoire: SortEnregistre[];
  calibrage: Record<string, Stroke[][]>;  // tracés personnels par signe (boîte 0..100, haut = extérieur)
  defis: Record<string, ResultatDefi>;    // meilleur résultat par sort
  lecons: string[];                       // leçons réussies
  cree: number;
}


/** Signes d'un apprenti débutant */
export const SIGNES_DEPART = ['braise', 'source', 'socle', 'souffle', 'lueur', 'jet', 'gerbe', 'plume', 'fenetre', 'halo'];
export const EMPLACEMENTS_DEPART = 5;
const COULEURS = ['#c2410c', '#1d4ed8', '#15803d', '#7e22ce', '#b45309', '#0e7490', '#be123c'];

export function nouveauProfil(nom: string, joueur = ''): ProfilPJ {
  return {
    id: Math.random().toString(36).slice(2, 10), nom: nom.trim() || 'Apprenti sans nom', joueur, couleur: COULEURS[Math.floor(Math.random() * COULEURS.length)],
    rang: 1, signes: [...SIGNES_DEPART], emplacements: EMPLACEMENTS_DEPART, grimoire: [], calibrage: {}, defis: {}, lecons: [], cree: Date.now(),
  };
}

// Stockage : les profils vivent dans la campagne (personnage.magie), voir modules/magie/lien.ts.

/** Signes utilisés par un sceau (y compris couronne et greffe) */
export function signesDuSceau(s: Sceau): string[] {
  const ids = new Set<string>();
  if (s.coeur) ids.add(s.coeur.id);
  s.rameaux.forEach((r) => ids.add(r.id)); s.noeuds.forEach((n) => ids.add(n.id));
  s.couronne?.rameaux.forEach((r) => ids.add(r.id)); s.couronne?.noeuds.forEach((n) => ids.add(n.id));
  if (s.greffe) signesDuSceau(s.greffe).forEach((x) => ids.add(x));
  return [...ids];
}

/** Techniques avancées : rang minimal requis */
export function rangTechniques(s: Sceau): Rang {
  if (s.couronne || s.greffe) return 3;
  if (s.fendu) return 2;
  return 1;
}

export function verifierSort(p: ProfilPJ, s: Sceau): { inconnus: string[]; tropHaut: string[]; technique: boolean } {
  const ids = signesDuSceau(s);
  return {
    inconnus: ids.filter((id) => !p.signes.includes(id)),
    tropHaut: ids.filter((id) => SIGNE[id].rang > p.rang),
    technique: rangTechniques(s) > p.rang,
  };
}

export function peutInscrire(p: ProfilPJ, s: Sceau): { ok: boolean; raison?: string } {
  if (!s.coeur) return { ok: false, raison: 'Le sceau n’a pas de Cœur.' };
  if (p.grimoire.length >= p.emplacements) return { ok: false, raison: `Grimoire plein (${p.emplacements} emplacements).` };
  const v = verifierSort(p, s);
  if (v.inconnus.length) return { ok: false, raison: `Signes inconnus : ${v.inconnus.map((i) => SIGNE[i].nom).join(', ')}.` };
  if (v.technique) return { ok: false, raison: 'Technique de sceau trop avancée pour ce rang.' };
  return { ok: true };
}

export const nomRang = (r: Rang) => ['', 'Apprenti', 'Compagnon', 'Maître'][r];
export const tousLesSignes = TOUS;
