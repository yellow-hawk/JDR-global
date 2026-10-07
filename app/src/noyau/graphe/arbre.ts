// Disposition d'un arbre « bien rangé » : chaque feuille prend une colonne, un parent se centre sur ses enfants.
import type { NoeudArbre, Position } from './types';

export interface OptionsArbre { ecartX?: number; ecartY?: number; replies?: Set<string>; horizontal?: boolean }

/** Positions des nœuds visibles (les nœuds repliés cachent leurs descendants). */
export function disposerArbre(racine: NoeudArbre, o: OptionsArbre = {}): { positions: Record<string, Position>; liens: [string, string][]; largeur: number; hauteur: number } {
  const ex = o.ecartX ?? 190, ey = o.ecartY ?? 110, rep = o.replies ?? new Set<string>();
  const positions: Record<string, Position> = {}, liens: [string, string][] = [];
  let colonne = 0, profMax = 0;
  const placer = (n: NoeudArbre, prof: number): number => {
    profMax = Math.max(profMax, prof);
    const enfants = rep.has(n.id) ? [] : n.enfants;
    let x: number;
    if (!enfants.length) x = colonne++;
    else {
      const xs = enfants.map((e) => { liens.push([n.id, e.id]); return placer(e, prof + 1); });
      x = (xs[0] + xs[xs.length - 1]) / 2;
    }
    positions[n.id] = o.horizontal ? { x: prof * ex, y: x * ey * 0.55 } : { x: x * ex, y: prof * ey };
    return x;
  };
  placer(racine, 0);
  const largeur = o.horizontal ? (profMax + 1) * ex : colonne * ex;
  const hauteur = o.horizontal ? colonne * ey * 0.55 : (profMax + 1) * ey;
  return { positions, liens, largeur, hauteur };
}

/** Nombre de descendants (pour l'affichage « +12 » d'un nœud replié). */
export const descendants = (n: NoeudArbre): number => n.enfants.reduce((s, e) => s + 1 + descendants(e), 0);
