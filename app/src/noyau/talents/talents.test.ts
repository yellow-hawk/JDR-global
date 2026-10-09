import { describe, expect, it } from 'vitest';
import { regles, type SystemeAvecFiche } from '../regles';
import { nouveauPersonnage, type Personnage } from '../contrat';
import { acquerir, arbresPour, dependants, enregistrerArbresDeCampagne, etatTalent, noeudParId, pointsTalent, retirer, tousLesArbres, toutRendre } from './index';

const R = regles('dnd5e') as SystemeAvecFiche;
const guerrier = (niveau: number): Personnage => ({
  ...nouveauPersonnage('Brann', 'pj', 'dnd5e', { carac: { for: 16, dex: 12, con: 14, int: 10, sag: 10, cha: 10 }, ca: 10 }),
  fiche: { progression: { classes: [{ id: 'guerrier', niveau }] } },
});

describe('arbres de talents', () => {
  it('arbres applicables : la classe, l’aventurier, la magie des sceaux', () => {
    expect(arbresPour(guerrier(1)).map((a) => a.id)).toEqual(['guerrier', 'aventurier', 'sceaux']);
    expect(tousLesArbres().length).toBe(14);
  });

  it('points, niveau requis, prérequis', () => {
    let p = guerrier(3);
    expect(pointsTalent(p)).toEqual({ total: 3, depenses: 0, restants: 3 });
    expect(etatTalent(p, noeudParId('guerrier.assaut.2')!)).toMatchObject({ etat: 'verrouille', raison: expect.stringMatching(/Frappe assurée/) });
    expect(etatTalent(p, noeudParId('guerrier.assaut.3')!)).toMatchObject({ etat: 'verrouille', raison: 'niveau 6 requis' });
    p = acquerir(p, 'guerrier.assaut.1');
    p = acquerir(p, 'guerrier.assaut.2');
    expect(pointsTalent(p).restants).toBe(1);
    expect(etatTalent(p, noeudParId('guerrier.assaut.1')!).etat).toBe('acquis');
  });

  it('les effets s’appliquent à la fiche (attaque, dégâts, CA)', () => {
    let p = guerrier(3);
    p = { ...p, fiche: { ...p.fiche, inventaire: { objets: [{ id: 'e', nom: 'Épée', ref: 'arme:epee-longue', quantite: 1, equipe: true }] } } };
    const avant = R.calculer(p).attaques[0];
    p = acquerir(acquerir(p, 'guerrier.assaut.1'), 'guerrier.assaut.2');
    const apres = R.calculer(p).attaques[0];
    expect(apres.bonus).toBe(avant.bonus + 1);
    expect(apres.degats).toBe('1d8+4 tranchant');
  });

  it('retrait : impossible si un talent en dépend ; tout rendre', () => {
    let p = acquerir(acquerir(guerrier(3), 'guerrier.defense.1'), 'guerrier.defense.2');
    expect(dependants(p, 'guerrier.defense.1').map((n) => n.id)).toEqual(['guerrier.defense.2']);
    expect(retirer(p, 'guerrier.defense.1')).toBe(p);
    p = retirer(p, 'guerrier.defense.2');
    expect(p.fiche!.progression!.talents).toEqual(['guerrier.defense.1']);
    expect(toutRendre(acquerir(p, 'guerrier.defense.2')).fiche!.progression!.talents).toEqual([]);
  });

  it('magie des sceaux : éveil, signes, rang, retrait', () => {
    let p = guerrier(3);
    p = acquerir(p, 'sceaux.coeurs.1');
    expect((p.magie as { signes: string[] }).signes).toHaveLength(10);
    p = acquerir(acquerir(p, 'sceaux.maitrise.1'), 'sceaux.maitrise.2');
    expect(p.magie).toMatchObject({ rang: 2, emplacements: 8 });
    expect((p.magie as { signes: string[] }).signes).toEqual(expect.arrayContaining(['sablier', 'visee', 'echo']));
    p = retirer(p, 'sceaux.maitrise.2');
    expect(p.magie).toMatchObject({ rang: 1, emplacements: 6 });
    expect((p.magie as { signes: string[] }).signes).not.toContain('visee');
  });

  it('arbres du MJ : remplacent ceux des règles à id égal', () => {
    enregistrerArbresDeCampagne([{ id: 'guerrier', nom: 'Guerrier (maison)', pour: { classes: ['guerrier'] }, branches: [], personnalise: true }]);
    expect(arbresPour(guerrier(1)).find((a) => a.id === 'guerrier')!.nom).toBe('Guerrier (maison)');
    enregistrerArbresDeCampagne([]);
  });
});
