// Lecture d'un tracé à main levée : trouve la cerne, regroupe les traits en signes et les reconnaît.
import { gerceStroke, rotate, type Pt, type Stroke } from './geometry';
import { reconnaitre, type Perso } from './recognizer';
import { SIGNE, type Rang } from '../data/signes';
import type { Placement, Sceau, Taille } from './types';

/** Score minimal pour accepter un signe, selon son rang (tolérance de tracé) */
export const SEUILS: Record<Rang, number> = { 1: 0.18, 2: 0.24, 3: 0.3 };
const ROT_SIGNE = [-24, -12, 0, 12, 24];
const ROT_COEUR = [-15, 0, 15];

export interface Groupe {
  kind: 'coeur' | 'rameau' | 'noeud';
  box: { x: number; y: number; w: number; h: number };
  label: string;
  ok: boolean;
  score: number;
  inconnu?: boolean;
}

export interface Lecture {
  sceau: Sceau;
  centre: Pt;
  R: number;
  cerne: boolean;
  groupes: Groupe[];
  /** toutes les cernes lues (double cerne, sceau greffé) */
  cernes: { c: Pt; r: number }[];
  /** signes bien tracés mais inconnus du joueur */
  inconnus: string[];
  greffeTrait?: boolean;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const strokeLen = (s: Stroke) => s.reduce((acc, p, i) => (i ? acc + dist(p, s[i - 1]) : 0), 0);
const centroid = (pts: Pt[]) => ({ x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length });
const angleOf = (c: Pt, p: Pt) => (((Math.atan2(p.x - c.x, -(p.y - c.y)) * 180) / Math.PI) + 360) % 360;

/** Ajustement de cercle (méthode de Kåsa) */
function fitCircle(pts: Pt[]): { c: Pt; r: number; rms: number } | null {
  const n = pts.length;
  if (n < 8) return null;
  const m = centroid(pts);
  let suu = 0, svv = 0, suv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
  for (const p of pts) {
    const u = p.x - m.x, v = p.y - m.y;
    suu += u * u; svv += v * v; suv += u * v;
    suuu += u * u * u; svvv += v * v * v; suvv += u * v * v; svuu += v * u * u;
  }
  const det = suu * svv - suv * suv;
  if (Math.abs(det) < 1e-9) return null;
  const b1 = 0.5 * (suuu + suvv), b2 = 0.5 * (svvv + svuu);
  const uc = (b1 * svv - b2 * suv) / det, vc = (suu * b2 - suv * b1) / det;
  const c = { x: m.x + uc, y: m.y + vc };
  const r = Math.sqrt(uc * uc + vc * vc + (suu + svv) / n);
  const rms = Math.sqrt(pts.reduce((a, p) => a + (dist(p, c) - r) ** 2, 0) / n);
  return { c, r, rms };
}

function coverage(pts: Pt[], c: Pt, bins = 72): boolean[] {
  const b = new Array(bins).fill(false);
  for (const p of pts) b[Math.floor((angleOf(c, p) / 360) * bins) % bins] = true;
  return b;
}

/** plus longue suite de cases vides (circulaire) : [longueur, indice du milieu] */
function longestGap(b: boolean[]): [number, number] {
  const n = b.length;
  if (b.every((x) => !x)) return [n, 0];
  let best = 0, bestMid = 0;
  for (let i = 0; i < n; i++) {
    if (b[i] || !b[(i - 1 + n) % n]) continue;
    let k = 0;
    while (!b[(i + k) % n] && k < n) k++;
    if (k > best) { best = k; bestMid = (i + k / 2) % n; }
  }
  return [best, bestMid];
}

function bbox(strokes: Stroke[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of strokes) for (const p of s) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Regroupe les traits proches (boîtes qui se touchent, avec une marge) */
function grouper(strokes: Stroke[], marge: number): Stroke[][] {
  const boxes = strokes.map((s) => bbox([s]));
  const parent = strokes.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < strokes.length; i++) for (let j = i + 1; j < strokes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.x - marge <= b.x + b.w && b.x - marge <= a.x + a.w && a.y - marge <= b.y + b.h && b.y - marge <= a.y + a.h) parent[find(i)] = find(j);
  }
  const g = new Map<number, Stroke[]>();
  strokes.forEach((s, i) => { const r = find(i); g.set(r, [...(g.get(r) ?? []), s]); });
  return [...g.values()];
}

