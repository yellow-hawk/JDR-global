// Intérieurs de bâtiments : taverne, temple, palais, maison, tour, fort, entrepôt, bibliothèque.
// Le bâtiment est découpé en pièces (partition binaire), une porte par cloison, meubles selon la sorte.
import type { Rng } from '../../../noyau/hasard';
import { casesLibres, choisir, entre, grille, rect } from './outils';
import { C, get, set, type PlanBataille, type Piece, type SorteInterieur } from './types';

interface Zone { x: number; y: number; l: number; h: number }

const PIECES: Record<SorteInterieur, string[]> = {
  taverne: ['Cuisine', 'Réserve', 'Chambre', 'Arrière-salle', 'Cellier'],
  temple: ['Sacristie', 'Cellule', 'Archives', 'Chapelle'],
  palais: ['Antichambre', 'Bureau', 'Chambre', 'Salle des gardes', 'Trésor', 'Galerie'],
  maison: ['Cuisine', 'Chambre', 'Atelier', 'Cellier'],
  tour: ['Réserve', 'Corps de garde'],
  fort: ['Caserne', 'Armurerie', 'Écuries', 'Réserve', 'Mess'],
  entrepot: ['Bureau', 'Réserve', 'Quai'],
  bibliotheque: ['Salle de lecture', 'Archives', 'Scriptorium', 'Réserve'],
};
const SALLE_PRINCIPALE: Record<SorteInterieur, string> = {
  taverne: 'Salle commune', temple: 'Nef', palais: 'Salle du trône', maison: 'Pièce à vivre', tour: 'Salle basse',
  fort: 'Cour', entrepot: 'Entrepôt', bibliotheque: 'Grande salle',
};

/** Découpe récursive ; chaque cloison reçoit une porte. */
function partager(p: PlanBataille, z: Zone, r: Rng, res: Zone[], prof = 0): void {
  const coupeV = z.l > z.h ? true : z.h > z.l ? false : r() < 0.5;
  const taille = coupeV ? z.l : z.h;
  if (taille < 9 || (prof > 1 && r() < 0.25)) { res.push(z); return; }
  const pos = entre(r, 4, taille - 5);
  if (coupeV) {
    const x = z.x + pos;
    for (let y = z.y; y < z.y + z.h; y++) set(p, x, y, C.mur);
    set(p, x, entre(r, z.y + 1, z.y + z.h - 2), C.porte);
    partager(p, { x: z.x, y: z.y, l: pos, h: z.h }, r, res, prof + 1);
    partager(p, { x: x + 1, y: z.y, l: z.l - pos - 1, h: z.h }, r, res, prof + 1);
  } else {
    const y = z.y + pos;
    for (let x = z.x; x < z.x + z.l; x++) set(p, x, y, C.mur);
    set(p, entre(r, z.x + 1, z.x + z.l - 2), y, C.porte);
    partager(p, { x: z.x, y: z.y, l: z.l, h: pos }, r, res, prof + 1);
    partager(p, { x: z.x, y: y + 1, l: z.l, h: z.h - pos - 1 }, r, res, prof + 1);
  }
}

function meubler(p: PlanBataille, s: SorteInterieur, main: Zone, autres: Zone[], r: Rng): void {
  const libre = (x: number, y: number) => get(p, x, y) === C.sol && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => get(p, x + dx, y + dy) === C.porte);
  const poser = (x: number, y: number, v: number) => { if (libre(x, y)) set(p, x, y, v); };
  if (s === 'taverne') {
    for (let x = main.x + 1; x < main.x + Math.min(main.l - 1, 6); x++) poser(x, main.y + 1, C.meuble); // comptoir
    for (let y = main.y + 3; y < main.y + main.h - 1; y += 3) for (let x = main.x + 2; x < main.x + main.l - 1; x += 4) { poser(x, y, C.meuble); if (r() < 0.6) poser(x + 1, y, C.meuble); }
  } else if (s === 'temple' || s === 'palais') {
    for (let y = main.y + 2; y < main.y + main.h - 1; y += 3) { poser(main.x + 1, y, C.colonne); poser(main.x + main.l - 2, y, C.colonne); }
    const cx = main.x + (main.l >> 1);
    poser(cx, main.y + 1, C.meuble); poser(cx - 1, main.y + 1, C.meuble); // autel ou trône
    if (s === 'temple') for (let y = main.y + 4; y < main.y + main.h - 2; y += 2) for (const x of [cx - 3, cx - 2, cx + 2, cx + 3]) poser(x, y, C.meuble); // bancs
  } else if (s === 'bibliotheque' || s === 'entrepot') {
    for (let x = main.x + 1; x < main.x + main.l - 1; x += 3) for (let y = main.y + 1; y < main.y + main.h - 2; y++) poser(x, y, C.meuble);
  } else if (s === 'tour') {
    poser(main.x + (main.l >> 1), main.y + (main.h >> 1), C.escalier);
  }
  for (const z of autres) for (const [x, y] of casesLibres(p, r, { x: z.x + 1, y: z.y + 1, l: Math.max(1, z.l - 2), h: Math.max(1, z.h - 2) }, entre(r, 1, 3))) poser(x, y, C.meuble);
}

