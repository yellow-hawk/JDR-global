import { describe, expect, it } from 'vitest';
import { archetypeDe, statsPourProfil } from './profil';

describe('stats selon le rôle', () => {
  it('reconnaît les rôles de l’Atlas', () => {
    expect(archetypeDe('capitaine de la garde').id).toBe('officier');
    expect(archetypeDe('grande prêtresse').id).toBe('pretre-haut');
    expect(archetypeDe('herboriste').id).toBe('pretre');
    expect(archetypeDe('astrologue déchue').id).toBe('savant-mage');
    expect(archetypeDe('inconnu').id).toBe('civil');
  });
  it('cohérentes : le seigneur de guerre frappe fort, l’archiviste réfléchit', () => {
    const g = statsPourProfil({ role: 'seigneur de guerre', antagoniste: true, sorte: 'ennemi', graine: 'a' }) as { carac: Record<string, number>; pvMax: number; ca: number; niveau: number };
    const s = statsPourProfil({ role: 'archiviste royal', description: 'âgé, un œil voilé de blanc', graine: 'b' }) as { carac: Record<string, number>; pvMax: number; ca: number; niveau: number };
    expect(g.carac.for).toBeGreaterThan(s.carac.for);
    expect(s.carac.int).toBeGreaterThan(g.carac.int);
    expect(g.pvMax).toBeGreaterThan(s.pvMax * 2);
    expect(g.ca).toBeGreaterThan(s.ca);
    expect(g.niveau).toBeGreaterThanOrEqual(12);
    expect(statsPourProfil({ role: 'seigneur de guerre', antagoniste: true, sorte: 'ennemi', graine: 'a' })).toEqual(g);
  });
  it('la description ajuste', () => {
    const a = statsPourProfil({ role: 'forgeron', description: 'massif, une cicatrice', graine: 'x' }) as { carac: Record<string, number> };
    const b = statsPourProfil({ role: 'forgeron', description: 'petit, les mains tachées d’encre', graine: 'x' }) as { carac: Record<string, number> };
    expect(a.carac.for).toBeGreaterThan(b.carac.for);
  });
});
