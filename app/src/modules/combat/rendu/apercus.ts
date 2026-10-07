// Aperçus d'outils : portée de déplacement + chemin, mesure, polygone en cours, portée d'attaque, sort visé, pinceau.
import { chemin, type Portee } from '../moteur/deplacement';
import { distance } from '../moteur/grille';
import { PORTEE_ATTAQUE } from '../moteur/regles';
import type { Cellule, Gabarit, Jeton, TypeTerrain, Zone } from '../moteur/types';
import { cle } from '../moteur/types';
import { cheminCase, ecran, OR, POLICE_CHIFFRES, texteOmbre, type Peintre } from './peintre';
import { dessinerZone } from './zones';

export interface Apercu {
  survol?: Cellule | null;
  portee?: { jeton: Jeton; cases: Portee } | null;
  mesure?: [Cellule, Cellule] | null;
  polygone?: Cellule[] | null;
  attaque?: { jeton: Jeton; sorte: 'melee' | 'distance' } | null;
  sort?: { gabarit: Gabarit; lanceur: Jeton; zone: Omit<Zone, 'id'> } | null;
  zone?: Omit<Zone, 'id'> | null;          // zone de sort ou de terrain en cours de pose
  pinceau?: { centre: Cellule; rayon: number } | null;
}

export const METRES_CASE = 1.5;

export function dessinerPortee(p: Peintre, a: NonNullable<Apercu['portee']>, survol: Cellule | null | undefined): void {
  const { ctx } = p;
  ctx.save();
  for (const k in a.cases) {
    const [x, y] = k.split(',').map(Number);
    const [sx, sy] = ecran(p, [x, y]);
    cheminCase(p, sx, sy, 0.9);
    ctx.fillStyle = 'rgba(69,168,74,.15)'; ctx.fill();
    ctx.strokeStyle = 'rgba(69,168,74,.4)'; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.restore();
  if (!survol || !a.cases[cle(survol)]) return;
  const ch = chemin(a.cases, survol);
  ctx.save();
  ctx.strokeStyle = OR; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ch.forEach((c, i) => { const [x, y] = ecran(p, c); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
  ctx.stroke();
  ctx.restore();
  const [sx, sy] = ecran(p, survol);
  const reste = a.jeton.vitesse - a.jeton.mouvementUtilise;
  texteOmbre(p, `${a.cases[cle(survol)].cout}/${reste}`, sx, sy, OR, `bold 11px ${POLICE_CHIFFRES}`);
}

function dessinerMesure(p: Peintre, [a, b]: [Cellule, Cellule]): void {
  const { ctx } = p;
  const [x0, y0] = ecran(p, a), [x1, y1] = ecran(p, b);
  ctx.save();
  ctx.setLineDash([6, 4]); ctx.strokeStyle = OR; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.restore();
  const d = distance(p.g, a, b);
  texteOmbre(p, `${d} case${d > 1 ? 's' : ''} (${(d * METRES_CASE).toLocaleString('fr-FR')} m)`, (x0 + x1) / 2, (y0 + y1) / 2 - 10, OR, `bold 12px ${POLICE_CHIFFRES}`);
}

function dessinerPolygone(p: Peintre, pts: Cellule[], survol: Cellule | null | undefined): void {
  const { ctx } = p;
  ctx.save();
  ctx.setLineDash([4, 4]); ctx.strokeStyle = OR; ctx.lineWidth = 2;
  ctx.beginPath();
  [...pts, ...(survol ? [survol] : [])].forEach((c, i) => { const [x, y] = ecran(p, c); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
  ctx.stroke();
  ctx.setLineDash([]); ctx.fillStyle = OR;
  for (const c of pts) { const [x, y] = ecran(p, c); ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function cercleTirets(p: Peintre, c: Cellule, rayonCases: number, couleur: string): void {
  const { ctx } = p;
  const [sx, sy] = ecran(p, c);
  ctx.save();
  ctx.beginPath(); ctx.arc(sx, sy, rayonCases * p.u, 0, Math.PI * 2);
  ctx.setLineDash([5, 5]); ctx.strokeStyle = couleur; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

function dessinerSort(p: Peintre, s: NonNullable<Apercu['sort']>, temps: number): void {
  const { ctx } = p;
  if (s.gabarit.portee > 0 && s.gabarit.origine === 'point') cercleTirets(p, [s.lanceur.x, s.lanceur.y], s.gabarit.portee, 'rgba(201,168,76,.4)');
  const pulsation = 0.3 + Math.sin(temps / 300) * 0.1;
  dessinerZone(p, { ...s.zone, nom: '' }, pulsation, []);
  if (['cone', 'ligne', 'rectangle'].includes(s.zone.forme)) {
    const [ox, oy] = ecran(p, [s.zone.x, s.zone.y]);
    const d = s.zone.rayon * p.u * (s.zone.forme === 'cone' ? 0.7 : 1);
    ctx.save(); ctx.fillStyle = OR;
    ctx.beginPath(); ctx.arc(ox + Math.cos(s.zone.angle) * d, oy + Math.sin(s.zone.angle) * d, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function dessinerPinceau(p: Peintre, b: NonNullable<Apercu['pinceau']>): void {
  const { ctx } = p;
  const [sx, sy] = ecran(p, b.centre);
  ctx.save();
  ctx.beginPath(); ctx.arc(sx, sy, (b.rayon + 0.5) * p.u, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.setLineDash([3, 3]); ctx.stroke();
  ctx.restore();
}

/** Aperçus dessinés au-dessus des jetons (la portée de déplacement, elle, est dessinée dessous). */
export function dessinerApercus(p: Peintre, a: Apercu, types: TypeTerrain[], temps: number): void {
  if (a.zone) dessinerZone(p, a.zone, 0.3, types);
  if (a.mesure) dessinerMesure(p, a.mesure);
  if (a.polygone?.length) dessinerPolygone(p, a.polygone, a.survol);
  if (a.attaque) cercleTirets(p, [a.attaque.jeton.x, a.attaque.jeton.y], PORTEE_ATTAQUE[a.attaque.sorte] + 0.5, 'rgba(217,72,72,.6)');
  if (a.sort) dessinerSort(p, a.sort, temps);
  if (a.pinceau) dessinerPinceau(p, a.pinceau);
  if (a.survol && (a.polygone || a.zone)) {
    const [x, y] = ecran(p, a.survol);
    p.ctx.save(); p.ctx.beginPath(); p.ctx.arc(x, y, 4, 0, Math.PI * 2); p.ctx.strokeStyle = OR; p.ctx.lineWidth = 2; p.ctx.stroke(); p.ctx.restore();
  }
}
