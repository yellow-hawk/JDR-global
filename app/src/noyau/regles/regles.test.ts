import { describe, expect, it } from 'vitest';
import { mulberry32, rngFor, hashStr } from '../hasard';
import { d20, ecrireStat, formuleValide, jeter, lancer, lireStat, regles, texteJet } from './index';
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

describe('jets du plateau', () => {
  it('avantage : deux dés, le meilleur est gardé', () => {
    const j = jeter('1d20+3', 'avantage', mulberry32(3));
    expect(j.des).toHaveLength(2);
    const garde = j.des.find((d) => !d.ecarte)!;
    expect(garde.valeur).toBe(Math.max(...j.des.map((d) => d.valeur)));
    expect(j.total).toBe(garde.valeur + 3);
    expect(texteJet(j)).toContain('avantage');
  });
  it('désavantage : le pire est gardé ; formule à plusieurs dés sans effet de mode', () => {
    const j = jeter('d20', 'desavantage', mulberry32(9));
    expect(j.total).toBe(Math.min(...j.des.map((d) => d.valeur)));
    const k = jeter('2d6-1', 'avantage', mulberry32(9));
    expect(k.des).toHaveLength(2);
    expect(k.des.every((d) => !d.ecarte)).toBe(true);
    expect(k.total).toBe(k.des[0].valeur + k.des[1].valeur - 1);
  });
  it('d100 et termes soustraits', () => {
    const j = jeter('1d100-1d4', 'normal', mulberry32(1));
    expect(j.des.map((d) => d.faces)).toEqual([100, 4]);
    expect(j.total).toBe(j.des[0].valeur - j.des[1].valeur);
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
