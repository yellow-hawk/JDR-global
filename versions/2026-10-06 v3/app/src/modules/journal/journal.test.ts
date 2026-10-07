import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, nouveauPersonnage, vueJoueurs } from '../../noyau/contrat';
import {
  importerQuetesAtlas, modifierQuete, nouvelleSeance, sceneQuete, supprimerQuete, trierQuetes, type QueteAtlas,
} from './logique';

const qa = (cle: string, sorte = 'secondaire'): QueteAtlas => ({
  cle, sorte, titre: `Quête ${cle}`, resume: 'Un village brûle.', lieux: ['Kan (capitale)'], pnj: ['Ysa'], recompenses: ['200 po'],
  etapes: [{ titre: 'Étape secrète', joueurs: 'Révélé en jeu.', mj: { titre: 'Le traître', texte: 'Ysa ment.' } }],
  mj: { verite: 'Le marchand paie les pillards.' },
});

describe('journal', () => {
  it('importe les quêtes, lie les PNJ par nom, et met à jour sans doublon', () => {
    let c = nouvelleCampagne('T');
    c = { ...c, personnages: [nouveauPersonnage('Ysa', 'pnj', 'dnd5e', {})] };
    let r = importerQuetesAtlas(c, [qa('q0', 'principale'), qa('q1')], 'univ-1');
    expect(r.ajoutees).toBe(2);
    expect(r.campagne.quetes[0].statut).toBe('en-cours');
    expect(r.campagne.quetes[0].personnages).toEqual([{ type: 'personnage', id: c.personnages[0].id }]);
    const id = r.campagne.quetes[1].id;
    c = modifierQuete(r.campagne, id, (q) => ({ ...q, statut: 'terminee', mj: { ...q.mj, notes: 'mes notes' } }));
    r = importerQuetesAtlas(c, [qa('q1')], 'univ-1');
    expect(r.majs).toBe(1);
    const q1 = r.campagne.quetes.find((q) => q.id === id)!;
    expect(q1.statut).toBe('terminee');
    expect((q1.mj as { notes: string }).notes).toBe('mes notes');
  });

  it('les secrets des quêtes ne passent pas côté joueurs', () => {
    const c = importerQuetesAtlas(nouvelleCampagne('T'), [qa('q0')], null).campagne;
    const t = JSON.stringify(vueJoueurs(c));
    expect(t).not.toContain('pillards');
    expect(t).not.toContain('Ysa ment');
    expect(JSON.stringify(sceneQuete(c.quetes[0]))).toContain('Kan');
  });

  it('séances numérotées, liées aux quêtes en cours ; suppression propre', () => {
    let c = importerQuetesAtlas(nouvelleCampagne('T'), [qa('q0', 'principale'), qa('q1')], null).campagne;
    c = nouvelleSeance(c, '2026-10-06').campagne;
    c = nouvelleSeance(c, '2026-10-13').campagne;
    expect(c.seances.map((s) => s.numero)).toEqual([1, 2]);
    expect(c.seances[0].liens).toHaveLength(1);
    c = supprimerQuete(c, c.quetes[0].id);
    expect(c.seances[0].liens).toHaveLength(0);
    expect(trierQuetes(c.quetes).map((q) => q.titre)).toEqual(['Quête q1']);
  });
});
