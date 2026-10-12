import { describe, expect, it } from 'vitest';
import { regles, type SystemeAvecFiche } from '../regles';
import { nouveauPersonnage, type Personnage } from '../contrat';
import {
  acquerir, arbresPour, dependants, enregistrerArbresDeCampagne, etatTalent, noeudParId, pointsTalent, retirer, sansTalentsDisparus,
  talentsDisparus, tousLesArbres, toutRendre,
} from './index';

const R = regles('dnd5e') as SystemeAvecFiche;
const guerrier = (niveau: number): Personnage => ({
  ...nouveauPersonnage('Brann', 'pj', 'dnd5e', { carac: { for: 16, dex: 12, con: 14, int: 10, sag: 10, cha: 10 }, ca: 10 }),
  fiche: { progression: { classes: [{ id: 'guerrier', niveau }] } },
});

describe('arbres de talents', () => {
  it('arbres applicables : la voie de la classe, l’aventurier, la magie des sceaux', () => {
    expect(arbresPour(guerrier(1)).map((a) => a.id)).toEqual(['fer', 'aventurier', 'sceaux']);
    expect(tousLesArbres().length).toBe(6);
    // Données : prérequis existants dans le même arbre.
    for (const a of tousLesArbres()) {
      const ids = new Set(a.branches.flatMap((b) => b.noeuds.map((n) => n.id)));
      for (const n of a.branches.flatMap((b) => b.noeuds)) for (const r of [...n.requis, ...(n.requisUn ?? [])]) expect(ids.has(r), `${n.id} → ${r}`).toBe(true);
    }
  });

  it('points, niveau requis, prérequis, jonctions', () => {
    let p = guerrier(3);
    expect(pointsTalent(p)).toEqual({ total: 3, depenses: 0, restants: 3 });
    expect(etatTalent(p, noeudParId('fer.l1')!)).toMatchObject({ etat: 'verrouille', raison: expect.stringMatching(/Discipline du combattant/) });
    expect(etatTalent(p, noeudParId('fer.l3')!)).toMatchObject({ etat: 'verrouille', raison: 'niveau 5 requis' });
    p = acquerir(acquerir(p, 'fer.racine'), 'fer.l1');
    expect(pointsTalent(p).restants).toBe(1);
    expect(etatTalent(p, noeudParId('fer.l1')!).etat).toBe('acquis');
    expect(noeudParId('fer.j1')).toMatchObject({ cout: 2, requis: ['fer.b3', 'fer.l3'], sorte: 'jonction' });
  });

  it('les effets s’appliquent à la fiche (attaque, dégâts)', () => {
    let p = guerrier(3);
    p = { ...p, fiche: { ...p.fiche, inventaire: { objets: [{ id: 'e', nom: 'Épée', ref: 'arme:epee-longue', quantite: 1, equipe: true }] } } };
    const avant = R.calculer(p).attaques[0];
    p = acquerir(acquerir(acquerir(p, 'fer.racine'), 'fer.l1'), 'fer.l2');
    const apres = R.calculer(p).attaques[0];
    expect(apres.bonus).toBe(avant.bonus + 1);
    expect(apres.degats).toBe('1d8+4 tranchant');
  });

  it('retrait : impossible si un talent en dépend ; tout rendre', () => {
    let p = acquerir(acquerir(guerrier(3), 'fer.racine'), 'fer.b1');
    expect(dependants(p, 'fer.racine').map((n) => n.id)).toEqual(['fer.b1']);
    expect(retirer(p, 'fer.racine')).toBe(p);
    p = retirer(p, 'fer.b1');
    expect(p.fiche!.progression!.talents).toEqual(['fer.racine']);
    expect(toutRendre(acquerir(p, 'fer.b1')).fiche!.progression!.talents).toEqual([]);
  });

  it('magie des sceaux : éveil, « au moins un », rang, retrait', () => {
    let p = guerrier(5);
    p = acquerir(p, 'sceaux.coeurs.1');
    expect((p.magie as { signes: string[] }).signes).toHaveLength(10);
    p = acquerir(p, 'sceaux.maitrise.1');
    // Rang de Compagnon : le Nœud du sablier et au moins un de Cœurs de nature I / Rameaux d'apprenti.
    expect(etatTalent(p, noeudParId('sceaux.maitrise.2')!)).toMatchObject({ etat: 'verrouille', raison: expect.stringMatching(/ ou /) });
    p = acquerir(acquerir(p, 'sceaux.rameaux.1'), 'sceaux.maitrise.2');
    expect(p.magie).toMatchObject({ rang: 2, emplacements: 8 });
    expect((p.magie as { signes: string[] }).signes).toEqual(expect.arrayContaining(['sablier', 'visee', 'echo']));
    expect(dependants(p, 'sceaux.rameaux.1').map((n) => n.id)).toEqual(['sceaux.maitrise.2']);
    p = acquerir(p, 'sceaux.coeurs.2');
    expect(dependants(p, 'sceaux.rameaux.1')).toEqual([]);
    p = retirer(p, 'sceaux.maitrise.2');
    expect(p.magie).toMatchObject({ rang: 1, emplacements: 6 });
    expect((p.magie as { signes: string[] }).signes).not.toContain('visee');
  });

  it('arbres du MJ et talents disparus', () => {
    enregistrerArbresDeCampagne([{ id: 'fer', nom: 'Fer (maison)', pour: { classes: ['guerrier'] }, branches: [], personnalise: true }]);
    expect(arbresPour(guerrier(1)).find((a) => a.id === 'fer')!.nom).toBe('Fer (maison)');
    const p: Personnage = { ...guerrier(2), fiche: { progression: { classes: [{ id: 'guerrier', niveau: 2 }], talents: ['fer.racine', 'guerrier.defense.1'] } } };
    expect(talentsDisparus(p)).toEqual(['fer.racine', 'guerrier.defense.1']);
    enregistrerArbresDeCampagne([]);
    expect(sansTalentsDisparus(p).fiche!.progression!.talents).toEqual(['fer.racine']);
  });
});
