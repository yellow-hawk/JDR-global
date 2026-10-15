import { describe, expect, it } from 'vitest';
import { nouvelleCampagne } from '../noyau/contrat';
import { ajouterAuProgramme, deplacerDansProgramme, montreDansProgramme, programmeDe, recommencerProgramme, retirerDuProgramme } from './programmeSeance';

describe('programme de la séance', () => {
  it('ajouter, réordonner, avancer, retirer', () => {
    let c = nouvelleCampagne('T');
    for (const [m, id] of [['cartes', 'k1'], ['personnages', 'p1'], ['documents', 'd1']]) c = ajouterAuProgramme(c, { module: m, id, nom: id });
    c = deplacerDansProgramme(c, 2, -1);
    expect(programmeDe(c).liste.map((e) => e.id)).toEqual(['k1', 'd1', 'p1']);
    expect(deplacerDansProgramme(c, 0, -1)).toBe(c);
    c = montreDansProgramme(c, 0);
    expect(programmeDe(c).position).toBe(1);
    c = retirerDuProgramme(c, 0);
    expect(programmeDe(c)).toMatchObject({ position: 0 });
    expect(programmeDe(c).liste.map((e) => e.id)).toEqual(['d1', 'p1']);
    c = montreDansProgramme(c, 1);
    expect(programmeDe(c).position).toBe(2);
    expect(programmeDe(recommencerProgramme(c)).position).toBe(0);
  });
});
