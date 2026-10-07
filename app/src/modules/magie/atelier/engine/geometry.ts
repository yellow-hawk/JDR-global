// Géométrie partagée : échantillonnage des tracés et placement des signes dans un sceau.
import { GLYPHS, GERCE, type Primitive } from '../data/glyphs';

export interface Pt { x: number; y: number }
export type Stroke = Pt[];

/** Proportions d'un sceau, en fraction du rayon R de la cerne */
export const LAYOUT = {
  coeurTaille: 0.62, // taille de la boîte 100×100 du Cœur
  rameauRayon: 0.6,
  rameauTaille: 0.42,
  noeudTaille: 0.4,
};

// ---------- Échantillonnage de chemins SVG (sous-ensemble : M L H V Q T C Z + q t relatifs)
function tokens(d: string): (string | number)[] {
  const out: (string | number)[] = [];
  const re = /([MLHVQTCZmlhvqtcz])|(-?\d*\.?\d+(?:e-?\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) out.push(m[1] ? m[1] : parseFloat(m[2]));
  return out;
}

export function samplePath(d: string, step = 2): Stroke[] {
  const t = tokens(d);
  const strokes: Stroke[] = [];
  let cur: Stroke = [];
  let x = 0, y = 0, sx = 0, sy = 0, lcx = 0, lcy = 0, cmd = '';
  let i = 0;
  const num = () => t[i++] as number;
  const line = (nx: number, ny: number) => {
    const L = Math.hypot(nx - x, ny - y), n = Math.max(1, Math.ceil(L / step));
    for (let k = 1; k <= n; k++) cur.push({ x: x + ((nx - x) * k) / n, y: y + ((ny - y) * k) / n });
    x = nx; y = ny;
  };
  const quad = (cx: number, cy: number, nx: number, ny: number) => {
    const L = Math.hypot(cx - x, cy - y) + Math.hypot(nx - cx, ny - cy), n = Math.max(2, Math.ceil(L / step));
    const x0 = x, y0 = y;
    for (let k = 1; k <= n; k++) {
      const u = k / n, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
      cur.push({ x: a * x0 + b * cx + c * nx, y: a * y0 + b * cy + c * ny });
    }
    lcx = cx; lcy = cy; x = nx; y = ny;
  };
  const cubic = (c1x: number, c1y: number, c2x: number, c2y: number, nx: number, ny: number) => {
    const L = Math.hypot(c1x - x, c1y - y) + Math.hypot(c2x - c1x, c2y - c1y) + Math.hypot(nx - c2x, ny - c2y);
    const n = Math.max(3, Math.ceil(L / step)), x0 = x, y0 = y;
    for (let k = 1; k <= n; k++) {
      const u = k / n, v = 1 - u;
      cur.push({
        x: v * v * v * x0 + 3 * v * v * u * c1x + 3 * v * u * u * c2x + u * u * u * nx,
        y: v * v * v * y0 + 3 * v * v * u * c1y + 3 * v * u * u * c2y + u * u * u * ny,
      });
    }
    x = nx; y = ny;
  };
  while (i < t.length) {
    if (typeof t[i] === 'string') cmd = t[i++] as string;
    switch (cmd) {
      case 'M': if (cur.length > 1) strokes.push(cur); x = sx = num(); y = sy = num(); cur = [{ x, y }]; cmd = 'L'; break;
      case 'L': line(num(), num()); break;
      case 'H': line(num(), y); break;
      case 'V': line(x, num()); break;
      case 'Q': quad(num(), num(), num(), num()); break;
      case 'q': { const cx = x + num(), cy = y + num(), nx = x + num(), ny = y + num(); quad(cx, cy, nx, ny); break; }
      case 'T': quad(2 * x - lcx, 2 * y - lcy, num(), num()); break;
      case 't': { const nx = x + num(), ny = y + num(); quad(2 * x - lcx, 2 * y - lcy, nx, ny); break; }
      case 'C': cubic(num(), num(), num(), num(), num(), num()); break;
      case 'Z': case 'z': line(sx, sy); cmd = ''; break;
      default: i++;
    }
  }
  if (cur.length > 1) strokes.push(cur);
  return strokes;
}

function circleStroke(cx: number, cy: number, r: number): Stroke {
  const n = Math.max(12, Math.ceil((2 * Math.PI * r) / 2));
  return Array.from({ length: n + 1 }, (_, k) => ({ x: cx + r * Math.cos((2 * Math.PI * k) / n), y: cy + r * Math.sin((2 * Math.PI * k) / n) }));
}

export function primitivesToStrokes(prims: Primitive[]): Stroke[] {
  const out: Stroke[] = [];
  for (const p of prims) {
    if ('d' in p) out.push(...samplePath(p.d));
    else if ('circle' in p) out.push(circleStroke(...p.circle));
    else out.push(circleStroke(p.dot[0], p.dot[1], Math.max(2, p.dot[2] * 0.6)));
  }
  return out;
}

const cache = new Map<string, Stroke[]>();
export function glyphStrokes(id: string): Stroke[] {
  if (!cache.has(id)) cache.set(id, primitivesToStrokes(GLYPHS[id]));
  return cache.get(id)!;
}
export const gerceStroke = (): Stroke[] => samplePath(GERCE);

// ---------- Transformations
export function rotate(p: Pt, deg: number, c: Pt = { x: 0, y: 0 }): Pt {
  const a = (deg * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
  const dx = p.x - c.x, dy = p.y - c.y;
  return { x: c.x + dx * cs - dy * sn, y: c.y + dx * sn + dy * cs };
}

/** Point de la cerne (angle 0 = haut, sens horaire) */
export function polar(cx: number, cy: number, r: number, angleDeg: number): Pt {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

export type Kind = 'coeur' | 'rameau' | 'noeud';

/** Place les traits d'un signe dans le repère du sceau (centre cx,cy, rayon R). */
export function placeStrokes(id: string, kind: Kind, angle: number, inv: boolean, cx: number, cy: number, R: number, rayon?: number): Stroke[] {
  const L = LAYOUT;
  let strokes = glyphStrokes(id);
  if (kind === 'coeur') {
    if (inv) strokes = [...strokes, ...gerceStroke()];
    const s = (L.coeurTaille * R) / 100;
    return strokes.map((st) => st.map((p) => ({ x: cx + (p.x - 50) * s, y: cy + (p.y - 50) * s })));
  }
  const s = ((kind === 'rameau' ? L.rameauTaille : L.noeudTaille) * R) / 100;
  const pivotY = kind === 'rameau' ? 50 : 60;
  const anchor = polar(cx, cy, rayon ?? (kind === 'rameau' ? L.rameauRayon * R : R), angle);
  const rot = angle + (inv ? 180 : 0);
  return strokes.map((st) => st.map((p) => {
    const q = rotate({ x: (p.x - 50) * s, y: (p.y - pivotY) * s }, rot);
    return { x: anchor.x + q.x, y: anchor.y + q.y };
  }));
}

/** Transform SVG équivalent à placeStrokes (pour le rendu) */
export function svgTransform(kind: Kind, angle: number, inv: boolean, cx: number, cy: number, R: number, rayon?: number): string {
  const L = LAYOUT;
  if (kind === 'coeur') { const s = (L.coeurTaille * R) / 100; return `translate(${cx} ${cy}) scale(${s}) translate(-50 -50)`; }
  const s = ((kind === 'rameau' ? L.rameauTaille : L.noeudTaille) * R) / 100;
  const pivotY = kind === 'rameau' ? 50 : 60;
  const a = polar(cx, cy, rayon ?? (kind === 'rameau' ? L.rameauRayon * R : R), angle);
  return `translate(${a.x.toFixed(2)} ${a.y.toFixed(2)}) rotate(${angle + (inv ? 180 : 0)}) scale(${s}) translate(-50 -${pivotY})`;
}

/** Rayons d'un sceau : cerne R, et seconde cerne R2 en double cerne (rayon de base = place disponible) */
export function rayons(base: number, double: boolean): { R: number; R2: number; Rc: number } {
  const R = double ? base * 0.64 : base;
  const R2 = R * 1.52;
  return { R, R2, Rc: (R + R2) / 2 };
}

/** Traits d'un sceau complet (cerne(s), signes, couronne, cerne fendue ou entaillée), pour les rendus (texture 3D, impression). */
export function traitsDuSceau(s: { coeur: { id: string; inv: boolean } | null; rameaux: { id: string; angle: number; inv: boolean }[]; noeuds: { id: string; angle: number; inv: boolean }[]; entaille: number | null; couronne?: { rameaux: { id: string; angle: number; inv: boolean }[]; noeuds: { id: string; angle: number; inv: boolean }[] } | null; fendu?: { axe: number } | null }, cx: number, cy: number, base: number): Stroke[] {
  const { R, R2, Rc } = rayons(base, !!s.couronne);
  const out: Stroke[] = [];
  if (s.coeur) out.push(...placeStrokes(s.coeur.id, 'coeur', 0, s.coeur.inv, cx, cy, R));
  s.rameaux.forEach((r) => out.push(...placeStrokes(r.id, 'rameau', r.angle, r.inv, cx, cy, R)));
  s.noeuds.forEach((n) => out.push(...placeStrokes(n.id, 'noeud', n.angle, n.inv, cx, cy, R)));
  if (s.couronne) {
    s.couronne.rameaux.forEach((r) => out.push(...placeStrokes(r.id, 'rameau', r.angle, r.inv, cx, cy, R, Rc)));
    s.couronne.noeuds.forEach((n) => out.push(...placeStrokes(n.id, 'noeud', n.angle, n.inv, cx, cy, R, R2)));
  }
  const trous: number[] = s.fendu ? [s.fendu.axe, s.fendu.axe + 180] : s.entaille !== null ? [s.entaille] : [];
  const anneau = (r: number, coupures: number[]) => {
    let cur: Stroke = [];
    for (let a = 0; a <= 360; a += 3) {
      if (coupures.some((t) => Math.abs(((a - t + 540) % 360) - 180) < 10)) { if (cur.length > 1) out.push(cur); cur = []; continue; }
      cur.push(polar(cx, cy, r, a));
    }
    if (cur.length > 1) out.push(cur);
  };
  anneau(R, trous);
  if (s.couronne) anneau(R2, []);
  return out;
}
