import { describe, expect, it } from 'vitest';
import { ajouterJeton, debuterCombat, nouvelEtat, tourSuivant } from './moteur';
import type { EtatTable, Gabarit } from './moteur';
import { attaqueAvecArme, attaquesDuJeton, idTour, optionsTour, porteeArme, refus, type DemandeTour } from './tour';

const boule: Omit<Gabarit, 'id'> = { nom: 'Boule', forme: 'cercle', rayon: 1, portee: 10, origine: 'point', effets: [], couleur: 'red', particule: null, concentration: false, desc: '', lanceurs: ['p-ada'] };

/** Ada (PJ, vitesse 6) commence, puis un gobelin à 3 cases. */
function table(): EtatTable {
  let e = nouvelEtat();
  e = ajouterJeton(e, { nom: 'Ada', camp: 'pj', persoId: 'p-ada', vitesse: 6, degats: '1d6' }, 0, 0).etat;
  e = ajouterJeton(e, { nom: 'Gobelin', camp: 'ennemi', ca: 12 }, 3, 0).etat;
  e = { ...e, sorts: [{ ...boule, id: 100 }, { ...boule, id: 101, nom: 'Autre', lanceurs: ['p-bo'] }] };
  return debuterCombat(e, () => 0, { 1: 20, 2: 5 });
}
const base = { attaques: [{ nom: 'Arc court', bonus: 5, degats: '1d6+3', portee: 16 }, { nom: 'Dague', bonus: 5, degats: '1d4+3', portee: 0 }], tablette: false, peutTracer: true, trace: null, viser: null };

describe('tour d’un PJ sur l’écran joueurs', () => {
  it('options : mouvement, cases atteignables, cibles visibles, sorts connus seulement', () => {
    const o = optionsTour(table(), base)!;
    expect(o.persoId).toBe('p-ada');
    expect(o.reste).toBe(6);
    expect(o.cases).toContain('2,0');
    expect(o.cases).not.toContain('3,0'); // occupée par le gobelin
    expect(o.cibles.map((c) => c.nom)).toEqual(['Gobelin']);
    expect(o.sorts.map((s) => s.nom)).toEqual(['Boule']);
  });

  it('pas d’options au tour d’un adversaire', () => {
    expect(optionsTour(tourSuivant(table()), base)).toBeNull();
  });

  it('seul le joueur du PJ actif agit, une seule action, dans sa portée', () => {
    const e = table(), o = optionsTour(e, base)!;
    const d = (x: Partial<DemandeTour>) => ({ tour: idTour(e), faire: 'finir', ...x }) as DemandeTour;
    expect(refus(o, d({}), 'p-ada')).toBeNull();
    expect(refus(o, d({}), 'p-bo')).toMatch(/tour d/);
    expect(refus(o, d({}), null)).toMatch(/tour d/); // il a un lien : pas depuis la tablette
    expect(refus({ ...o, tablette: true }, d({}), null)).toBeNull();
    expect(refus(o, d({ tour: 'vieux' }), 'p-ada')).toMatch(/terminé/);
    expect(refus(o, d({ faire: 'deplacer', cellule: [9, 9] } as Partial<DemandeTour>), 'p-ada')).toMatch(/portée/);
    expect(refus(o, d({ faire: 'sort', sort: 101, cellule: [1, 1], angle: 0 } as Partial<DemandeTour>), 'p-ada')).toMatch(/connaît pas/);
    expect(refus({ ...o, actionFaite: true }, d({ faire: 'attaquer', attaque: 0, cible: 2 } as Partial<DemandeTour>), 'p-ada')).toMatch(/déjà/);
    expect(refus(o, d({ faire: 'attaquer', attaque: 0, cible: 2 } as Partial<DemandeTour>), 'p-ada')).toBeNull();
  });

  it('armes de la fiche : portée lue, attaque avec le bonus de l’arme, valeurs du jeton gardées', () => {
    expect(porteeArme('16/64')).toBe(64);
    expect(porteeArme(undefined)).toBe(0);
    const e = table();
    expect(attaquesDuJeton(e.jetons[0], null)[0].nom).toBe('Attaque');
    const dague = attaqueAvecArme(e, 1, base.attaques[1], 2, () => 0.99);
    expect(dague.erreur).toMatch(/portée/);
    const arc = attaqueAvecArme(e, 1, base.attaques[0], 2, () => 0.99);
    expect(arc.resultat?.critique).toBe(true);
    const ada = arc.etat.jetons.find((j) => j.id === 1)!;
    expect(ada.drapeaux.action).toBe(true);
    expect(ada.degats).toBe('1d6');
  });
});
