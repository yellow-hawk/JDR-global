import { describe, expect, it } from 'vitest';
import {
  ajouterJeton, ajouterZone, annuler, attaquer, casesVisibles, cellule, centre, chemin, debuterCombat, deplacer, depuisV7,
  distance, historique, jetonsDansZone, lancerSort, lireBlocStats, lireEtat, nouvelEtat, porteeDeplacement, pousser,
  retablir, terrainsSur, tourSuivant, zoneDeTerrain, TERRAINS, cle,
} from './index';
import type { EtatTable, Grille, Zone } from './index';

const fixe = (v: number) => () => v;
const suite = (vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]; };
const terrain = (id: string) => TERRAINS.find((t) => t.id === id)!;
const CARRE: Grille = { type: 'carree', taille: 40 };
const HEX: Grille = { type: 'hex', taille: 40 };

function table(...jetons: [string, number, number, Partial<Parameters<typeof ajouterJeton>[1]>?][]): EtatTable {
  let e = nouvelEtat();
  for (const [nom, x, y, m] of jetons) e = ajouterJeton(e, { nom, ...m }, x, y).etat;
  return e;
}

describe('grille', () => {
  it('hexagonal : aller-retour case → centre → case, et clic près du bord', () => {
    for (const c of [[0, 0], [3, -2], [-5, 7], [10, 10]] as [number, number][]) {
      const [x, y] = centre(HEX, c);
      expect(cellule(HEX, x, y)).toEqual(c);
      expect(cellule(HEX, x + 8, y - 6)).toEqual(c);
    }
  });
  it('distances carrée (Tchebychev) et hexagonale', () => {
    expect(distance(CARRE, [0, 0], [3, 5])).toBe(5);
    expect(distance(HEX, [0, 0], [2, -1])).toBe(2);
    expect(distance(HEX, [0, 0], [3, 3])).toBe(6);
  });
});

describe('formes', () => {
  const z = (p: Partial<Zone>): Zone => ({ id: 1, categorie: 'sort', forme: 'cercle', x: 5, y: 5, rayon: 2, largeur: 1, angle: 0, couleur: '', nom: '', ...p });
  const dans = (zone: Zone, x: number, y: number) => jetonsDansZone(CARRE, zone, table(['a', x, y]).jetons).length === 1;
  it('cercle, carré, cône, ligne', () => {
    expect(dans(z({}), 7, 5)).toBe(true);
    expect(dans(z({}), 7, 7)).toBe(false);
    expect(dans(z({ forme: 'carre' }), 7, 7)).toBe(true);
    expect(dans(z({ forme: 'cone', rayon: 4 }), 8, 6)).toBe(true);
    expect(dans(z({ forme: 'cone', rayon: 4 }), 2, 5)).toBe(false);
    expect(dans(z({ forme: 'ligne', rayon: 6 }), 10, 5)).toBe(true);
    expect(dans(z({ forme: 'ligne', rayon: 6 }), 10, 6)).toBe(false);
  });
  it('polygone', () => {
    const p = z({ forme: 'polygone', points: [[0, 0], [6, 0], [6, 6], [0, 6]] });
    expect(dans(p, 3, 3)).toBe(true);
    expect(dans(p, 8, 3)).toBe(false);
  });
});

describe('déplacement', () => {
  it('le terrain difficile coûte double et un mur bloque', () => {
    let e = table(['a', 0, 0]);
    e = ajouterZone(e, zoneDeTerrain(terrain('difficile'), 'carre', 2, 0, 0)).etat;
    const p = porteeDeplacement(e.grille, e.zones, TERRAINS, [], [0, 0], 3);
    expect(p[cle([1, 0])].cout).toBe(1);
    expect(p[cle([2, 0])].cout).toBe(3);
    expect(p[cle([3, 0])].cout).toBe(3); // contourne par la diagonale
    e = ajouterZone(e, zoneDeTerrain(terrain('infranchissable'), 'carre', 1, 1, 0)).etat;
    const p2 = porteeDeplacement(e.grille, e.zones, TERRAINS, [], [0, 0], 5);
    expect(p2[cle([1, 1])]).toBeUndefined();
    expect(chemin(p2, [2, 2])[0]).toEqual([0, 0]);
  });
  it('en combat, refuse une case trop loin ; occupe le mouvement', () => {
    let e = table(['a', 0, 0, { vitesse: 3 }], ['b', 9, 9]);
    e = debuterCombat(e, fixe(0.5));
    expect(deplacer(e, 1, [0, 0], [5, 0]).ok).toBe(false);
    const r = deplacer(e, 1, [0, 0], [2, 0]);
    expect(r.ok).toBe(true);
    expect(r.etat.jetons[0].mouvementUtilise).toBe(2);
    expect(deplacer(r.etat, 1, [2, 0], [4, 0]).ok).toBe(false);
  });
  it('hors combat, refuse une case occupée', () => {
    const e = table(['a', 0, 0], ['b', 3, 3]);
    expect(deplacer(e, 1, [0, 0], [3, 3]).ok).toBe(false);
    expect(deplacer(e, 1, [0, 0], [20, 20]).ok).toBe(true);
  });
});

