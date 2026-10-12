// Ce que chaque public voit : le MJ voit tout ; les joueurs ne voient ni les jetons cachés, ni les ennemis invisibles,
// ni les stats des ennemis, ni ce qui est sous le brouillard. Pur et testé.
import { centre, largeurCase } from '../moteur/grille';
import type { EtatTable, Jeton } from '../moteur/types';
import { cle } from '../moteur/types';
import { vueDesPj } from '../moteur/vision';

export type Public = 'mj' | 'joueurs';

export const sousBrouillard = (e: EtatTable, x: number, y: number): boolean => e.brouillard.actif && !e.brouillard.cases[cle([x, y])];

/** La vue des PJ commande ce que voient les joueurs (brouillard actif et « la vue des PJ révèle »). */
export const vueActive = (e: EtatTable): boolean => e.brouillard.actif && e.vision;

/**
 * Les joueurs voient leurs PJ et alliés partout ; les autres jetons seulement là où le brouillard est levé et,
 * quand la vue des PJ est active, seulement s'ils sont vus en ce moment (une zone déjà explorée ne montre pas
 * qui s'y trouve maintenant).
 */
export function jetonVisible(e: EtatTable, j: Jeton, p: Public): boolean {
  if (!j.visible) return p === 'mj';
  if (p === 'mj') return true;
  if (j.camp === 'ennemi' && j.conditions.includes('Invisible')) return false;
  if (j.camp === 'pj' || j.camp === 'allie') return true;
  if (vueActive(e)) return vueDesPj(e).has(cle([j.x, j.y]));
  return !sousBrouillard(e, j.x, j.y);
}

/** Les joueurs voient-ils les PV / la CA de ce jeton ? */
export const statsVisibles = (j: Jeton, p: Public): boolean => p === 'mj' || j.camp !== 'ennemi';

/** Rectangle monde englobant la carte de fond et/ou les jetons visibles (pour l'image de l'écran joueurs). */
export function bornes(e: EtatTable, p: Public, fond?: { largeur: number; hauteur: number } | null): [number, number, number, number] | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const inclure = (x: number, y: number) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  if (fond) { inclure(0, 0); inclure(fond.largeur, fond.hauteur); }
  const u = largeurCase(e.grille);
  for (const j of e.jetons) {
    if (!jetonVisible(e, j, p)) continue;
    const [cx, cy] = centre(e.grille, [j.x, j.y]);
    const r = (j.taille * u) / 2 + u;
    inclure(cx - r, cy - r); inclure(cx + r, cy + r);
  }
  return isFinite(x0) ? [x0, y0, x1, y1] : null;
}
