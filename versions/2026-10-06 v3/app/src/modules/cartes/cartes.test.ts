import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, vueJoueurs } from '../../noyau/contrat';
import {
  ajouterCarte, ajouterRepere, chemin, definirVersionMj, devinerType, echelleDepuisPoints, modifierCarte,
  modifierRepere, parentPossible, pixelsParCase, supprimerCarte,
} from './logique';

const fic = (id: string, nom = 'carte.png') => ({ id, nom, mime: 'image/png', octets: 10 });

describe('cartes', () => {
  it('importe avec type deviné et nom propre', () => {
    const r = ajouterCarte(nouvelleCampagne('T'), fic('fichier-1', 'monde_orden.png'), { l: 800, h: 400 });
    const k = r.campagne.cartes[0];
    expect(k.type).toBe('monde');
    expect(k.nom).toBe('Monde orden');
    expect(r.campagne.fichiers).toHaveLength(1);
    expect(devinerType('Dungeon-level1.jpg')).toBe('donjon');
  });

  it('échelle : 2 points à 100 px pour 1 km → 10 m/px, case de 1,5 m = 0,15 px', () => {
    expect(echelleDepuisPoints([0, 0], [100, 0], 1000)).toBe(10);
    expect(echelleDepuisPoints([0, 0], [0, 0], 10)).toBeNull();
    let c = ajouterCarte(nouvelleCampagne('T'), fic('fichier-1'), { l: 10, h: 10 }).campagne;
    c = modifierCarte(c, c.cartes[0].id, (k) => ({ ...k, echelle: { metresParPixel: 0.0375 } }));
    expect(pixelsParCase(c.cartes[0])).toBeCloseTo(40);
  });

  it('version MJ et repère secret absents de la vue joueurs', () => {
    let c = ajouterCarte(nouvelleCampagne('T'), fic('fichier-j'), { l: 10, h: 10 }).campagne;
    const id = c.cartes[0].id;
    c = definirVersionMj(c, id, fic('fichier-m')).campagne;
    const r = ajouterRepere(c, id, 5, 5, 'Trésor');
    c = modifierRepere(r.campagne, id, r.id, (x) => ({ ...x, mj: { cache: true } }));
    const v = vueJoueurs(c);
    expect(v.cartes[0].images.mj).toBeUndefined();
    expect(v.cartes[0].reperes).toHaveLength(0);
    expect(v.fichiers.map((f) => f.id)).toEqual(['fichier-j']);
  });

  it('emboîtement sans boucle et suppression qui détache les enfants', () => {
    let c = nouvelleCampagne('T');
    c = ajouterCarte(c, fic('fichier-a'), { l: 10, h: 10 }).campagne;
    c = ajouterCarte(c, fic('fichier-b'), { l: 10, h: 10 }).campagne;
    const [a, b] = c.cartes.map((k) => k.id);
    c = modifierCarte(c, b, (k) => ({ ...k, parent: { carte: { type: 'carte', id: a }, zone: [0, 0, 5, 5] } }));
    expect(chemin(c, b).map((k) => k.id)).toEqual([a, b]);
    expect(parentPossible(c, a, b)).toBe(false);
    const s = supprimerCarte(c, a);
    expect(s.liberes).toEqual(['fichier-a']);
    expect(s.campagne.cartes[0].parent).toBeNull();
  });
});
