import { describe, expect, it } from 'vitest';
import { accessibles } from './outils';
import { C, choisirCarte, franchissable, genererPlan, rectanglesTerrain, type Choix } from './index';

const TOUS: Choix[] = [
  { theme: 'donjon', ambiance: 'pierre' }, { theme: 'donjon', ambiance: 'crypte' }, { theme: 'donjon', ambiance: 'mine' }, { theme: 'donjon', ambiance: 'grotte' },
  ...(['taverne', 'temple', 'palais', 'maison', 'tour', 'fort', 'entrepot', 'bibliotheque'] as const).map((sorte) => ({ theme: 'interieur' as const, sorte })),
  ...(['plaine', 'foret', 'route', 'gue', 'ruines', 'camp', 'desert', 'neige', 'marais', 'cercle', 'cratere', 'cote'] as const).map((sorte) => ({ theme: 'exterieur' as const, sorte })),
];

describe('générateur de cartes de bataille', () => {
  it('le choix suit le lieu et l’étape', () => {
    expect(choisirCarte({ nom: 'Grottes de Vel', sorte: 'lieu remarquable' })).toEqual({ theme: 'donjon', ambiance: 'grotte' });
    expect(choisirCarte({ nom: 'Bia', sorte: 'capitale', etape: 'À la cour des Cesianar' })).toEqual({ theme: 'interieur', sorte: 'palais' });
    expect(choisirCarte({ nom: 'Auberge du Loup borgne', sorte: 'auberge' })).toEqual({ theme: 'interieur', sorte: 'taverne' });
    expect(choisirCarte({ nom: 'Tombeau de Kar', sorte: 'lieu remarquable' }).theme).toBe('donjon');
    expect(choisirCarte({ nom: 'Pont de Mir', sorte: 'pont' })).toEqual({ theme: 'exterieur', sorte: 'gue' });
    expect(choisirCarte({ nom: 'Xyz', sorte: '?' })).toEqual({ theme: 'exterieur', sorte: 'plaine' });
  });

  it.each(TOUS.map((c) => [c.theme === 'donjon' ? c.ambiance : c.sorte, c] as const))('%s : déterministe, départ et adversaires atteignables', (_, c) => {
    for (const graine of ['a', 'b', 'c']) {
      const p = genererPlan(c, 'Test', graine);
      expect(genererPlan(c, 'Test', graine).cases).toEqual(p.cases);
      expect(p.cases).toHaveLength(p.largeur * p.hauteur);
      expect(p.depart.length).toBeGreaterThanOrEqual(2);
      expect(p.ennemis.length).toBeGreaterThanOrEqual(1);
      const acc = accessibles(p, p.depart[0]);
      const atteints = p.ennemis.filter(([x, y]) => acc.has(y * p.largeur + x));
      expect(atteints.length, `${graine}`).toBeGreaterThan(0);
      for (const [x, y] of [...p.depart, ...p.ennemis]) expect(franchissable(p.cases[y * p.largeur + x])).toBe(true);
    }
  });

  it('les murs deviennent peu de rectangles de terrain, sans trou ni chevauchement', () => {
    const p = genererPlan({ theme: 'donjon', ambiance: 'pierre' }, 'T', 'z');
    const rects = rectanglesTerrain(p);
    const couverts = new Map<number, string>();
    for (const r of rects) for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { expect(couverts.has(y * p.largeur + x)).toBe(false); couverts.set(y * p.largeur + x, r.terrain); }
    const murs = p.cases.filter((v) => v === C.mur || v === C.colonne).length;
    expect([...couverts.values()].filter((t) => t === 'mur').length).toBe(murs);
    expect(rects.length).toBeLessThan(murs / 2);
  });
});
