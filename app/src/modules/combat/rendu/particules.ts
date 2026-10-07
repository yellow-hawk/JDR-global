// Particules des sorts (feu, glace, foudre, sacré, ténèbres). État mutable local à l'affichage, hors historique.
import type { Peintre } from './peintre';
import { versEcran } from './camera';

export interface Particule { wx: number; wy: number; vx: number; vy: number; vie: number; usure: number; couleur: string; taille: number }

const PALETTES: Record<string, string[]> = {
  feu: ['#ff4400', '#ff8800', '#ffcc00'], glace: ['#88ddff', '#aaeeff', '#ffffff'], foudre: ['#00ffff', '#88eeff', '#ffffff'],
  sacre: ['#ffd700', '#ffe080', '#ffffff'], tenebres: ['#442266', '#221133', '#000000'],
};
export const PARTICULES = Object.keys(PALETTES);

export function emettre(liste: Particule[], wx: number, wy: number, sorte: string, n = 35, alea: () => number = Math.random): void {
  const pal = PALETTES[sorte] ?? PALETTES.feu;
  for (let i = 0; i < n; i++) {
    liste.push({
      wx, wy, vx: (alea() - 0.5) * 70, vy: (alea() - 0.5) * 70 - 25, vie: 1, usure: 0.01 + alea() * 0.025,
      couleur: pal[Math.floor(alea() * pal.length)], taille: 2 + alea() * 4,
    });
  }
}

/** Avance d'un pas (≈ 16 ms). Renvoie vrai s'il reste des particules. */
export function avancer(liste: Particule[]): boolean {
  for (let i = liste.length - 1; i >= 0; i--) {
    const q = liste[i];
    q.wx += q.vx * 0.016; q.wy += q.vy * 0.016; q.vy += 1.6; q.vie -= q.usure;
    if (q.vie <= 0) liste.splice(i, 1);
  }
  return liste.length > 0;
}

export function dessinerParticules(p: Peintre, liste: Particule[]): void {
  const { ctx } = p;
  ctx.save();
  for (const q of liste) {
    const [sx, sy] = versEcran(p.cam, q.wx, q.wy);
    ctx.globalAlpha = q.vie; ctx.fillStyle = q.couleur;
    ctx.beginPath(); ctx.arc(sx, sy, Math.max(1, q.taille * p.cam.zoom * 0.6), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
