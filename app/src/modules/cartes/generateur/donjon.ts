// Donjons : salles reliées par des couloirs (pierre, crypte, mine) ou caverne organique (grotte).
import type { Rng } from '../../../noyau/hasard';
import { accessibles, casesLibres, choisir, couloir, entre, grille, salle } from './outils';
import { C, get, set, type OptionsDonjon, type PlanBataille, type Piece } from './types';

const NOMS_SALLES: Record<string, string[]> = {
  pierre: ['Salle de garde', 'Armurerie', 'Cellules', 'Salle du trône', 'Réserve', 'Puits', 'Salle des gardes', 'Chapelle'],
  crypte: ['Ossuaire', 'Caveau', 'Salle des gisants', 'Chapelle funéraire', 'Niche', 'Sanctuaire scellé'],
  mine: ['Galerie', 'Filon', 'Dépôt', 'Puits d’extraction', 'Forge', 'Effondrement'],
};

function relier(p: PlanBataille, pieces: Piece[], r: Rng): void {
  const ctr = (q: Piece): [number, number] => [q.x + (q.l >> 1), q.y + (q.h >> 1)];
  const lies = [0];
  for (let i = 1; i < pieces.length; i++) {
    // Prim : la pièce non liée la plus proche d'une pièce liée.
    let best = [-1, -1, 1e9];
    for (let a = 0; a < pieces.length; a++) {
      if (lies.includes(a)) continue;
      for (const b of lies) {
        const [ax, ay] = ctr(pieces[a]), [bx, by] = ctr(pieces[b]);
        const d = Math.abs(ax - bx) + Math.abs(ay - by);
        if (d < best[2]) best = [a, b, d];
      }
    }
    couloir(p, ctr(pieces[best[0]]), ctr(pieces[best[1]]), r);
    lies.push(best[0]);
  }
  // Une ou deux boucles pour éviter le donjon en arbre.
  for (let k = 0; k < Math.min(2, pieces.length - 2); k++) {
    const a = entre(r, 0, pieces.length - 1), b = entre(r, 0, pieces.length - 1);
    if (a !== b) couloir(p, ctr(pieces[a]), ctr(pieces[b]), r);
  }
}

function portes(p: PlanBataille, pieces: Piece[], r: Rng): void {
  for (const q of pieces) {
    for (let i = q.x - 1; i <= q.x + q.l; i++) for (const j of [q.y - 1, q.y + q.h]) porte(p, i, j, r, true);
    for (let j = q.y; j < q.y + q.h; j++) for (const i of [q.x - 1, q.x + q.l]) porte(p, i, j, r, false);
  }
}
function porte(p: PlanBataille, x: number, y: number, r: Rng, horizontal: boolean): void {
  if (get(p, x, y) !== C.sol) return;
  // une ouverture dans un mur : murs de part et d'autre dans l'axe du mur
  const ok = horizontal ? get(p, x - 1, y) === C.mur && get(p, x + 1, y) === C.mur : get(p, x, y - 1) === C.mur && get(p, x, y + 1) === C.mur;
  if (ok && r() < 0.7) set(p, x, y, C.porte);
}

function decorer(p: PlanBataille, pieces: Piece[], amb: string, r: Rng): void {
  pieces.forEach((q, i) => {
    q.nom = i === 0 ? 'Entrée' : choisir(r, NOMS_SALLES[amb] ?? NOMS_SALLES.pierre);
    if (q.l >= 7 && q.h >= 6 && r() < 0.6) {
      for (let x = q.x + 1; x < q.x + q.l - 1; x += 3) { set(p, x, q.y + 1, C.colonne); set(p, x, q.y + q.h - 2, C.colonne); }
    }
    const n = amb === 'crypte' ? entre(r, 1, 3) : amb === 'mine' ? entre(r, 1, 4) : entre(r, 0, 2);
    for (const [x, y] of casesLibres(p, r, { x: q.x + 1, y: q.y + 1, l: Math.max(1, q.l - 2), h: Math.max(1, q.h - 2) }, n)) {
      set(p, x, y, amb === 'mine' ? C.rocher : C.meuble);
    }
  });
  const e = pieces[0];
  set(p, e.x, e.y, C.escalier);
}

