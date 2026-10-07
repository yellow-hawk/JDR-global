import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, nouveauPersonnage, nouvelUnivers, type Campagne } from '../../noyau/contrat';
import { appliquerReputationQuete, changerReputation, niveauReputation } from './reputation';
import { ajouterPeuple, civilisationsDe, modifierCivilisation, peuplesDeCampagne, pnjDuPeuple, positionsCalendrier } from './logique';

describe('pays', () => {
  it('monde fait main : fiches minimales, édition qui crée les civilisations', () => {
    const u = { ...nouvelUnivers('Orden'), monde: { carte: null, peuples: [{ id: 'p1', nom: 'Les Haraniens', desc: 'Fiers' }] } };
    let c: Campagne = { ...nouvelleCampagne('T'), univers: [u] };
    expect(civilisationsDe(u)[0]).toMatchObject({ cle: 'p1', croyance: 'Fiers' });
    c = modifierCivilisation(c, u.id, 'p1', (x) => ({ ...x, souverain: 'Rahl' }));
    expect(c.univers[0].civilisations!.peuples[0].souverain).toBe('Rahl');
    c = ajouterPeuple(c, u.id, 'Les Mud').campagne;
    expect(peuplesDeCampagne(c).map((p) => p.civ.nom)).toEqual(['Les Haraniens', 'Les Mud']);
  });
  it('PNJ du peuple et calendrier', () => {
    const u = { ...nouvelUnivers('M', 'genere'), civilisations: { monde: null, peuples: [{ cle: 3, nom: 'les X', villes: [], traits: [], coutumes: [], relations: [], histoire: [], noms: [],
      calendrier: { joursParAn: 30, mois: [{ nom: 'A', jours: 10 }, { nom: 'B', jours: 20 }], fetes: [{ nom: 'F', mois: 1, jour: 6 }] } }] } };
    const p = { ...nouveauPersonnage('Z', 'pnj', 'dnd5e', {}), peuple: { atlas: '3' } };
    const c = { ...nouvelleCampagne('T'), univers: [u], personnages: [p], campagne: { ...nouvelleCampagne('T').campagne, univers: { type: 'univers' as const, id: u.id } } };
    expect(pnjDuPeuple(c, peuplesDeCampagne(c)[0]).map((x) => x.nom)).toEqual(['Z']);
    expect(positionsCalendrier(u.civilisations.peuples[0].calendrier).fetes[0]).toMatchObject({ t: 0.5, mois: 'B', jour: 6 });
  });
});


describe('réputation', () => {
  it('borne la jauge, garde l’historique, applique une quête terminée une seule fois', () => {
    const base = nouvelleCampagne('R');
    let c: Campagne = { ...base, univers: [{ id: 'u', nom: 'M', sorte: 'genere', atlas: {}, civilisations: { monde: null, peuples: [{ cle: 3, nom: 'les Kar', villes: [], traits: [], coutumes: [], relations: [], histoire: [], noms: [] }] } }] };
    c = changerReputation(c, 'u', 3, 95, 'Héros', 't1');
    c = changerReputation(c, 'u', 3, 20, 'Encore', 't2');
    const civ = () => c.univers[0].civilisations!.peuples[0];
    expect(civ().reputation).toBe(100);
    expect(niveauReputation(civ().reputation).libelle).toBe('Vénéré');
    expect(niveauReputation(0).libelle).toBe('Neutre');
    c = { ...c, quetes: [{ id: 'q', titre: 'Trahison', source: { sorte: 'fait-main' }, statut: 'terminee', lieux: [], personnages: [], reputation: [{ univers: 'u', peuple: 3, delta: -50 }] }] };
    c = appliquerReputationQuete(c, 'q', 't3');
    c = appliquerReputationQuete(c, 'q', 't4');
    expect(civ().reputation).toBe(50);
    expect(civ().reputationJournal).toHaveLength(3);
  });
});
