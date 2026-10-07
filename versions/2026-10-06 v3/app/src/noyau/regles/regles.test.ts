import { describe, expect, it } from 'vitest';
import { mulberry32, rngFor, hashStr } from '../hasard';
import { d20, ecrireStat, formuleValide, lancer, lireStat, regles } from './index';
import { mod } from './dnd5e';

describe('dés', () => {
  it('valide les formules', () => {
    for (const f of ['1d20', '2d6+4', 'd100', '1d8+1d4-1', '3']) expect(formuleValide(f)).toBe(true);
    for (const f of ['', 'abc', '2d', '1d6++2']) expect(formuleValide(f)).toBe(false);
  });
  it('lance dans les bornes et double les dés en critique', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 200; i++) {
      const r = lancer('2d6+4', rng);
      expect(r.total).toBeGreaterThanOrEqual(6);
      expect(r.total).toBeLessThanOrEqual(16);
    }
    expect(lancer('1d8+2', rng, true).termes[0].des).toHaveLength(2);
  });
  it('avantage garde le meilleur', () => {
    const r = d20('avantage', mulberry32(7));
    expect(r.garde).toBe(Math.max(...r.des));
  });
});

describe('dnd5e', () => {
  it('modificateurs et initiative', () => {
    expect(mod(10)).toBe(0); expect(mod(8)).toBe(-1); expect(mod(16)).toBe(3);
    const s = regles('dnd5e').statsParDefaut();
    expect(regles('dnd5e').initiative(ecrireStat(s, 'carac.dex', 14))).toBe('1d20+2');
  });
  it('système inconnu → 5e', () => expect(regles('inconnu').id).toBe('dnd5e'));
  it('lecture / écriture par chemin', () => {
    const s = ecrireStat({}, 'carac.for', 18);
    expect(lireStat(s, 'carac.for')).toBe(18);
  });
});

describe('hasard', () => {
  it('est déterministe', () => {
    expect(hashStr('orden')).toBe(hashStr('orden'));
    expect(rngFor('g', 'a')()).toBe(rngFor('g', 'a')());
    expect(rngFor('g', 'a')()).not.toBe(rngFor('g', 'b')());
  });
});