/** Repère un trait de gerce : long, droit, en diagonale, qui traverse le Cœur */
function trouverGerce(strokes: Stroke[]): number {
  const box = bbox(strokes);
  const diag = Math.hypot(box.w, box.h);
  let idx = -1;
  strokes.forEach((s, i) => {
    if (s.length < 2) return;
    const a = s[0], b = s[s.length - 1], L = strokeLen(s), d = dist(a, b);
    if (d < 0.7 * diag || d / L < 0.93) return;
    const ang = Math.abs((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI) % 180;
    if (ang > 20 && ang < 70 || ang > 110 && ang < 160) idx = i;
  });
  return idx;
}

export interface OptionsLecture {
  /** signes connus du joueur : les autres sont lus mais refusés */
  connus?: Set<string>;
  /** modèles personnels (calibrage) */
  perso?: Perso;
}

interface Cercle { c: Pt; r: number; rms: number; idx: number[] }

/** Toutes les cernes candidates, regroupées : cernes concentriques (double cerne, moitiés d'un sceau fendu) dans le même groupe. */
function trouverCernes(traits: Stroke[]): Cercle[][] {
  const cand: Cercle[] = [];
  traits.forEach((s, i) => {
    if (strokeLen(s) < 120) return;
    const f = fitCircle(s);
    if (!f || f.r < 60 || f.rms / f.r > 0.2) return;
    const [gap] = longestGap(coverage(s, f.c));
    if (gap > 44) return; // nettement moins d'un demi-cercle
    cand.push({ ...f, idx: [i] });
  });
  // fusion des morceaux d'une même cerne (même centre, même rayon)
  const cercles: Cercle[] = [];
  for (const c of cand.sort((a, b) => b.r - a.r)) {
    const meme = cercles.find((o) => dist(o.c, c.c) < 0.25 * o.r && Math.abs(o.r - c.r) < 0.15 * o.r);
    if (meme) meme.idx.push(...c.idx); else cercles.push({ ...c });
  }
  // groupes de cernes concentriques
  const groupes: Cercle[][] = [];
  for (const c of cercles) {
    const g = groupes.find((gr) => dist(gr[0].c, c.c) < 0.3 * Math.min(gr[0].r, c.r));
    if (g) g.push(c); else groupes.push([c]);
  }
  groupes.forEach((g) => g.sort((a, b) => a.r - b.r));
  return groupes.sort((a, b) => b[0].r - a[0].r).slice(0, 2);
}

/** trous dans la couverture d'une cerne (≥ 3 cases de 5°) : [longueur, milieu en degrés][] */
function trous(b: boolean[]): [number, number][] {
  const n = b.length, out: [number, number][] = [];
  if (b.every((x) => !x)) return [[n, 0]];
  for (let i = 0; i < n; i++) {
    if (b[i] || !b[(i - 1 + n) % n]) continue;
    let k = 0; while (!b[(i + k) % n] && k < n) k++;
    if (k >= 3) out.push([k, (((i + k / 2) % n) / n) * 360]);
  }
  return out.sort((a, b) => b[0] - a[0]);
}

export function lireTrace(strokes: Stroke[], largeurZone: number, tolerance = 1, opts: OptionsLecture = {}): Lecture {
  const traits = strokes.filter((s) => s.length > 0);
  const groupesCernes = trouverCernes(traits);
  const vide: Lecture = { sceau: { coeur: null, rameaux: [], noeuds: [], taille: 2, entaille: null, sansCerne: true }, centre: { x: 0, y: 0 }, R: 0, cerne: false, groupes: [], cernes: [], inconnus: [] };
  if (!traits.length) return vide;

  if (groupesCernes.length === 0) {
    // pas encore de cerne : lecture provisoire autour du dessin
    const b = bbox(traits);
    const centre = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const R = Math.max(80, Math.max(b.w, b.h) / 2 / 1.05);
    return lireUn(traits, centre, R, null, [], largeurZone, tolerance, opts, false);
  }

  // traits utilisés par les cernes
  const utilises = new Set<number>();
  groupesCernes.forEach((g) => g.forEach((c) => c.idx.forEach((i) => utilises.add(i))));
  let restants = traits.filter((_, i) => !utilises.has(i));

  // greffe : un trait qui relie deux cernes
  let greffeTrait = false;
  if (groupesCernes.length === 2) {
    const [A, B] = groupesCernes.map((g) => g[g.length - 1]);
    const pres = (p: Pt, c: Cercle) => Math.abs(dist(p, c.c) - c.r) < 0.3 * c.r;
    const k = restants.findIndex((s) => { const a = s[0], z = s[s.length - 1]; return (pres(a, A) && pres(z, B)) || (pres(a, B) && pres(z, A)); });
    if (k >= 0) { greffeTrait = true; restants = restants.filter((_, i) => i !== k); }
  }

  // répartition des autres traits entre les sceaux
  const parSceau: Stroke[][] = groupesCernes.map(() => []);
  for (const s of restants) {
    const c = centroid(s);
    let best = 0, bd = Infinity;
    groupesCernes.forEach((g, i) => { const d = dist(c, g[0].c) / g[g.length - 1].r; if (d < bd) { bd = d; best = i; } });
    parSceau[best].push(s);
  }

  const lectures = groupesCernes.map((g, i) => {
    const interne = g[0];
    const externe = g.length > 1 && g[g.length - 1].r / interne.r > 1.15 ? g[g.length - 1] : null;
    const ringStrokes = interne.idx.map((k) => traits[k]);
    const extStrokes = externe ? externe.idx.map((k) => traits[k]) : [];
    return lireUn(parSceau[i], interne.c, interne.r, externe ? { r: externe.r, pts: extStrokes.flat() } : null, ringStrokes, largeurZone, tolerance, opts, true);
  });
  // le sceau principal est le plus à gauche ; le second lui est greffé
  const ordre = lectures.map((_l, i) => i).sort((a, b) => lectures[a].centre.x - lectures[b].centre.x);
  const main = lectures[ordre[0]];
  if (lectures.length === 2) {
    const autre = lectures[ordre[1]];
    main.sceau.greffe = { ...autre.sceau, trace: undefined };
    main.groupes.push(...autre.groupes);
    main.cernes.push(...autre.cernes);
    main.inconnus.push(...autre.inconnus);
    if (!greffeTrait) main.sceau.greffe = null; // deux sceaux sans trait de greffe : seul le premier compte
    main.greffeTrait = greffeTrait;
  }
  return main;
}

function lireUn(strokes: Stroke[], centre: Pt, R: number, externe: { r: number; pts: Pt[] } | null, ringStrokes: Stroke[], largeurZone: number, tolerance: number, opts: OptionsLecture, avecCerne: boolean): Lecture {
  const seuil = (r: Rang) => SEUILS[r] * tolerance;
  const groupes: Groupe[] = [];
  const inconnus: string[] = [];
  const restants: Stroke[] = [];
  const ringPts: Pt[] = ringStrokes.flat();
  const R2 = externe?.r ?? 0;
  for (const s of strokes) {
    // morceaux de cerne : traits tangentiels collés à l'anneau (fermeture d'entaille, cerne en plusieurs fois)
    const ds = s.map((p) => dist(p, centre));
    const dmin = Math.min(...ds), dmax = Math.max(...ds);
    const span = strokeLen(s);
    const tangent = span > 4 * (dmax - dmin) && span > 0.06 * R;
    if (avecCerne && tangent && Math.abs(dmin - R) < 0.05 * R && Math.abs(dmax - R) < 0.05 * R) ringPts.push(...s);
    else if (externe && tangent && Math.abs(dmin - R2) < 0.05 * R2 && Math.abs(dmax - R2) < 0.05 * R2) externe.pts.push(...s);
    else restants.push(s);
  }

  // cerne : fermée, ouverte (entaille) ou fendue (deux trous opposés)
  let entaille: number | null = null;
  let fendu: Sceau['fendu'] = null;
  let rondeur = 1;
  if (avecCerne && ringPts.length) {
    const t = trous(coverage(ringPts, centre));
    if (t.length >= 2 && t[1][0] >= 3 && Math.abs(((t[0][1] - t[1][1] + 360) % 360) - 180) < 35) fendu = { axe: Math.round(t[0][1]) % 180 };
    else if (t.length && t[0][0] > 2) entaille = Math.round(t[0][1]);
    const f = fitCircle(ringPts);
    if (f) rondeur = Math.max(0, 1 - (f.rms / f.r) * 8);
  }

  // rayon local de la cerne (une cerne tracée à la main n'est jamais un cercle parfait)
  const profil = new Array<number>(72).fill(0), cnt = new Array<number>(72).fill(0);
  for (const p of ringPts) { const k = Math.floor((angleOf(centre, p) / 360) * 72) % 72; profil[k] += dist(p, centre); cnt[k]++; }
  for (let k = 0; k < 72; k++) profil[k] = cnt[k] ? profil[k] / cnt[k] : NaN;
  for (let k = 0; k < 72; k++) if (isNaN(profil[k])) {
    let a = 1, b = 1;
    while (a < 72 && isNaN(profil[(k - a + 72) % 72])) a++;
    while (b < 72 && isNaN(profil[(k + b) % 72])) b++;
    const pa = profil[(k - a + 72) % 72], pb = profil[(k + b) % 72];
    profil[k] = isNaN(pa) || isNaN(pb) ? R : (pa * b + pb * a) / (a + b);
  }
  const rayonA = (p: Pt) => (avecCerne && ringPts.length ? profil[Math.floor((angleOf(centre, p) / 360) * 72) % 72] : R);

  // Cœur : traits dont le centre est proche du centre du sceau
  const zoneCoeur: Stroke[] = [], autres: Stroke[] = [];
  for (const s of restants) {
    const d = dist(centroid(s), centre) / R;
    const loin = Math.max(...s.map((p) => dist(p, centre))) / R;
    if (d < 0.3 && loin < 0.5 || d < 0.2) zoneCoeur.push(s); else autres.push(s);
  }

  const scores: number[] = [];
  let illisibles = 0;
  const connu = (id: string) => !opts.connus || opts.connus.has(id);
  const nommer = (id: string, inv: boolean) => (inv ? SIGNE[id].nomInverse : SIGNE[id].nom);

  let coeur: Sceau['coeur'] = null;
  if (zoneCoeur.length) {
    const g = [...zoneCoeur];
    const gi = trouverGerce(g);
    const inv = gi >= 0 && g.length > 1;
    if (inv) g.splice(gi, 1);
    const m = reconnaitre(g, 'coeur', ROT_COEUR, opts.perso);
    if (m) {
      const lisible = m.score >= seuil(SIGNE[m.id].rang);
      const sait = connu(m.id);
      groupes.push({ kind: 'coeur', box: bbox(zoneCoeur), label: nommer(m.id, inv) + (lisible && !sait ? ' (inconnu)' : ''), ok: lisible && sait, score: m.score, inconnu: lisible && !sait });
      if (lisible && sait) { coeur = { id: m.id, inv, score: m.score }; scores.push(m.score); } else if (!lisible) illisibles++; else inconnus.push(m.id);
    }
  }

  // Rameaux et Nœuds (et, en double cerne, la couronne)
  const rameaux: Placement[] = [], noeuds: Placement[] = [];
  const cRameaux: Placement[] = [], cNoeuds: Placement[] = [];
  for (const g of grouper(autres, 0.065 * R)) {
    const pts = g.flat();
    const c = centroid(pts);
    const ang = angleOf(centre, c);
    const d = dist(c, centre);
    const f = d / rayonA(c);
    const local = g.map((s) => s.map((p) => rotate(p, -ang, centre)));
    const essais: { kind: 'rameau' | 'noeud'; couronne: boolean; m: ReturnType<typeof reconnaitre>; inv: boolean; bonus: number }[] = [];
    const retourne = (l: Stroke[]) => { const cc = centroid(l.flat()); return l.map((s) => s.map((p) => rotate(p, 180, cc))); };
    if (externe && d > R * 1.1 && Math.abs(d - R2) > 0.16 * R) {
      // entre les deux cernes : Rameau de couronne
      const m = reconnaitre(local, 'rameau', ROT_SIGNE, opts.perso);
      essais.push({ kind: 'rameau', couronne: true, m, inv: !!m?.inv, bonus: 0.05 });
    } else if (externe && Math.abs(d - R2) <= 0.16 * R) {
      const dedans = d < R2;
      const m = reconnaitre(dedans ? retourne(local) : local, 'noeud', ROT_SIGNE, opts.perso);
      essais.push({ kind: 'noeud', couronne: true, m, inv: dedans, bonus: 0.05 });
    } else {
      const dehors = pts.some((p) => dist(p, centre) > rayonA(p) * 1.04);
      if (f < 0.86 && !(dehors && f > 0.7)) {
        const m = reconnaitre(local, 'rameau', ROT_SIGNE, opts.perso);
        essais.push({ kind: 'rameau', couronne: false, m, inv: !!m?.inv, bonus: f < 0.72 ? 0.08 : 0 });
      }
      if (f > 0.7) {
        const dedans = f < 1;
        const m = reconnaitre(dedans ? retourne(local) : local, 'noeud', ROT_SIGNE, opts.perso);
        essais.push({ kind: 'noeud', couronne: false, m, inv: dedans, bonus: f > 0.92 || dehors ? 0.08 : 0 });
      }
    }
    const best = essais.filter((e) => e.m).sort((a, b) => (b.m!.score + b.bonus) - (a.m!.score + a.bonus))[0];
    if (!best || !best.m) continue;
    const m = best.m;
    const lisible = m.score >= seuil(SIGNE[m.id].rang);
    const sait = connu(m.id);
    groupes.push({ kind: best.kind, box: bbox(g), label: nommer(m.id, best.inv) + (lisible && !sait ? ' (inconnu)' : '') + (best.couronne ? ' ◎' : ''), ok: lisible && sait, score: m.score, inconnu: lisible && !sait });
    if (lisible && sait) {
      const p = { id: m.id, angle: Math.round(ang), inv: best.inv, score: m.score };
      if (best.couronne) (best.kind === 'rameau' ? cRameaux : cNoeuds).push(p);
      else (best.kind === 'rameau' ? rameaux : noeuds).push(p);
      scores.push(m.score);
    } else if (!lisible) illisibles++; else inconnus.push(m.id);
  }

  const nettete = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 1;
  const ratio = R / (largeurZone / 2);
  const taille: Taille = ratio < 0.5 ? 1 : ratio < 0.75 ? 2 : 3;
  const couronne = externe ? { rameaux: cRameaux, noeuds: cNoeuds } : null;

  return {
    sceau: { coeur, rameaux, noeuds, taille, entaille, sansCerne: !avecCerne, trace: { nettete, rondeur, illisibles }, couronne, fendu },
    centre, R, cerne: avecCerne, groupes,
    cernes: avecCerne ? [{ c: centre, r: R }, ...(externe ? [{ c: centre, r: R2 }] : [])] : [],
    inconnus,
  };
}

/** utilitaire de test : la gerce en coordonnées locales */
export const _gerce = gerceStroke;