describe('vision', () => {
  it('un mur cache ce qui est derrière, mais il est vu', () => {
    let e = table();
    for (let y = -2; y <= 2; y++) e = ajouterZone(e, zoneDeTerrain(terrain('mur'), 'carre', 3, y, 0)).etat;
    expect(terrainsSur(e.grille, e.zones, TERRAINS, [3, 0]).some((t) => t.bloqueVue)).toBe(true);
    const v = casesVisibles(e.grille, e.zones, TERRAINS, [0, 0], 8);
    expect(v.has('3,0')).toBe(true);
    expect(v.has('6,0')).toBe(false);
    expect(v.has('0,5')).toBe(true);
  });
});

describe('combat', () => {
  it('initiative triée et saut des jetons à 0 PV', () => {
    let e = table(['lent', 0, 0], ['rapide', 1, 0], ['ko', 2, 0, { pv: 0 }]);
    e = debuterCombat(e, fixe(0), { 1: 5, 2: 18, 3: 10 });
    expect(e.combat.ordre).toEqual([2, 3, 1]);
    e = tourSuivant(e);
    expect(e.combat.ordre[e.combat.tour]).toBe(1);
    e = tourSuivant(e);
    expect(e.combat.round).toBe(2);
    expect(e.combat.tour).toBe(0);
  });
  it('coup critique : dés doublés', () => {
    const e = table(['a', 0, 0, { degats: '1d8', carac: { for: 14, dex: 10, con: 10, int: 10, sag: 10, cha: 10 } }], ['c', 1, 0, { pvMax: 50, ca: 30 }]);
    const r = attaquer(e, 1, 2, 'melee', fixe(0.999));
    expect(r.resultat).toMatchObject({ critique: true, touche: true, degats: 18 }); // 2×8 + 2
    expect(r.etat.jetons[1].pv).toBe(32);
  });
  it('échec critique, hors de portée, CA', () => {
    const e = table(['a', 0, 0], ['c', 1, 0, { ca: 5 }], ['loin', 9, 0]);
    expect(attaquer(e, 1, 2, 'melee', fixe(0)).resultat!.touche).toBe(false);
    expect(attaquer(e, 1, 3, 'melee', fixe(0.5)).erreur).toMatch(/portée/);
    expect(attaquer(e, 1, 2, 'melee', fixe(0.5)).resultat!.touche).toBe(true);
  });
  it('concentration perdue sur gros dégâts', () => {
    let e = table(['a', 0, 0, { degats: '1d8+20' }], ['mage', 1, 0, { pvMax: 80, ca: 1 }]);
    e = { ...e, jetons: e.jetons.map((j) => (j.id === 2 ? { ...j, concentration: 'Ténèbres' } : j)) };
    const r = attaquer(e, 1, 2, 'melee', suite([0.5, 0.5, 0.1]));
    expect(r.etat.jetons[1].concentration).toBeNull();
  });
});

describe('sorts', () => {
  it('boule de feu : dégâts aux jetons de la zone, zone posée', () => {
    let e = table(['mage', 0, 0], ['g1', 10, 0, { pvMax: 40 }], ['g2', 11, 1, { pvMax: 40 }], ['loin', 20, 20]);
    const bdf = e.sorts.find((s) => s.nom === 'Boule de feu')!;
    const z: Omit<Zone, 'id'> = { categorie: 'sort', forme: 'cercle', x: 10, y: 0, rayon: bdf.rayon, largeur: 1, angle: 0, couleur: '', nom: bdf.nom };
    const r = lancerSort(e, bdf.id, 1, z, fixe(0.5));
    expect(r.erreur).toBeUndefined();
    expect(r.cibles).toEqual(expect.arrayContaining(['g1', 'g2']));
    expect(r.cibles).not.toContain('loin');
    expect(r.etat.jetons[1].pv).toBeLessThan(40);
    expect(r.etat.zones).toHaveLength(1);
    e = ajouterZone(e, zoneDeTerrain(terrain('antimagie'), 'cercle', 0, 0, 2)).etat;
    expect(lancerSort(e, bdf.id, 1, z, fixe(0.5)).erreur).toMatch(/antimagie/);
  });
  it('sort à concentration', () => {
    const e = table(['clerc', 0, 0], ['b', 1, 0]);
    const s = e.sorts.find((x) => x.concentration)!;
    const z: Omit<Zone, 'id'> = { categorie: 'sort', forme: s.forme, x: 1, y: 0, rayon: s.rayon, largeur: 1, angle: 0, couleur: '', nom: s.nom };
    expect(lancerSort(e, s.id, 1, z, fixe(0.5)).etat.jetons[0].concentration).toBe(s.nom);
  });
});

