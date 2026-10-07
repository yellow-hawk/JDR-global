// Reconnaissance des signes : algorithme $P (nuage de points, Vatavu, Anthony & Wobbrock 2012).
// Indépendant du nombre de traits et de leur ordre ; sensible à l'orientation (voulu : l'orientation code l'inversion).
import { glyphStrokes, rotate, type Pt, type Stroke } from './geometry';
import { COEURS, NOEUDS, RAMEAUX } from '../data/signes';

const N = 32;

interface PP extends Pt { s: number }
interface Template { id: string; inv: boolean; points: PP[] }

function pathLength(pts: PP[]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i].s === pts[i - 1].s) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return d;
}

function resample(points: PP[], n: number): PP[] {
  const I = pathLength(points) / (n - 1);
  if (!isFinite(I) || I === 0) return Array.from({ length: n }, () => ({ ...points[0] }));
  let D = 0;
  const pts = points.map((p) => ({ ...p }));
  const out: PP[] = [{ ...pts[0] }];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].s === pts[i - 1].s) {
      const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (D + d >= I) {
        const q: PP = { x: pts[i - 1].x + ((I - D) / d) * (pts[i].x - pts[i - 1].x), y: pts[i - 1].y + ((I - D) / d) * (pts[i].y - pts[i - 1].y), s: pts[i].s };
        out.push(q);
        pts.splice(i, 0, q);
        D = 0;
      } else D += d;
    }
  }
  while (out.length < n) out.push({ ...pts[pts.length - 1] });
  return out.slice(0, n);
}

function normalize(strokes: Stroke[]): PP[] {
  let pts: PP[] = [];
  strokes.forEach((st, s) => {
    if (st.length === 1) pts.push({ ...st[0], s }, { x: st[0].x + 0.5, y: st[0].y + 0.5, s });
    else st.forEach((p) => pts.push({ x: p.x, y: p.y, s }));
  });
  pts = resample(pts, N);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  const size = Math.max(maxX - minX, maxY - minY) || 1;
  pts = pts.map((p) => ({ x: (p.x - minX) / size, y: (p.y - minY) / size, s: p.s }));
  const cx = pts.reduce((a, p) => a + p.x, 0) / N, cy = pts.reduce((a, p) => a + p.y, 0) / N;
  return pts.map((p) => ({ x: p.x - cx, y: p.y - cy, s: p.s }));
}

function cloudDistance(a: PP[], b: PP[], start: number): number {
  const matched = new Array(N).fill(false);
  let sum = 0, i = start;
  do {
    let min = Infinity, index = -1;
    for (let j = 0; j < N; j++) if (!matched[j]) {
      const d = Math.hypot(a[i].x - b[j].x, a[i].y - b[j].y);
      if (d < min) { min = d; index = j; }
    }
    matched[index] = true;
    const weight = 1 - ((i - start + N) % N) / N;
    sum += weight * min;
    i = (i + 1) % N;
  } while (i !== start);
  return sum;
}

function greedy(a: PP[], b: PP[]): number {
  const step = Math.floor(Math.pow(N, 0.5));
  let min = Infinity;
  for (let i = 0; i < N; i += step) min = Math.min(min, cloudDistance(a, b, i), cloudDistance(b, a, i));
  return min;
}

function makeTemplates(ids: string[], withInverse: boolean, jitter: number[]): Template[] {
  const out: Template[] = [];
  for (const id of ids) {
    const base = glyphStrokes(id);
    for (const inv of withInverse ? [false, true] : [false]) {
      for (const j of jitter) {
        const rot = (inv ? 180 : 0) + j;
        const st = base.map((s) => s.map((p) => rotate(p, rot, { x: 50, y: 50 })));
        out.push({ id, inv, points: normalize(st) });
      }
    }
  }
  return out;
}

