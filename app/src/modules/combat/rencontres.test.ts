import { describe, expect, it } from 'vitest';
import { nouvelleCampagne } from '../../noyau/contrat';
import { regles } from '../../noyau/regles';
import { BIBLIOTHEQUE_DE_BASE, iconeDe, nomDeBase } from './moteur';
import { composerRencontre, difficulteAtteinte, nommer } from './rencontres';

const R = regles('dnd5e');
const c = nouvelleCampagne('T');

describe('rencontres', () => {
  it('respecte le budget de difficulté et nomme les humanoïdes', () => {
    for (const difficulte of ['facile', 'moyenne', 'difficile', 'mortelle'] as const) {
      const r = composerRencontre(c, R, { milieu: 'route', difficulte, niveaux: [3, 3, 3, 3], chef: true, nommes: true }, BIBLIOTHEQUE_DE_BASE, `g-${difficulte}`);
      expect(r.chef).not.toBeNull();
      if (r.adversaires.length) expect(r.xpAjustee).toBeLessThanOrEqual(r.budget);
      for (const a of r.adversaires) if (/bandit/i.test(a.modele.nom)) expect(a.modele.nom).toMatch(/^\S+, (bandit|capitaine bandit)$/);
    }
    const crypte = composerRencontre(c, R, { milieu: 'crypte', difficulte: 'difficile', niveaux: [2, 2, 2], chef: false, nommes: true }, BIBLIOTHEQUE_DE_BASE, 'x');
    expect(crypte.adversaires.length).toBeGreaterThan(1);
    expect(crypte.adversaires.every((a) => /^(Squelette|Zombie)( \d+)?$/.test(a.modele.nom))).toBe(true);
    const foret = composerRencontre(c, R, { milieu: 'foret', difficulte: 'difficile', niveaux: [4, 4, 4, 4], chef: false, nommes: true }, BIBLIOTHEQUE_DE_BASE, 'y');
    expect(['moyenne', 'difficile']).toContain(difficulteAtteinte(R, [4, 4, 4, 4], foret.xpAjustee));
    // Reproductible
    const a = composerRencontre(c, R, { milieu: 'grotte', difficulte: 'moyenne', niveaux: [2], chef: true, nommes: true }, BIBLIOTHEQUE_DE_BASE, 'z');
    const b = composerRencontre(c, R, { milieu: 'grotte', difficulte: 'moyenne', niveaux: [2], chef: true, nommes: true }, BIBLIOTHEQUE_DE_BASE, 'z');
    expect(b).toEqual(a);
  });

  it('noms uniques et créatures numérotées', () => {
    const garde = BIBLIOTHEQUE_DE_BASE.find((m) => m.nom === 'Garde')!, loup = BIBLIOTHEQUE_DE_BASE.find((m) => m.nom === 'Loup')!;
    const l = nommer(c, [garde, garde, garde, loup, loup], 'n');
    const prenoms = l.slice(0, 3).map((m) => m.nom.split(',')[0]);
    expect(new Set(prenoms).size).toBe(3);
    expect(l.slice(3).map((m) => m.nom)).toEqual(['Loup 1', 'Loup 2']);
  });

  it('icônes d’après le nom, choisies ou retirées', () => {
    expect(iconeDe({ nom: 'Gobelin 3' })).toBe('👺');
    expect(iconeDe({ nom: 'Garn, bandit' })).toBe('🗡️');
    expect(iconeDe({ nom: 'Morgran' })).toBeNull();
    expect(iconeDe({ nom: 'Gobelin', icone: '🐉' })).toBe('🐉');
    expect(iconeDe({ nom: 'Gobelin', icone: null })).toBeNull();
    expect(nomDeBase('Gobelin 12')).toBe('Gobelin');
    expect(nomDeBase('Créature (2)')).toBe('Créature');
  });
});
