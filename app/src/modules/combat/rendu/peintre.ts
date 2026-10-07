// Outils de dessin partagés : passage case → écran, chemins de case, couleurs.
import { centre, coinsHex, largeurCase, tailleHex } from '../moteur/grille';
import type { Camp, Cellule, Grille } from '../moteur/types';
import { versEcran, versMonde, type Camera } from './camera';

export interface Peintre {
  ctx: CanvasRenderingContext2D;
  cam: Camera;
  g: Grille;
  largeur: number;
  hauteur: number;
  /** Côté d'une case à l'écran (unité des rayons de zone). */
  u: number;
  /** Largeur utile d'une case à l'écran (jetons). */
  uc: number;
}

export function peintre(ctx: CanvasRenderingContext2D, cam: Camera, g: Grille, largeur: number, hauteur: number): Peintre {
  return { ctx, cam, g, largeur, hauteur, u: g.taille * cam.zoom, uc: largeurCase(g) * cam.zoom };
}

export const ecran = (p: Peintre, c: Cellule): [number, number] => { const [wx, wy] = centre(p.g, c); return versEcran(p.cam, wx, wy); };

/** Trace le contour d'une case (carré ou hexagone) centré sur (sx, sy), réduit d'un facteur. */
export function cheminCase(p: Peintre, sx: number, sy: number, facteur = 1): void {
  const { ctx } = p;
  ctx.beginPath();
  if (p.g.type === 'hex') {
    const pts = coinsHex(sx, sy, tailleHex(p.g) * p.cam.zoom * facteur);
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  } else {
    const d = (p.u / 2) * facteur;
    ctx.rect(sx - d, sy - d, d * 2, d * 2);
  }
}

/** Cases visibles à l'écran (avec une marge). */
export function casesVisiblesEcran(p: Peintre): Cellule[] {
  const [x0, y0] = versMonde(p.cam, 0, 0);
  const [x1, y1] = versMonde(p.cam, p.largeur, p.hauteur);
  const res: Cellule[] = [];
  if (p.g.type === 'hex') {
    const s = tailleHex(p.g), R3 = Math.sqrt(3);
    for (let r = Math.floor(y0 / (1.5 * s)) - 1; r <= Math.ceil(y1 / (1.5 * s)) + 1; r++) {
      for (let q = Math.floor(x0 / (R3 * s) - r / 2) - 1; q <= Math.ceil(x1 / (R3 * s) - r / 2) + 1; q++) res.push([q, r]);
    }
  } else {
    const t = p.g.taille;
    for (let x = Math.floor(x0 / t) - 1; x <= Math.ceil(x1 / t); x++) for (let y = Math.floor(y0 / t) - 1; y <= Math.ceil(y1 / t); y++) res.push([x, y]);
  }
  return res;
}

/** Remplace l'opacité d'une couleur rgba()/hex. */
export function avecAlpha(couleur: string, a: number): string {
  const al = Math.max(0, Math.min(1, a));
  const m = couleur.match(/rgba?\(([^)]+)\)/);
  if (m) { const [r, g, b] = m[1].split(',').map((x) => x.trim()); return `rgba(${r},${g},${b},${al})`; }
  if (/^#[0-9a-f]{6}$/i.test(couleur)) {
    const n = parseInt(couleur.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${al})`;
  }
  return couleur;
}

export const COULEUR_CAMP: Record<Camp, string> = { pj: '#4a90d9', allie: '#45a84a', ennemi: '#d94848', neutre: '#c9a84c' };
export const OR = '#c9a84c';
export const POLICE_TITRE = "'Marcellus SC', Georgia, serif";
export const POLICE_CHIFFRES = "ui-monospace, 'JetBrains Mono', monospace";

export function texteOmbre(p: Peintre, texte: string, x: number, y: number, couleur: string, police: string): void {
  const { ctx } = p;
  ctx.save();
  ctx.font = police; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = couleur; ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 3;
  ctx.fillText(texte, x, y);
  ctx.restore();
}