let T: { coeur: Template[]; rameau: Template[]; noeud: Template[] } | null = null;
function templates() {
  if (!T) T = {
    coeur: makeTemplates(COEURS.map((s) => s.id), false, [0]),
    rameau: makeTemplates(RAMEAUX.map((s) => s.id), true, [0]),
    noeud: makeTemplates(NOEUDS.map((s) => s.id), false, [0]),
  };
  return T;
}

export interface Match { id: string; inv: boolean; score: number; second?: { id: string; score: number } }

/** Modèles personnels d'un joueur (calibrage : ses propres tracés, dans la boîte 0..100, « haut » = extérieur) */
export interface Perso { cle: string; coeur: Template[]; rameau: Template[]; noeud: Template[] }
const persoCache = new Map<string, Perso>();
export function modelesPerso(cle: string, calibrage: Record<string, Stroke[][]>, famille: (id: string) => 'coeur' | 'rameau' | 'noeud'): Perso {
  const k = cle + '|' + Object.entries(calibrage).map(([id, l]) => id + l.length).join(',');
  const hit = persoCache.get(k); if (hit) return hit;
  const p: Perso = { cle: k, coeur: [], rameau: [], noeud: [] };
  for (const [id, exemples] of Object.entries(calibrage)) {
    const fam = famille(id);
    for (const st of exemples) {
      if (!st.length) continue;
      p[fam].push({ id, inv: false, points: normalize(st) });
      if (fam === 'rameau') p.rameau.push({ id, inv: true, points: normalize(st.map((s) => s.map((q) => rotate(q, 180, { x: 50, y: 50 })))) });
    }
  }
  persoCache.set(k, p);
  return p;
}

/** Reconnaît un groupe de traits déjà ramené dans le repère du signe (« haut » = extérieur). */
const cache = new Map<string, Match>();
const cle = (strokes: Stroke[], kind: string, rot: number[]) =>
  kind + rot.join(',') + '|' + strokes.map((s) => {
    const a = s[0], m = s[s.length >> 1], z = s[s.length - 1];
    return `${s.length}:${a.x.toFixed(1)},${a.y.toFixed(1)},${m.x.toFixed(1)},${m.y.toFixed(1)},${z.x.toFixed(1)},${z.y.toFixed(1)}`;
  }).join(';');

export function reconnaitre(strokes: Stroke[], kind: 'coeur' | 'rameau' | 'noeud', rotations: number[] = [0], perso?: Perso): Match | null {
  if (!strokes.length) return null;
  const k = (perso?.cle ?? '') + cle(strokes, kind, rotations);
  const hit = cache.get(k);
  if (hit) return hit;
  const res = reconnaitreSansCache(strokes, kind, rotations, perso);
  if (res) { if (cache.size > 2000) cache.clear(); cache.set(k, res); }
  return res;
}

function reconnaitreSansCache(strokes: Stroke[], kind: 'coeur' | 'rameau' | 'noeud', rotations: number[], perso?: Perso): Match | null {
  const all = strokes.flat();
  const c = { x: all.reduce((a, p) => a + p.x, 0) / all.length, y: all.reduce((a, p) => a + p.y, 0) / all.length };
  const nuages = rotations.map((r) => normalize(r ? strokes.map((s) => s.map((p) => rotate(p, r, c))) : strokes));
  const best = new Map<string, { id: string; inv: boolean; d: number }>();
  for (const t of perso ? [...templates()[kind], ...perso[kind]] : templates()[kind]) {
    const k = t.id + (t.inv ? '~' : '');
    for (const pts of nuages) {
      const d = greedy(pts, t.points);
      if (!best.has(k) || best.get(k)!.d > d) best.set(k, { id: t.id, inv: t.inv, d });
    }
  }
  const sorted = [...best.values()].sort((a, b) => a.d - b.d);
  const score = (d: number) => Math.max(0, Math.min(1, (2.0 - d) / 2.0));
  const [a, b] = sorted;
  return { id: a.id, inv: a.inv, score: score(a.d), second: b ? { id: b.id + (b.inv ? '~' : ''), score: score(b.d) } : undefined };
}
