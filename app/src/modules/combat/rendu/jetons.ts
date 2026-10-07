// Dessin des jetons et de leurs auras : portrait, barre de PV, croix KO, concentration, états, sélection.
import type { Jeton } from '../moteur/types';
import { avecAlpha, cheminCase, COULEUR_CAMP, ecran, OR, POLICE_TITRE, texteOmbre, type Peintre } from './peintre';
import { statsVisibles, type Public } from './visibilite';

export interface MarquesJeton { choisi: boolean; actif: boolean; lanceur: boolean; attaquant: boolean; cible: 'degats' | 'soin' | null }

export const couleurJeton = (j: Jeton): string => j.couleur || COULEUR_CAMP[j.camp];

export function dessinerAuras(p: Peintre, jetons: Jeton[]): void {
  const { ctx } = p;
  for (const j of jetons) {
    if (j.pv <= 0) continue;
    const [sx, sy] = ecran(p, [j.x, j.y]);
    for (const a of j.auras) {
      ctx.save();
      ctx.beginPath(); ctx.arc(sx, sy, a.rayon * p.u, 0, Math.PI * 2);
      ctx.fillStyle = avecAlpha(a.couleur, 0.12); ctx.fill();
      ctx.strokeStyle = avecAlpha(a.couleur, 0.4); ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
  }
}

function anneau(p: Peintre, sx: number, sy: number, r: number, couleur: string, largeur: number, tirets?: number[], lueur = false): void {
  const { ctx } = p;
  ctx.save();
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.strokeStyle = couleur; ctx.lineWidth = largeur;
  if (tirets) ctx.setLineDash(tirets);
  if (lueur) { ctx.shadowColor = couleur; ctx.shadowBlur = 10; }
  ctx.stroke();
  ctx.restore();
}

export function dessinerJeton(p: Peintre, j: Jeton, pub: Public, m: MarquesJeton, portrait: CanvasImageSource | null, opacite: number): void {
  const { ctx } = p;
  const [sx, sy] = ecran(p, [j.x, j.y]);
  const taille = j.taille * p.uc;
  const r = Math.max(4, taille / 2 - 2);
  const col = couleurJeton(j);
  ctx.save();
  ctx.globalAlpha = opacite * (j.visible ? 1 : 0.45);
  // Corps
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 5;
  if (p.g.type === 'hex' && j.taille === 1) cheminCase(p, sx, sy, 0.92); else { ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); }
  ctx.fillStyle = avecAlpha(col, 0.3); ctx.fill();
  ctx.restore();
  if (portrait) {
    ctx.save();
    ctx.beginPath(); ctx.arc(sx, sy, r - 2, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(portrait, sx - r + 2, sy - r + 2, (r - 2) * 2, (r - 2) * 2);
    ctx.restore();
  }
  if (p.g.type === 'hex' && j.taille === 1) cheminCase(p, sx, sy, 0.92); else { ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); }
  ctx.strokeStyle = col; ctx.lineWidth = m.choisi ? 3 : 2; ctx.stroke();

  if (m.actif) anneau(p, sx, sy, r + 7, OR, 2, undefined, true);
  if (m.lanceur) anneau(p, sx, sy, r + 6, OR, 2, undefined, true);
  if (m.attaquant) anneau(p, sx, sy, r + 6, '#d94848', 2, undefined, true);
  if (m.choisi) anneau(p, sx, sy, r + 3, OR, 1.5, [3, 3]);
  if (m.cible) anneau(p, sx, sy, r + 4, m.cible === 'degats' ? 'rgba(217,72,72,.8)' : 'rgba(69,168,74,.8)', 2, [3, 3]);
  if (j.concentration) anneau(p, sx, sy, r + 5, '#9b59b6', 1, [2, 2]);

  if (statsVisibles(j, pub)) {
    const pct = Math.max(0, Math.min(1, j.pv / Math.max(1, j.pvMax)));
    const bw = taille - 8, bh = Math.max(3, p.uc * 0.08), bx = sx - bw / 2, by = sy + r - bh - 1;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = pct > 0.5 ? '#45a84a' : pct > 0.25 ? '#e67e22' : '#d94848'; ctx.fillRect(bx, by, bw * pct, bh);
  }
  if (j.pv <= 0) {
    ctx.save(); ctx.globalAlpha *= 0.75; ctx.strokeStyle = '#d94848'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(sx - r * 0.45, sy - r * 0.45); ctx.lineTo(sx + r * 0.45, sy + r * 0.45);
    ctx.moveTo(sx + r * 0.45, sy - r * 0.45); ctx.lineTo(sx - r * 0.45, sy + r * 0.45); ctx.stroke(); ctx.restore();
  }
  if (!portrait || p.uc * j.taille > 70) {
    const fs = Math.max(7, Math.min(13, p.uc * 0.22));
    const nom = j.nom.length > 9 ? `${j.nom.slice(0, 8)}…` : j.nom;
    texteOmbre(p, nom, sx, portrait ? sy - r - fs * 0.7 : sy - 1, '#f2ede2', `600 ${fs}px ${POLICE_TITRE}`);
  }
  if (j.conditions.length) {
    ctx.beginPath(); ctx.arc(sx + r * 0.72, sy - r * 0.72, Math.max(3, p.uc * 0.08), 0, Math.PI * 2);
    ctx.fillStyle = '#d94848'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.restore();
}
