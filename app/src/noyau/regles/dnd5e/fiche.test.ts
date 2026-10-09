import { describe, expect, it } from 'vitest';
import { nouveauPersonnage } from '../../contrat';
import type { Personnage } from '../../contrat';
import { bonusMaitrise, calculer } from './fiche';

const guerrier = (): Personnage => {
  const p = nouveauPersonnage('Brann', 'pj', 'dnd5e', { pv: 12, pvMax: 12, ca: 10, vitesse: 6, carac: { for: 16, dex: 14, con: 14, int: 10, sag: 12, cha: 8 } });
  return {
    ...p,
    fiche: {
      progression: { classes: [{ id: 'guerrier', niveau: 5 }] },
      maitrises: { competences: { athletisme: 1, perception: 2 }, sauvegardes: ['for', 'con'] },
      inventaire: { objets: [
        { id: 'o1', nom: 'Épée longue', ref: 'arme:epee-longue', quantite: 1, equipe: true },
        { id: 'o2', nom: 'Cotte de mailles', ref: 'armure:cotte-de-mailles', quantite: 1, equipe: true },
        { id: 'o3', nom: 'Bouclier', ref: 'armure:bouclier', quantite: 1, equipe: true },
        { id: 'o4', nom: 'Anneau de protection', quantite: 1, equipe: true, effets: [{ cible: 'ca', valeur: 1 }, { cible: 'sauvegarde.dex', valeur: 1 }] },
        { id: 'o5', nom: 'Rations', ref: 'objet:rations', quantite: 5 },
      ] },
    },
  };
};

describe('fiche 5e calculée', () => {
  it('bonus de maîtrise par niveau', () => {
    expect([1, 4, 5, 9, 13, 17, 20].map(bonusMaitrise)).toEqual([2, 2, 3, 4, 5, 6, 6]);
  });

  it('caractéristiques, sauvegardes et compétences (maîtrise, expertise)', () => {
    const f = calculer(guerrier());
    expect(f.niveau).toBe(5);
    expect(f.bonusMaitrise).toBe(3);
    expect(f.sauvegardes.find((s) => s.carac === 'for')!.valeur).toBe(6); // +3 FOR +3 maîtrise
    expect(f.sauvegardes.find((s) => s.carac === 'dex')!.valeur).toBe(3); // +2 DEX +1 anneau
    expect(f.competences.find((c) => c.cle === 'competence.athletisme')!.valeur).toBe(6);
    expect(f.competences.find((c) => c.cle === 'competence.perception')!.valeur).toBe(7); // +1 SAG + 2×3
    expect(f.derives.find((d) => d.cle === 'perceptionPassive')!.valeur).toBe(17);
  });

  it('CA de l’armure lourde (sans DEX) + bouclier + effet ; attaque de l’arme équipée', () => {
    const f = calculer(guerrier());
    expect(f.derives.find((d) => d.cle === 'ca')!.valeur).toBe(19); // 16 + 2 + 1
    expect(f.attaques[0]).toMatchObject({ nom: 'Épée longue', bonus: 6, degats: '1d8+3 tranchant' });
    expect(f.stats).toMatchObject({ ca: 19, bonusAttaque: 6, degats: '1d8+3', niveau: 5 });
  });

  it('armure légère : DEX entière ; sans armure : CA saisie', () => {
    const p = guerrier();
    p.fiche!.inventaire!.objets = [{ id: 'a', nom: 'Cuir', ref: 'armure:cuir', quantite: 1, equipe: true }];
    expect(calculer(p).derives.find((d) => d.cle === 'ca')!.valeur).toBe(13);
    p.fiche!.inventaire!.objets = [];
    p.combat.stats.ca = 15;
    expect(calculer(p).derives.find((d) => d.cle === 'ca')!.valeur).toBe(15);
    expect(calculer(p).stats.ca).toBeUndefined();
  });

  it('charge : poids du catalogue × quantité', () => {
    const f = calculer(guerrier());
    expect(f.derives.find((d) => d.cle === 'encombrement')!.valeur).toBe(1.5 + 27.5 + 3 + 5);
  });
});
