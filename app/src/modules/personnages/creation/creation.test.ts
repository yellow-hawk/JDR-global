import { describe, expect, it } from 'vitest';
import { nouvelleCampagne } from '../../../noyau/contrat';
import { regles, aUneFiche, type SystemeAvecFiche } from '../../../noyau/regles';
import { assetsDeLInventaire, genererLot, personnageDepuisChoix } from './logique';

const R = regles('dnd5e') as SystemeAvecFiche;

describe('création de personnages', () => {
  it('le système 5e fournit fiche et création', () => {
    expect(aUneFiche(R)).toBe(true);
  });

  it('lot de PJ : fiches complètes, reproductible par graine', () => {
    const c = nouvelleCampagne('Test');
    const lot = genererLot(c, R, { sorte: 'pj', nombre: 3, avecApparence: true }, 'graine-lot');
    expect(lot).toHaveLength(3);
    for (const p of lot) {
      expect(p.fiche?.progression?.classes?.length).toBe(1);
      expect(p.combat.stats.pvMax).toBeGreaterThan(0);
      expect(p.apparence).toBeTruthy();
    }
    expect(genererLot(c, R, { sorte: 'pj', nombre: 3, avecApparence: false }, 'graine-lot').map((p) => p.nom)).toEqual(lot.map((p) => p.nom));
  });

  it('PNJ : rôle, notes publiques et secrets du générateur, classe selon le rôle', () => {
    const [p] = genererLot(nouvelleCampagne('T'), R, { sorte: 'ennemi', nombre: 1, role: 'capitaine de la garde', avecApparence: false }, 'g');
    expect(p.sorte).toBe('ennemi');
    expect(p.role).toBe('capitaine de la garde');
    expect(p.notes).toBeTruthy();
    expect((p.mj as { notes: string }).notes).toMatch(/Motivation/);
    expect(['guerrier', 'paladin', 'barbare']).toContain(p.fiche?.progression?.classes?.[0].id);
  });

  it('l’avatar porte l’arme et l’armure équipées', () => {
    const choix = R.creation.aleatoire('x', { classe: 'guerrier', espece: 'humain' });
    const p = personnageDepuisChoix(R, choix, 'pj');
    expect(assetsDeLInventaire(p, R)).toMatchObject({ arme: 'epee', armure: 'cotte' });
    const assets = (p.apparence as { data: { assets: Record<string, string | null> } }).data.assets;
    expect(assets.arme).toBe('epee');
    expect(assets.armure).toBe('cotte');
  });
});
