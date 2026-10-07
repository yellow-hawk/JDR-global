// Rendu d'un plan de bataille en image (canevas du navigateur). Version joueurs propre ; version MJ avec
// noms des pièces et emplacements des adversaires.
import { rngFor } from '../../../noyau/hasard';
import { C, get, type Ambiance, type PlanBataille } from './types';

export const PX_CASE = 70;

const SOLS: Record<Ambiance, [string, string]> = {
  pierre: ['#7b7368', '#6a6359'], crypte: ['#6c6670', '#5c5661'], grotte: ['#6e6457', '#5e5549'], mine: ['#75634d', '#66563f'],
  bois: ['#9b7146', '#8a6239'], marbre: ['#d8d2c6', '#c9c2b4'], herbe: ['#6f8f45', '#62803b'], foret: ['#566f37', '#4b6230'],
  sable: ['#d8bf86', '#cdb277'], neige: ['#e8eef2', '#dbe3e9'], marais: ['#5d6b3f', '#525f36'], roche: ['#8c7f6d', '#7d715f'],
};
const MASSE: Partial<Record<Ambiance, string>> = { pierre: '#2b2724', crypte: '#25222a', grotte: '#3a3128', mine: '#33291f' };

const melange = (a: string, b: string, t: number): string => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
};