export function genererInterieur(r: Rng, titre: string, graine: string, sorte: SorteInterieur): PlanBataille {
  const dims: Record<SorteInterieur, [number, number]> = {
    taverne: [24, 18], temple: [22, 26], palais: [32, 26], maison: [16, 13], tour: [13, 13], fort: [32, 28], entrepot: [22, 16], bibliotheque: [24, 18],
  };
  const [bl, bh] = dims[sorte];
  const L = bl + 8, H = bh + 8, bx = 4, by = 3;
  const p: PlanBataille = {
    titre, theme: 'interieur', ambiance: sorte === 'palais' || sorte === 'temple' ? 'marbre' : sorte === 'fort' || sorte === 'tour' ? 'pierre' : 'bois',
    largeur: L, hauteur: H, cases: grille(L, H, C.chemin), pieces: [], depart: [], ennemis: [], graine,
  };
  // Abords : quelques arbres et rochers.
  for (let k = 0; k < L * H * 0.02; k++) { const x = entre(r, 0, L - 1), y = entre(r, 0, H - 1); if (x < bx - 1 || x > bx + bl || y < by - 1 || y > by + bh) set(p, x, y, r() < 0.6 ? C.arbre : C.rocher); }
  rect(p, bx, by, bl, bh, C.mur);
  rect(p, bx + 1, by + 1, bl - 2, bh - 2, sorte === 'fort' ? C.chemin : C.sol);
  const int: Zone = { x: bx + 1, y: by + 1, l: bl - 2, h: bh - 2 };
  // Salle principale : une grande part du bâtiment, côté entrée (sud) ; le reste est découpé.
  let main: Zone, reste: Zone | null;
  if (sorte === 'tour' || sorte === 'maison' && r() < 0.3) { main = int; reste = null; }
  else if (sorte === 'fort') {
    main = { x: int.x + 5, y: int.y + 5, l: int.l - 10, h: int.h - 10 };
    for (const z of [{ x: int.x, y: int.y, l: int.l, h: 4 }, { x: int.x, y: int.y + int.h - 4, l: int.l, h: 4 }]) {
      rect(p, z.x, z.y, z.l, z.h, C.sol);
      for (let x = z.x; x < z.x + z.l; x++) set(p, x, z.y === int.y ? z.y + 4 : z.y - 1, C.mur);
      set(p, z.x + (z.l >> 1), z.y === int.y ? z.y + 4 : z.y - 1, C.porte);
    }
    reste = null;
  } else {
    const hMain = Math.round(int.h * (sorte === 'temple' || sorte === 'palais' ? 0.7 : 0.55));
    main = { x: int.x, y: int.y + int.h - hMain, l: int.l, h: hMain };
    reste = { x: int.x, y: int.y, l: int.l, h: int.h - hMain - 1 };
    const yc = main.y - 1;
    for (let x = int.x; x < int.x + int.l; x++) set(p, x, yc, C.mur);
    set(p, entre(r, int.x + 2, int.x + int.l - 3), yc, C.porte);
  }
  const autres: Zone[] = [];
  if (reste && reste.h >= 3) partager(p, reste, r, autres);
  // Entrée au sud, une porte de service à l'est.
  const ex = bx + (bl >> 1);
  set(p, ex, by + bh - 1, C.porte);
  if (sorte !== 'tour') set(p, bx + bl - 1, by + entre(r, 2, bh - 3), C.porte);
  meubler(p, sorte, main, autres, r);
  p.pieces = [{ ...main, nom: SALLE_PRINCIPALE[sorte] }, ...autres.map((z) => ({ ...z, nom: choisir(r, PIECES[sorte]) } as Piece))];
  p.depart = casesLibres(p, r, { x: ex - 3, y: by + bh + 1, l: 7, h: 3 }, 4);
  const fond = autres.length ? autres : [main];
  p.ennemis = [...casesLibres(p, r, main, 3), ...fond.slice(0, 3).flatMap((z) => casesLibres(p, r, z, 1))];
  return p;
}
