// Actions faites par les joueurs sur l'écran joueurs (pur, testé) : le MJ envoie l'image de la table, sa caméra et
// l'action (viser un sort, se déplacer) ; les joueurs touchent la carte, l'aperçu suit, ils valident.
import { cellule, celluleDansZone, centre, largeurCase, zoneDeSort } from './moteur';
import type { Cellule, EtatTable, Gabarit, Grille, Jeton, Zone } from './moteur';
import { versMonde, type Camera } from './rendu';

export type ActionDemandee =
  | { sorte: 'sort'; gabarit: Gabarit; lanceur: Pick<Jeton, 'id' | 'nom' | 'x' | 'y'> }
  | { sorte: 'deplacement'; jeton: Pick<Jeton, 'id' | 'nom' | 'x' | 'y'>; reste: number };

/** Ce que l'écran joueurs reçoit. `image` est l'image de la table, cadrée par `camera`, en largeur × hauteur. */
export interface DemandeAction { id: string; titre: string; image: Blob; camera: Camera; largeur: number; hauteur: number; grille: Grille; action: ActionDemandee }
/** Ce qu'il renvoie : la case visée (et l'angle), en continu puis à la validation. */
export interface ReponseAction { id: string; cellule: Cellule; angle: number; valide: boolean; annule?: boolean }

export const estReponseAction = (d: Record<string, unknown>): d is ReponseAction & Record<string, unknown> =>
  typeof d.id === 'string' && Array.isArray(d.cellule) && typeof d.angle === 'number';

/** Point de l'image (px) → point du monde et case. */
export function caseVisee(d: Pick<DemandeAction, 'camera' | 'grille'>, px: number, py: number): { monde: [number, number]; cellule: Cellule } {
  const monde = versMonde(d.camera, px, py);
  return { monde, cellule: cellule(d.grille, monde[0], monde[1]) };
}

/** Angle du lanceur vers le point visé (sorts orientables : cône, ligne, rectangle). */
export function angleDepuis(g: Grille, de: Cellule, monde: [number, number]): number {
  const [cx, cy] = centre(g, de);
  return Math.atan2(monde[1] - cy, monde[0] - cx);
}

/** Zone d'un sort visé depuis un point du monde. */
export function zoneVisee(g: Grille, a: Extract<ActionDemandee, { sorte: 'sort' }>, monde: [number, number]): { zone: Omit<Zone, 'id'>; cellule: Cellule; angle: number } {
  const c = cellule(g, monde[0], monde[1]);
  const angle = angleDepuis(g, [a.lanceur.x, a.lanceur.y], monde);
  return { zone: zoneDeSort(a.gabarit, a.lanceur as Jeton, c, angle), cellule: c, angle };
}

/** Cases couvertes par une zone (pour la dessiner sur l'écran joueurs). */
export function casesDeZone(g: Grille, z: Omit<Zone, 'id'>): Cellule[] {
  const r = Math.ceil((z.rayon ?? 1) + (z.largeur ?? 1)) + 1, res: Cellule[] = [];
  for (let x = z.x - r; x <= z.x + r; x++) for (let y = z.y - r; y <= z.y + r; y++) if (celluleDansZone(g, { ...z, id: -1 } as Zone, [x, y])) res.push([x, y]);
  return res;
}

/** Position à l'écran (px de l'image) du centre d'une case, et côté d'une case à l'écran. */
export function versImage(d: Pick<DemandeAction, 'camera' | 'grille'>, c: Cellule): [number, number] {
  const [wx, wy] = centre(d.grille, c);
  return [wx * d.camera.zoom + d.camera.x, wy * d.camera.zoom + d.camera.y];
}
export const coteCaseImage = (d: Pick<DemandeAction, 'camera' | 'grille'>): number => largeurCase(d.grille) * d.camera.zoom;

/** Jeton (réduit à ce que les joueurs doivent savoir) pour la demande. */
export const jetonPublic = (j: Jeton) => ({ id: j.id, nom: j.nom, x: j.x, y: j.y });

/** Déplacement restant d'un jeton (en combat), sinon sa vitesse. */
export const reste = (e: EtatTable, j: Jeton): number => (e.combat.actif ? Math.max(0, j.vitesse - j.mouvementUtilise) : j.vitesse);
