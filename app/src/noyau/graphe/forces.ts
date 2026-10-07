// Disposition par forces (Fruchterman–Reingold) : déterministe (positions de départ en spirale), calculée d'un coup.
import type { Graphe, Position } from './types';

export interface OptionsForces { iterations?: number; largeur?: number; hauteur?: number; gravite?: number }

export function disposerForces(g: Graphe, o: OptionsForces = {}): Record<string, Position> {
  const n = g.noeuds.length;
  const W = o.largeur ?? 1600, H = o.hauteur ?? 1200, iter = o.iterations ?? 300, grav = o.gravite ?? 0.04;
  const k = Math.sqrt((W * H) / Math.max(1, n)) * 0.75;
  const idx = new Map(g.noeuds.map((x, i) => [x.id, i]));
  const px = new Float64Array(n), py = new Float64Array(n);
  // Spirale de Fermat : départ régulier et reproductible.
  for (let i = 0; i < n; i++) { const r = k * 0.6 * Math.sqrt(i + 1), a = i * 2.399963; px[i] = Math.cos(a) * r; py[i] = Math.sin(a) * r; }
  const liens = g.liens.map((l) => [idx.get(l.de), idx.get(l.vers)] as const).filter(([a, b]) => a !== undefined && b !== undefined && a !== b) as [number, number][];
  const dx = new Float64Array(n), dy = new Float64Array(n);
  let temp = Math.max(W, H) / 8;
  for (let it = 0; it < iter; it++) {
    dx.fill(0); dy.fill(0);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      let ex = px[i] - px[j], ey = py[i] - py[j];
      let d2 = ex * ex + ey * ey;
      if (d2 < 0.01) { ex = 0.1 * ((i % 7) - 3); ey = 0.1 * ((j % 5) - 2); d2 = ex * ex + ey * ey + 0.01; }
      const f = (k * k) / d2;
      dx[i] += ex * f; dy[i] += ey * f; dx[j] -= ex * f; dy[j] -= ey * f;
    }
    for (const [a, b] of liens) {
      const ex = px[a] - px[b], ey = py[a] - py[b], d = Math.sqrt(ex * ex + ey * ey) || 0.01;
      const f = d / k;
      dx[a] -= ex * f; dy[a] -= ey * f; dx[b] += ex * f; dy[b] += ey * f;
    }
    for (let i = 0; i < n; i++) {
      dx[i] -= px[i] * grav; dy[i] -= py[i] * grav;
      const d = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) || 1;
      const m = Math.min(d, temp);
      px[i] += (dx[i] / d) * m; py[i] += (dy[i] / d) * m;
    }
    temp *= 0.985;
  }
  const res: Record<string, Position> = {};
  g.noeuds.forEach((x, i) => { res[x.id] = { x: px[i], y: py[i] }; });
  return res;
}
