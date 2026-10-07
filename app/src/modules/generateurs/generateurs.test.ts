import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, nouveauPersonnage } from '../../noyau/contrat';
import { regles } from '../../noyau/regles';
import { contexteDe, genererBoutique, genererButin, genererPnj, genererTaverne, pnjVersPersonnage, texteTaverne } from './logique';

const ctx = () => contexteDe({ ...nouvelleCampagne('G'), personnages: [nouveauPersonnage('Varn le passeur', 'pnj', 'dnd5e', {})] });

describe('générateurs', () => {
  it('sont déterministes et utilisent la campagne dans les rumeurs', () => {
    const a = genererTaverne('x', ctx()), b = genererTaverne('x', ctx());
    expect(a).toEqual(b);
    expect(a.plats).toHaveLength(3);
    const toutes = Array.from({ length: 30 }, (_, i) => genererTaverne(`g${i}`, ctx()).rumeurs).flat();
    expect(toutes.some((r) => r.includes('Varn le passeur'))).toBe(true);
    expect(toutes.every((r) => !r.includes('{'))).toBe(true);
    expect(texteTaverne(a)).toContain(a.nom);
  });
  it('PNJ → personnage avec stats selon le rôle et secrets côté MJ', () => {
    const g = genererPnj('p1', ctx(), 'capitaine de la garde');
    const p = pnjVersPersonnage(g, regles('dnd5e'), 'dnd5e', ctx(), 'p1');
    expect(p.role).toBe('capitaine de la garde');
    expect(Number((p.combat.stats as { niveau?: number }).niveau)).toBeGreaterThan(1);
    expect(String((p.mj as { notes: string }).notes)).toContain('Secret');
  });
  it('boutique d’une sorte donnée, butin chiffré', () => {
    const b = genererBoutique('b', ctx(), 'forge');
    expect(b.sorte).toContain('Forgeron');
    expect(b.objets.length).toBeGreaterThanOrEqual(5);
    const t = genererButin('t', '5-10');
    expect(t.pieces.length).toBeGreaterThan(0);
    expect(t.valeur).toBeGreaterThan(0);
  });
});
