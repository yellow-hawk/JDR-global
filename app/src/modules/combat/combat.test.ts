import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, nouveauPersonnage } from '../../noyau/contrat';
import { regles } from '../../noyau/regles';
import { GRIMOIRE_DE_BASE } from '../magie';
import { avecTableEnCours, enregistrerRencontre, etatDeRencontre, gabarit, jetonDepuisPersonnage, reporterDansFiches, tableEnCours } from './logique';
import { ajouterJeton, nouvelEtat, ajouterZone, zoneDeTerrain, TERRAINS, modifierJeton } from './moteur';
import { bornes, cadrer, jetonVisible, versEcran, versMonde, zoomer } from './rendu';
import { casesDuPinceau, jetonSous, zoneSous } from './interface/interactions';
import { sortsDeLaCampagne } from './sorts';

const R = regles('dnd5e');

describe('combat ↔ campagne', () => {
  it('personnage → modèle de jeton', () => {
    const p = nouveauPersonnage('Richard', 'pj', 'dnd5e', { pv: 40, pvMax: 52, ca: 18, vitesse: 6, carac: { for: 16, dex: 14 }, degats: '1d10+3' });
    const m = jetonDepuisPersonnage(p, R, null);
    expect(m).toMatchObject({ persoId: p.id, nom: 'Richard', camp: 'pj', pv: 40, pvMax: 52, ca: 18, degats: '1d10+3' });
    expect(m.carac).toMatchObject({ for: 16, dex: 14, con: 10 });
    const e = ajouterJeton(nouvelEtat(), m, 0, 0).etat;
    expect(e.jetons[0].pv).toBe(40);
  });

  it('colonne de feu → ligne lancée de soi, dégâts de feu', () => {
    const g = gabarit({ nom: 'Colonne', coeur: 'braise', coeurInverse: false, forme: 'jet', formeInverse: false, directionCote: true,
      puissance: 4, porteeM: 12, zoneM: 3, dureeLongue: false, resume: '' }, R);
    expect(g).toMatchObject({ forme: 'ligne', origine: 'soi', rayon: 8, particule: 'feu', atelier: true });
    expect(g.effets).toEqual([{ type: 'degats', valeur: 14, nature: 'braise' }, { type: 'condition', valeur: 'En feu' }]);
  });

  it('tous les sorts de base se traduisent en gabarit valide', () => {
    const liste = sortsDeLaCampagne(nouvelleCampagne('T'));
    expect(liste.length).toBe(GRIMOIRE_DE_BASE.length);
    for (const s of liste) {
      const g = gabarit(s.analyse, R);
      expect(['cercle', 'cone', 'ligne', 'rectangle']).toContain(g.forme);
      expect(g.rayon).toBeGreaterThanOrEqual(1);
    }
  });

  it('rencontre : jetons liés aux personnages + état complet relu', () => {
    let c = nouvelleCampagne('T');
    const p = nouveauPersonnage('Kahlan', 'pj', 'dnd5e', {});
    c = { ...c, personnages: [p] };
    let e = ajouterJeton(nouvelEtat(), jetonDepuisPersonnage(p, R, null), 3, 4).etat;
    e = ajouterJeton(e, { nom: 'Garde' }, 9, 9).etat;
    e = ajouterZone(e, zoneDeTerrain(TERRAINS[0], 'cercle', 1, 1, 2)).etat;
    const r = enregistrerRencontre(c, 'Gué', e, null).campagne.rencontres[0];
    expect(r.jetons).toEqual([{ perso: { type: 'personnage', id: p.id }, x: 3, y: 4, visible: true }]);
    expect(r.terrain).toHaveLength(1);
    expect(etatDeRencontre(JSON.parse(JSON.stringify(r))).jetons.map((j) => j.nom)).toEqual(['Kahlan', 'Garde']);
  });

  it('ancienne rencontre v7 toujours lisible', () => {
    const r = { id: 'r', nom: 'v7', jetons: [], terrain: [], table: { tokens: [{ id: 1, name: 'Zedd', type: 'pc', hp: 5, hpMax: 9 }] } };
    expect(etatDeRencontre(r).jetons[0]).toMatchObject({ nom: 'Zedd', camp: 'pj', pv: 5 });
  });

  it('table en cours sauvegardée dans modules.combat', () => {
    const c = avecTableEnCours(nouvelleCampagne('T'), ajouterJeton(nouvelEtat(), { nom: 'X' }, 1, 1).etat);
    expect(tableEnCours(JSON.parse(JSON.stringify(c))).jetons[0].nom).toBe('X');
    expect(tableEnCours(nouvelleCampagne('T')).jetons).toEqual([]);
  });
});

