import { describe, expect, it } from 'vitest';
import type { Campagne, Civilisation } from '../../noyau/contrat';
import { nouvelleCampagne } from '../../noyau/contrat';
import { absolu, ajouterEvenement, avancer, changerTemps, depuisAbsolu, elementsFrise, fetesAVenir, lunes, moment, reference, tempsDe } from './logique';

const civ = (cle: number, an: number): Civilisation => ({
  cle, nom: `les P${cle}`, villes: [], traits: [], coutumes: [], relations: [], noms: [], anActuel: an,
  histoire: [{ an: an - 10, texte: 'Fondation' }],
  calendrier: { joursParAn: 0, mois: [{ nom: 'Givre', jours: 20 }, { nom: 'Sève', jours: 25 }, { nom: 'Moisson', jours: 30 }], fetes: [{ nom: 'Feux', mois: 1, jour: 3 }] },
});
const monde = (): Campagne => {
  const c = nouvelleCampagne('T');
  return {
    ...c,
    campagne: { ...c.campagne, univers: { type: 'univers', id: 'u1' } },
    univers: [{ id: 'u1', nom: 'Orden', sorte: 'genere', atlas: {}, civilisations: { peuples: [civ(1, 500), civ(2, 120)], monde: { nom: 'Orden', soleils: [], lunes: [{ nom: 'Séli', periode: 30 }], jourHeures: 20 } } }],
  };
};

describe('temps de jeu', () => {
  it('référence = premier peuple du monde par défaut, temps par défaut à son année', () => {
    const c = monde();
    const r = reference(c);
    expect(r.cal.joursParAn).toBe(75);
    expect(r.heuresJour).toBe(20);
    expect(tempsDe(c).date).toEqual({ an: 500, mois: 1, jour: 1 });
  });
  it('dates absolues aller-retour et avance des heures, jours, mois', () => {
    const r = reference(monde());
    for (const d of [{ an: 3, mois: 1, jour: 1 }, { an: 3, mois: 2, jour: 25 }, { an: 3, mois: 3, jour: 30 }]) expect(depuisAbsolu(absolu(d, r.cal), r.cal)).toEqual(d);
    const t = { date: { an: 500, mois: 3, jour: 29 }, heure: 18 };
    expect(avancer(t, r, { heures: 5 })).toMatchObject({ heure: 3, date: { an: 500, mois: 3, jour: 30 } });
    expect(avancer(t, r, { jours: 3 }).date).toEqual({ an: 501, mois: 1, jour: 2 });
    expect(avancer({ date: { an: 500, mois: 2, jour: 25 }, heure: 0 }, r, { mois: 2 }).date).toEqual({ an: 501, mois: 1, jour: 20 });
    expect(avancer(t, r, { jours: -1 }).date).toEqual({ an: 500, mois: 3, jour: 28 });
  });
  it('fêtes à venir, lunes, moments', () => {
    const c = monde();
    const r = reference(c);
    expect(fetesAVenir({ date: { an: 500, mois: 2, jour: 1 }, heure: 0 }, r, 10)[0]).toMatchObject({ nom: 'Feux', dans: 2 });
    const l = lunes({ date: depuisAbsolu(15 + 500 * 75 - ((500 * 75) % 30), r.cal), heure: 0 }, r)[0];
    expect(l.libelle).toBe('pleine lune');
    expect(moment(10, 20)).toBe('midi');
  });
  it('frise : histoire recalée sur la référence, événements et maintenant', () => {
    let c = changerTemps(monde(), (t) => ({ ...t, date: { an: 500, mois: 2, jour: 1 } }));
    c = ajouterEvenement(c, { titre: 'Le pont tombe', date: { an: 499, mois: 1, jour: 1 } }).campagne;
    const f = elementsFrise(c);
    const p2 = f.elements.find((e) => e.id === 'hist:2:0')!;
    expect(Math.floor(p2.t)).toBe(490); // an 110 du peuple 2 = an 490 de la référence
    expect(f.lignes).toContain('P2');
    expect(f.elements.find((e) => e.sorte === 'evenement')!.t).toBe(499);
    expect(f.maintenant).toBeGreaterThan(500.2);
  });
});
