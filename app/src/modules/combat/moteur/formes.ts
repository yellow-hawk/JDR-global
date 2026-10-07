// Appartenance d'un point / d'une case / d'un jeton à une zone (sort ou terrain). Calculs en pixels « monde ».
import { centre } from './grille';
import type { Cellule, Grille, Jeton, TypeTerrain, Zone } from './types';

/** Demi-largeur d'une ligne de sort, en cases (une ligne touche les cases dont le centre est à moins de 0,6 case). */
export const DEMI_LARGEUR_LIGNE = 0.6;

export function pointDansPolygone(px: number, py: number, pts: [number, number][]): boolean {
  let dedans = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

const angleNormalise = (a: number): number => {
  let d = a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
};

/** Le point monde (wx, wy) est-il dans la zone ? */
export function pointDansZone(g: Grille, z: Zone, wx: number, wy: number): boolean {
  if (z.forme === 'polygone') {
    if (!z.points || z.points.length < 3) return false;
    return pointDansPolygone(wx, wy, z.points.map((p) => centre(g, p)));
  }
  const [zx, zy] = centre(g, [z.x, z.y]);
  const u = g.taille;
  const dx = wx - zx, dy = wy - zy;
  const r = z.rayon * u;
  switch (z.forme) {
    case 'cercle': return Math.hypot(dx, dy) <= r + 1e-6;
    case 'carre': return Math.abs(dx) <= r + 1e-6 && Math.abs(dy) <= r + 1e-6;
    case 'cone': {
      const d = Math.hypot(dx, dy);
      if (d > r + 1e-6) return false;
      if (d < 1e-6) return true;
      return Math.abs(angleNormalise(Math.atan2(dy, dx) - z.angle)) <= Math.PI / 4 + 1e-9;
    }
    case 'ligne': {
      const ex = Math.cos(z.angle) * r, ey = Math.sin(z.angle) * r;
      const l2 = ex * ex + ey * ey;
      const t = l2 > 0 ? Math.max(0, Math.min(1, (dx * ex + dy * ey) / l2)) : 0;
      return Math.hypot(dx - t * ex, dy - t * ey) <= DEMI_LARGEUR_LIGNE * u;
    }
    case 'rectangle': {
      const c = Math.cos(-z.angle), s = Math.sin(-z.angle);
      const lx = dx * c - dy * s, ly = dx * s + dy * c;
      return lx >= -1e-6 && lx <= r + 1e-6 && Math.abs(ly) <= ((z.largeur ?? 1) * u) / 2 + 1e-6;
    }
    default: return false;
  }
}

export const celluleDansZone = (g: Grille, z: Zone, c: Cellule): boolean => {
  const [wx, wy] = centre(g, c);
  return pointDansZone(g, z, wx, wy);
};

export const jetonsDansZone = (g: Grille, z: Zone, jetons: Jeton[]): Jeton[] =>
  jetons.filter((j) => celluleDansZone(g, z, [j.x, j.y]));

/** Types de terrain présents sur une case. */
export function terrainsSur(g: Grille, zones: Zone[], types: TypeTerrain[], c: Cellule): TypeTerrain[] {
  const res: TypeTerrain[] = [];
  for (const z of zones) {
    if (z.categorie !== 'terrain' || !z.terrain) continue;
    const t = types.find((x) => x.id === z.terrain);
    if (t && celluleDansZone(g, z, c)) res.push(t);
  }
  return res;
}

/** Centre de gravité (en cases) des points d'un polygone, arrondi. */
export function centrePolygone(points: Cellule[]): Cellule {
  const n = points.length || 1;
  return [Math.round(points.reduce((s, p) => s + p[0], 0) / n), Math.round(points.reduce((s, p) => s + p[1], 0) / n)];
}