describe('retour vers les fiches', () => {
  it('reporte les PV et états des jetons liés', () => {
    const p = nouveauPersonnage('Richard', 'pj', 'dnd5e', { pv: 52, pvMax: 52 });
    const c = { ...nouvelleCampagne('T'), personnages: [p] };
    let e = ajouterJeton(nouvelEtat(), jetonDepuisPersonnage(p, R, null), 0, 0).etat;
    e = ajouterJeton(e, { nom: 'Garde' }, 1, 0).etat;
    e = modifierJeton(e, 1, (j) => ({ ...j, pv: 31, conditions: ['En feu'] }));
    const r = reporterDansFiches(c, e.jetons, R);
    expect(r.modifies).toBe(1);
    expect(r.campagne.personnages[0].combat.stats.pv).toBe(31);
    expect(r.campagne.personnages[0].combat.conditions).toEqual(['En feu']);
    expect(reporterDansFiches(r.campagne, e.jetons, R).modifies).toBe(0);
  });
});

describe('rendu et interactions (pur)', () => {
  it('caméra : aller-retour et zoom centré sur le curseur', () => {
    const c = zoomer({ x: 10, y: 20, zoom: 1 }, 2, 100, 100);
    expect(versEcran(c, ...versMonde(c, 100, 100))).toEqual([100, 100]);
    expect(versMonde(c, 100, 100)).toEqual(versMonde({ x: 10, y: 20, zoom: 1 }, 100, 100));
    const k = cadrer([0, 0, 1000, 500], 1020, 1020, 10);
    expect(k.zoom).toBe(1);
  });

  it('vue joueurs : jetons cachés, ennemis invisibles et brouillard', () => {
    let e = ajouterJeton(nouvelEtat(), { nom: 'A', camp: 'pj' }, 0, 0).etat;
    e = ajouterJeton(e, { nom: 'B', camp: 'ennemi' }, 2, 0).etat;
    e = ajouterJeton(e, { nom: 'C', camp: 'ennemi' }, 4, 0).etat;
    e = modifierJeton(e, 2, (j) => ({ ...j, conditions: ['Invisible'] }));
    e = modifierJeton(e, 3, (j) => ({ ...j, visible: false }));
    expect(e.jetons.map((j) => jetonVisible(e, j, 'joueurs'))).toEqual([true, false, false]);
    expect(e.jetons.map((j) => jetonVisible(e, j, 'mj'))).toEqual([true, true, true]);
    const f = { ...e, brouillard: { actif: true, cases: { '0,0': true as const } } };
    expect(jetonVisible(f, f.jetons[0], 'joueurs')).toBe(true);
    e = ajouterJeton(f, { nom: 'D', camp: 'allie' }, 9, 9).etat;
    expect(jetonVisible(e, e.jetons[3], 'joueurs')).toBe(false);
    expect(bornes(e, 'joueurs')).toEqual([-40, -40, 80, 80]);
  });

  it('sélection à la souris et pinceau', () => {
    let e = ajouterJeton(nouvelEtat(), { nom: 'A' }, 2, 2).etat;
    e = ajouterZone(e, zoneDeTerrain(TERRAINS[0], 'carre', 8, 8, 1)).etat;
    expect(jetonSous(e, 100, 100)?.nom).toBe('A');
    expect(jetonSous(e, 300, 300)).toBeNull();
    expect(zoneSous(e, 8 * 40 + 20, 9 * 40 + 20)?.terrain).toBe('difficile');
    expect(casesDuPinceau(e, [0, 0], 1)).toHaveLength(9);
  });
});

describe('table préparée depuis une carte générée', () => {
  it('murs bloquants, jetons placés, fond calé', async () => {
    const { tableDepuisPlan } = await import('./logique');
    const { porteeDeplacement, TERRAINS: T } = await import('./moteur');
    const e = tableDepuisPlan({ carte: 'k1', pxCase: 70, rects: [{ terrain: 'mur', x0: 3, y0: 0, x1: 3, y1: 9 }], depart: [[1, 1], [1, 2]], ennemis: [[6, 1]], pj: [{ nom: 'A', camp: 'pj' }], adversaires: [{ nom: 'B' }, { nom: 'C' }] });
    expect(e.fond).toEqual({ carte: 'k1', pxCase: 70 });
    expect(e.jetons.map((j) => [j.nom, j.x, j.y])).toEqual([['A', 1, 1], ['B', 6, 1], ['C', expect.any(Number), expect.any(Number)]]);
    const p = porteeDeplacement(e.grille, e.zones, T, [], [1, 1], 30);
    expect(p['3,5']).toBeUndefined();
    expect(p['2,5']).toBeDefined();
    expect(p['3,0']).toBeUndefined();
  });
});
