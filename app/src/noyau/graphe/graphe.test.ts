import { describe, expect, it } from 'vitest';
import { communautes, degres, disposerArbre, disposerForces, intermediarite, type Graphe, type NoeudArbre } from './index';

const g: Graphe = {
  noeuds: ['a', 'b', 'c', 'd', 'e', 'f', 'x'].map((id) => ({ id, libelle: id, sorte: 't' })),
  liens: [['a', 'b'], ['b', 'c'], ['a', 'c'], ['d', 'e'], ['e', 'f'], ['d', 'f'], ['c', 'x'], ['x', 'd']].map(([de, vers]) => ({ de, vers })),
};

describe('graphes', () => {
  it('degrés et intermédiarité : le pont est central', () => {
    expect(degres(g).c).toBe(3);
    const b = intermediarite(g);
    expect(b.x).toBeGreaterThan(b.a);
    expect(Math.max(...Object.values(b))).toBe(b.x);
  });
  it('deux communautés autour du pont', () => {
    const c = communautes(g);
    expect(c.a).toBe(c.b); expect(c.b).toBe(c.c);
    expect(c.d).toBe(c.e); expect(c.e).toBe(c.f);
    expect(c.a).not.toBe(c.d);
  });
  it('forces : déterministe, les voisins sont plus proches que les autres', () => {
    const p = disposerForces(g), q = disposerForces(g);
    expect(p).toEqual(q);
    const d = (u: string, v: string) => Math.hypot(p[u].x - p[v].x, p[u].y - p[v].y);
    expect(d('a', 'b')).toBeLessThan(d('a', 'f'));
  });
  it('arbre : parent centré, repli', () => {
    const t: NoeudArbre = { id: 'r', libelle: 'r', enfants: [{ id: 'g', libelle: 'g', enfants: [] }, { id: 'm', libelle: 'm', enfants: [{ id: 'm1', libelle: '', enfants: [] }, { id: 'm2', libelle: '', enfants: [] }] }] };
    const a = disposerArbre(t);
    expect(a.positions.m.x).toBe((a.positions.m1.x + a.positions.m2.x) / 2);
    expect(a.positions.r.y).toBeLessThan(a.positions.g.y);
    const b = disposerArbre(t, { replies: new Set(['m']) });
    expect(b.positions.m1).toBeUndefined();
  });
});