function grotte(p: PlanBataille, r: Rng): void {
  const { largeur: L, hauteur: H } = p;
  let g = p.cases.map((_, k) => { const x = k % L, y = (k / L) | 0; return x === 0 || y === 0 || x === L - 1 || y === H - 1 || r() < 0.46 ? 1 : 0; });
  for (let it = 0; it < 5; it++) {
    g = g.map((_, k) => {
      const x = k % L, y = (k / L) | 0;
      if (x === 0 || y === 0 || x === L - 1 || y === H - 1) return 1;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += g[(y + dy) * L + x + dx];
      return n >= 5 ? 1 : 0;
    });
  }
  p.cases = g.map((v) => (v ? C.mur : C.sol));
  // garder la plus grande poche
  let meilleure = new Set<number>();
  const vus = new Set<number>();
  p.cases.forEach((v, k) => {
    if (v !== C.sol || vus.has(k)) return;
    const s = accessibles(p, [k % L, (k / L) | 0]);
    s.forEach((x) => vus.add(x));
    if (s.size > meilleure.size) meilleure = s;
  });
  p.cases = p.cases.map((v, k) => (v === C.sol && !meilleure.has(k) ? C.mur : v));
  // eau et rochers
  p.cases.forEach((v, k) => { if (v === C.sol && r() < 0.03) p.cases[k] = C.rocher; });
}

export function genererDonjon(r: Rng, titre: string, graine: string, o: OptionsDonjon = {}): PlanBataille {
  const L = o.largeur ?? 34, H = o.hauteur ?? 26, amb = o.ambiance ?? 'pierre';
  const p: PlanBataille = { titre, theme: 'donjon', ambiance: amb, largeur: L, hauteur: H, cases: grille(L, H, C.vide), pieces: [], depart: [], ennemis: [], graine };
  if (amb === 'grotte') {
    grotte(p, r);
    const sols = p.cases.map((v, k) => (v === C.sol ? k : -1)).filter((k) => k >= 0);
    const xy = (k: number): [number, number] => [k % L, (k / L) | 0];
    const a = xy(sols.reduce((m, k) => (k % L < m % L ? k : m), sols[0]));
    const b = xy(sols.reduce((m, k) => (k % L > m % L ? k : m), sols[0]));
    p.depart = casesLibres(p, r, { x: a[0] - 2, y: a[1] - 2, l: 5, h: 5 }, 4);
    p.ennemis = casesLibres(p, r, { x: b[0] - 3, y: b[1] - 3, l: 7, h: 7 }, 5);
    p.pieces = [{ x: a[0] - 2, y: a[1] - 2, l: 5, h: 5, nom: 'Entrée' }, { x: b[0] - 3, y: b[1] - 3, l: 7, h: 7, nom: 'Antre' }];
    return p;
  }
  const n = o.pieces ?? entre(r, 6, 9);
  for (let t = 0; t < 400 && p.pieces.length < n; t++) {
    const l = entre(r, 4, 9), h = entre(r, 4, 7), x = entre(r, 2, L - l - 3), y = entre(r, 2, H - h - 3);
    if (p.pieces.some((q) => x < q.x + q.l + 3 && x + l + 3 > q.x && y < q.y + q.h + 3 && y + h + 3 > q.y)) continue;
    p.pieces.push({ x, y, l, h, nom: '' });
  }
  p.pieces.sort((a, b) => a.x + a.y - (b.x + b.y));
  for (const q of p.pieces) salle(p, q.x, q.y, q.l, q.h);
  relier(p, p.pieces, r);
  portes(p, p.pieces, r);
  decorer(p, p.pieces, amb, r);
  // Départ dans la première salle, adversaires dans la plus éloignée (et un peu ailleurs).
  const loin = p.pieces.reduce((m, q) => (q.x + q.y > m.x + m.y ? q : m), p.pieces[0]);
  loin.nom = amb === 'crypte' ? 'Tombeau' : amb === 'mine' ? 'Cœur de la mine' : 'Salle du maître';
  p.depart = casesLibres(p, r, p.pieces[0], 4);
  p.ennemis = [...casesLibres(p, r, loin, 4), ...p.pieces.filter((q) => q !== loin && q !== p.pieces[0]).slice(0, 2).flatMap((q) => casesLibres(p, r, q, 1))];
  return p;
}
