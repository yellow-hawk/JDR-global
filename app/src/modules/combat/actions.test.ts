import { describe, expect, it } from 'vitest';
import { caseVisee, casesDeZone, versImage, zoneVisee, type DemandeAction } from './actions';
import type { Gabarit, Grille } from './moteur';

const grille: Grille = { type: 'carree', taille: 40 };
const d: Pick<DemandeAction, 'camera' | 'grille'> = { camera: { x: 100, y: 50, zoom: 2 }, grille };
const boule: Gabarit = { id: 1, nom: 'Boule', forme: 'cercle', rayon: 2, portee: 20, origine: 'point', effets: [], couleur: 'red', particule: null, concentration: false, desc: '' };
const cone: Gabarit = { ...boule, id: 2, nom: 'Souffle', forme: 'cone', rayon: 4, origine: 'soi', portee: 0 };

describe('actions sur l’écran joueurs', () => {
  it('un point de l’image donne la bonne case, et inversement', () => {
    // case (3, 2) : centre monde (140, 100) → image (380, 250)
    expect(versImage(d, [3, 2])).toEqual([380, 250]);
    expect(caseVisee(d, 380, 250).cellule).toEqual([3, 2]);
    expect(caseVisee(d, 395, 265).cellule).toEqual([3, 2]);
  });

  it('zone visée : centrée sur la case pour une boule, partant du lanceur pour un cône orienté', () => {
    const lanceur = { id: 7, nom: 'Ysolde', x: 0, y: 0 };
    const b = zoneVisee(grille, { sorte: 'sort', gabarit: boule, lanceur }, [5 * 40 + 20, 5 * 40 + 20]);
    expect([b.zone.x, b.zone.y]).toEqual([5, 5]);
    const cases = casesDeZone(grille, b.zone);
    expect(cases).toContainEqual([5, 5]);
    expect(cases).not.toContainEqual([0, 0]);
    const c = zoneVisee(grille, { sorte: 'sort', gabarit: cone, lanceur }, [8 * 40 + 20, 20]);
    expect([c.zone.x, c.zone.y]).toEqual([0, 0]);
    expect(c.angle).toBeCloseTo(0, 5);
    expect(casesDeZone(grille, c.zone)).toContainEqual([3, 0]);
  });
});