export function dessinerPlan(p: PlanBataille, mj = false, px = PX_CASE): HTMLCanvasElement {
  const can = document.createElement('canvas');
  can.width = p.largeur * px; can.height = p.hauteur * px;
  const c = can.getContext('2d')!;
  const r = rngFor(p.graine, 'rendu');
  const [s1, s2] = SOLS[p.ambiance];
  const masse = MASSE[p.ambiance] ?? '#3b3a30';
  const X = (x: number) => x * px, Y = (y: number) => y * px;

  // 1. sols (case par case, légère variation), masse rocheuse pour le vide
  for (let y = 0; y < p.hauteur; y++) for (let x = 0; x < p.largeur; x++) {
    const v = get(p, x, y);
    if (v === C.vide) { c.fillStyle = masse; c.fillRect(X(x), Y(y), px, px); continue; }
    if (v === C.chemin) c.fillStyle = melange('#a88e66', '#97805b', r());
    else if (v === C.eau || v === C.gue) c.fillStyle = melange(v === C.gue ? '#5f8fa8' : '#3f6f93', '#4a7c9e', r());
    else c.fillStyle = melange(s1, s2, r());
    c.fillRect(X(x), Y(y), px + 1, px + 1);
    // motif du sol
    c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 1;
    if (p.ambiance === 'bois' && v === C.sol) { for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(X(x), Y(y) + (k * px) / 4); c.lineTo(X(x) + px, Y(y) + (k * px) / 4); c.stroke(); } }
    else if ((p.theme !== 'exterieur' && v === C.sol) || v === C.chemin && p.theme === 'interieur') { c.strokeRect(X(x) + 0.5, Y(y) + 0.5, px - 1, px - 1); }
    else if (v === C.sol) { for (let k = 0; k < 3; k++) { c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(X(x) + r() * px, Y(y) + r() * px, 3, 3); } }
    if (v === C.eau || v === C.gue) { c.strokeStyle = 'rgba(255,255,255,.25)'; c.beginPath(); const yy = Y(y) + px * (0.3 + r() * 0.4); c.moveTo(X(x) + 8, yy); c.quadraticCurveTo(X(x) + px / 2, yy - 6, X(x) + px - 8, yy); c.stroke(); }
    if (v === C.gue) for (let k = 0; k < 3; k++) { c.fillStyle = '#8d8a80'; c.beginPath(); c.arc(X(x) + r() * px, Y(y) + r() * px, 6 + r() * 5, 0, Math.PI * 2); c.fill(); }
  }
  // 2. murs (avec ombre portée)
  for (let y = 0; y < p.hauteur; y++) for (let x = 0; x < p.largeur; x++) {
    if (get(p, x, y) !== C.mur) continue;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(X(x) + 6, Y(y) + 6, px, px);
  }
  for (let y = 0; y < p.hauteur; y++) for (let x = 0; x < p.largeur; x++) {
    if (get(p, x, y) !== C.mur) continue;
    c.fillStyle = p.ambiance === 'bois' ? '#4e3b28' : p.ambiance === 'marbre' ? '#8e877c' : melange('#4a4540', '#3e3a35', r());
    c.fillRect(X(x), Y(y), px, px);
    c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(X(x), Y(y), px, 6);
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.strokeRect(X(x) + 0.5, Y(y) + 0.5, px - 1, px - 1);
  }
  // 3. objets
  for (let y = 0; y < p.hauteur; y++) for (let x = 0; x < p.largeur; x++) {
    const v = get(p, x, y), cx = X(x) + px / 2, cy = Y(y) + px / 2;
    if (v === C.porte) {
      const horiz = get(p, x - 1, y) === C.mur || get(p, x + 1, y) === C.mur;
      c.fillStyle = '#6b4a2b'; c.strokeStyle = '#2e1f12'; c.lineWidth = 2;
      if (horiz) { c.fillRect(X(x) + 4, cy - 9, px - 8, 18); c.strokeRect(X(x) + 4, cy - 9, px - 8, 18); }
      else { c.fillRect(cx - 9, Y(y) + 4, 18, px - 8); c.strokeRect(cx - 9, Y(y) + 4, 18, px - 8); }
    } else if (v === C.arbre) {
      const rr = px * (0.42 + r() * 0.2);
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.arc(cx + 8, cy + 8, rr, 0, Math.PI * 2); c.fill();
      const base = p.ambiance === 'neige' ? '#3f5f4f' : p.ambiance === 'marais' ? '#4c5e2c' : '#3f6b2a';
      for (let k = 0; k < 5; k++) { c.fillStyle = melange(base, '#6f9a45', r() * 0.6); c.beginPath(); c.arc(cx + (r() - 0.5) * rr * 0.6, cy + (r() - 0.5) * rr * 0.6, rr * (0.55 + r() * 0.3), 0, Math.PI * 2); c.fill(); }
      if (p.ambiance === 'neige') { c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(cx - rr * 0.2, cy - rr * 0.2, rr * 0.35, 0, Math.PI * 2); c.fill(); }
    } else if (v === C.rocher) {
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(cx + 5, cy + 6, px * 0.36, px * 0.28, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = melange('#8b867c', '#6f6a62', r()); c.beginPath();
      for (let k = 0; k < 7; k++) { const t = (k / 7) * Math.PI * 2, rr = px * (0.28 + r() * 0.12); const a = cx + Math.cos(t) * rr, b = cy + Math.sin(t) * rr; if (k) c.lineTo(a, b); else c.moveTo(a, b); }
      c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.stroke();
    } else if (v === C.colonne) {
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(cx + 6, cy + 6, px * 0.36, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#b7b0a3'; c.beginPath(); c.arc(cx, cy, px * 0.36, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#6f695f'; c.lineWidth = 3; c.stroke(); c.beginPath(); c.arc(cx, cy, px * 0.22, 0, Math.PI * 2); c.stroke();
    } else if (v === C.meuble) {
      c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(X(x) + 12, Y(y) + 14, px - 18, px - 20);
      c.fillStyle = p.ambiance === 'crypte' ? '#8a8378' : p.theme === 'exterieur' ? '#9c7a4f' : '#7a5332';
      c.fillRect(X(x) + 8, Y(y) + 10, px - 16, px - 20);
      c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 2; c.strokeRect(X(x) + 8, Y(y) + 10, px - 16, px - 20);
    } else if (v === C.escalier) {
      c.fillStyle = '#5b544b'; c.fillRect(X(x) + 4, Y(y) + 4, px - 8, px - 8);
      c.strokeStyle = '#c9c0b0'; c.lineWidth = 2;
      for (let k = 1; k < 6; k++) { c.beginPath(); c.moveTo(X(x) + 6, Y(y) + (k * px) / 6); c.lineTo(X(x) + px - 6, Y(y) + (k * px) / 6); c.stroke(); }
    }
  }
  // 4. vignettage léger
  const g = c.createRadialGradient(can.width / 2, can.height / 2, Math.min(can.width, can.height) * 0.3, can.width / 2, can.height / 2, Math.max(can.width, can.height) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.35)');
  c.fillStyle = g; c.fillRect(0, 0, can.width, can.height);
  // 5. version MJ : pièces et adversaires
  if (mj) {
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `italic 600 ${Math.round(px * 0.42)}px Georgia, serif`;
    for (const q of p.pieces) {
      const x = X(q.x + q.l / 2), y = Y(q.y) + px * 0.55;
      c.lineWidth = 5; c.strokeStyle = 'rgba(20,14,8,.85)'; c.strokeText(q.nom, x, y); c.fillStyle = '#ffe9b0'; c.fillText(q.nom, x, y);
    }
    for (const [x, y] of p.ennemis) {
      c.strokeStyle = 'rgba(200,40,30,.9)'; c.lineWidth = 6; const a = X(x) + 14, b = Y(y) + 14, e = px - 28;
      c.beginPath(); c.moveTo(a, b); c.lineTo(a + e, b + e); c.moveTo(a + e, b); c.lineTo(a, b + e); c.stroke();
    }
    for (const [x, y] of p.depart) { c.strokeStyle = 'rgba(60,130,220,.9)'; c.lineWidth = 5; c.beginPath(); c.arc(X(x) + px / 2, Y(y) + px / 2, px * 0.3, 0, Math.PI * 2); c.stroke(); }
  }
  return can;
}

export const imagePlan = (p: PlanBataille, mj = false): Promise<Blob> =>
  new Promise((ok, ko) => dessinerPlan(p, mj).toBlob((b) => (b ? ok(b) : ko(new Error('Rendu impossible'))), 'image/jpeg', 0.86));
