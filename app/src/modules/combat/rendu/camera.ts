// Caméra 2D : passage monde ↔ écran, zoom centré sur le curseur. Pur, sans navigateur.
export interface Camera { x: number; y: number; zoom: number } // décalage écran (px) et facteur d'échelle

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 8;
export const PAS_ZOOM = 1.12;

export const cameraInitiale = (): Camera => ({ x: 40, y: 40, zoom: 1 });

export const versEcran = (c: Camera, wx: number, wy: number): [number, number] => [wx * c.zoom + c.x, wy * c.zoom + c.y];
export const versMonde = (c: Camera, sx: number, sy: number): [number, number] => [(sx - c.x) / c.zoom, (sy - c.y) / c.zoom];

/** Zoome d'un facteur en gardant fixe le point écran (sx, sy). */
export function zoomer(c: Camera, facteur: number, sx: number, sy: number): Camera {
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, c.zoom * facteur));
  const [wx, wy] = versMonde(c, sx, sy);
  return { zoom, x: sx - wx * zoom, y: sy - wy * zoom };
}

export const deplacerCamera = (c: Camera, dx: number, dy: number): Camera => ({ ...c, x: c.x + dx, y: c.y + dy });

/** Caméra qui fait tenir le rectangle monde [x0,y0,x1,y1] dans une vue largeur × hauteur (avec marge). */
export function cadrer(rect: [number, number, number, number], largeur: number, hauteur: number, marge = 24): Camera {
  const [x0, y0, x1, y1] = rect;
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.min((largeur - 2 * marge) / w, (hauteur - 2 * marge) / h)));
  return { zoom, x: (largeur - w * zoom) / 2 - x0 * zoom, y: (hauteur - h * zoom) / 2 - y0 * zoom };
}