describe('bloc SRD', () => {
  it('lit PV, CA, vitesse en pieds, caractéristiques, taille', () => {
    const m = lireBlocStats('Ogre\nLarge giant\nArmor Class 11\nHit Points 59 (7d10 + 21)\nSpeed 40 ft.\nSTR 19 DEX 8 CON 16 INT 5 WIS 7 CHA 7');
    expect(m).toMatchObject({ nom: 'Ogre', ca: 11, pvMax: 59, vitesse: 8, taille: 2, degats: '7d10+21' });
    expect(m.carac.for).toBe(19);
  });
});

describe('compatibilité v7', () => {
  const v7 = {
    tokens: [{ id: 3, name: 'Kahlan', type: 'pc', hp: 12, hpMax: 30, ac: 15, x: 2, y: 4, str: 12, wis: 14, conditions: ['À terre'], color: 'var(--pc)' }],
    zones: [{ id: 7, zoneCategory: 'terrain', terrainType: 'diff', shape: 'square', x: 1, y: 1, radius: 1 }],
    gridType: 'hex', gs: 50, combat: true, initOrder: [3], round: 2, ti: 0,
    spells: [{ id: 1, name: 'Feu', shape: 'circle', radius: 2, range: 20, origin: 'point', effects: [{ type: 'damage', value: 8, dt: 'feu' }], particle: 'fire' }],
  };
  it('convertit jetons, zones, sorts, combat', () => {
    const e = lireEtat(v7)!;
    expect(e.grille).toEqual({ type: 'hex', taille: 50 });
    expect(e.jetons[0]).toMatchObject({ nom: 'Kahlan', camp: 'pj', pv: 12, couleur: null, carac: { sag: 14 } });
    expect(e.zones[0]).toMatchObject({ terrain: 'difficile', forme: 'carre' });
    expect(e.sorts[0]).toMatchObject({ particule: 'feu', effets: [{ type: 'degats', valeur: 8 }] });
    expect(e.combat).toMatchObject({ actif: true, round: 2 });
    expect(e.prochainId).toBe(4);
  });
  it('relit le nouveau format et refuse le reste', () => {
    const e = depuisV7(v7);
    expect(lireEtat(JSON.parse(JSON.stringify(e)))!.jetons[0].nom).toBe('Kahlan');
    expect(lireEtat({ n: 1 })).toBeNull();
  });
});

describe('historique', () => {
  it('annule, rétablit, fusionne', () => {
    let h = historique(1);
    h = pousser(h, 2); h = pousser(h, 3); h = pousser(h, 4, true);
    expect(h.passe).toEqual([1, 2]);
    h = annuler(h);
    expect(h.present).toBe(2);
    h = retablir(h);
    expect(h.present).toBe(4);
    h = annuler(pousser(annuler(h), 9));
    expect(h.futur).toEqual([9]);
  });
});

describe('packs', () => {
  it('ajoute créatures, sorts et états sans doublon', async () => {
    const { appliquerPack, estPack } = await import('./index');
    const pack = { format: 'jdr-global-pack' as const, version: 1, id: 'p', nom: 'P', bibliotheque: [{ ...nouvelEtat().bibliotheque[0], nom: 'Bête' }],
      sorts: [{ ...nouvelEtat().sorts[0], nom: 'Sort du pack' }], conditions: ['Marqué'] };
    expect(estPack(pack)).toBe(true);
    expect(estPack({ nom: 'x' })).toBe(false);
    const e = appliquerPack(appliquerPack(nouvelEtat(), pack), pack);
    expect(e.bibliotheque.filter((m) => m.nom === 'Bête')).toHaveLength(1);
    expect(e.sorts.filter((s) => s.nom === 'Sort du pack')).toHaveLength(1);
    expect(new Set(e.sorts.map((s) => s.id)).size).toBe(e.sorts.length);
    expect(e.etatsSup).toEqual(['Marqué']);
  });
  it('aucun élément d’un univers particulier dans la table de base', () => {
    const texte = JSON.stringify(nouvelEtat());
    for (const mot of ['Haran', 'Mriswith', 'Confess', 'Scarlet', 'sorcier']) expect(texte).not.toContain(mot);
  });
});
