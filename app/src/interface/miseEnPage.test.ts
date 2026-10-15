import { describe, expect, it } from 'vitest';
import { problemes, type Boite } from './miseEnPage';

const b = (nom: string, x: number, y: number, l: number, h: number, extra: Partial<Boite> = {}): Boite =>
  ({ nom, x, y, l, h, fixe: false, defile: false, interactif: false, ...extra });
const ecran = { l: 390, h: 844, largeurPage: 390, hauteurPage: 844 };

describe('contrôle de mise en page', () => {
  it('rien à signaler sur un écran propre', () => {
    expect(problemes([b('titre', 10, 10, 300, 40), b('bouton', 10, 60, 120, 40, { interactif: true })], ecran)).toEqual([]);
  });

  it('page qui défile de travers, élément coupé, coupé en bas seulement si la page ne défile pas', () => {
    const p = problemes([b('carte', 0, 0, 450, 300)], { ...ecran, largeurPage: 450 });
    expect(p.map((x) => x.texte)).toEqual([expect.stringMatching(/de travers : 60 px/), expect.stringMatching(/Coupé.*carte/)]);
    expect(problemes([b('pied', 0, 900, 300, 40)], ecran)).toHaveLength(1);
    expect(problemes([b('pied', 0, 900, 300, 40)], { ...ecran, hauteurPage: 1200 })).toEqual([]);
    expect(problemes([b('dans une liste', 0, 900, 300, 40, { defile: true })], ecran)).toEqual([]);
    // Dans un panneau qui défile, trop large reste un défaut ; dans une carte zoomée qui coupe, non.
    expect(problemes([b('tableau', 0, 100, 500, 40, { defile: true })], ecran)).toHaveLength(1);
    expect(problemes([b('carte', 0, 100, 900, 600, { defile: true, coupeX: true })], ecran)).toEqual([]);
    expect(problemes([b('onglet Messages', 400, 4, 90, 30, { defileX: true })], ecran)).toEqual([{ gravite: 'alerte', texte: expect.stringMatching(/faire défiler sur le côté.*Messages/) }]);
  });

  it('boutons fixes qui se recouvrent, boutons et textes trop petits sur téléphone', () => {
    const p = problemes([
      b('plein écran', 300, 10, 80, 30, { fixe: true, interactif: true }),
      b('onglet Messages', 290, 8, 90, 30, { fixe: true, interactif: true }),
      b('×', 10, 100, 18, 18, { interactif: true }),
      b('note', 10, 140, 200, 12, { police: 9 }),
      b('Valider', 10, 50, 100, 30, { interactif: true, cachePar: 'nav.distant-onglets' }),
    ], ecran);
    expect(p.map((x) => x.texte)).toEqual([
      expect.stringMatching(/plein écran recouvre onglet Messages/),
      expect.stringMatching(/Valider est caché sous nav.distant-onglets/),
      expect.stringMatching(/1 bouton difficile/),
      expect.stringMatching(/1 texte trop petit/),
    ]);
  });
});
