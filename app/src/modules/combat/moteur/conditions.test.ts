import { describe, expect, it } from 'vitest';
import { ajouterJeton, attaquer, debuterCombat, deplacer, jouerAction, lancerSort, nouvelEtat, tourSuivant } from './index';
import { modeAttaque, resteMouvement, sauvegarde, vitesseEffective } from './conditions';
import type { EtatTable, Gabarit, Jeton, ProfilCombat } from './index';

const fixe = (v: number) => () => v;
const suite = (vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]; };
const profil = (p: Partial<ProfilCombat> = {}): ProfilCombat => ({ niveau: 3, bonusInitiative: 0, sauvegardes: {}, competences: {}, maitrises: [], ddSorts: 13, attaqueSort: 5, attaquesParAction: 1, passifs: [], magie: true, ...p });
function table(...jetons: [string, number, number, Partial<Jeton>?][]): EtatTable {
  let e = nouvelEtat();
  for (const [nom, x, y, m] of jetons) e = ajouterJeton(e, { nom, camp: nom === 'Gob' || nom === 'Orc' ? 'ennemi' : 'pj', ...m }, x, y).etat;
  return debuterCombat(e, fixe(0), Object.fromEntries(e.jetons.map((j, i) => [j.id, 20 - i])));
}
const avec = (e: EtatTable, nom: string, f: (j: Jeton) => Jeton): EtatTable => ({ ...e, jetons: e.jetons.map((j) => (j.nom === nom ? f(j) : j)) });
const j = (e: EtatTable, nom: string) => e.jetons.find((x) => x.nom === nom)!;

describe('les états comptent', () => {
  it('vitesse : immobilisé, ralenti, foncer ; le déplacement suit', () => {
    const e = table(['Ada', 0, 0, { vitesse: 6 }]);
    expect(vitesseEffective({ ...j(e, 'Ada'), conditions: ['Entravé'] })).toBe(0);
    expect(vitesseEffective({ ...j(e, 'Ada'), conditions: ['Ralenti'] })).toBe(3);
    expect(vitesseEffective({ ...j(e, 'Ada'), conditions: ['Fonce'] })).toBe(12);
    const entrave = avec(e, 'Ada', (x) => ({ ...x, conditions: ['Entravé'] }));
    expect(deplacer(entrave, 1, [0, 0], [1, 0]).ok).toBe(false);
    const fonce = avec(e, 'Ada', (x) => ({ ...x, conditions: ['Fonce'] }));
    expect(deplacer(fonce, 1, [0, 0], [10, 0]).ok).toBe(true);
    expect(resteMouvement(j(deplacer(fonce, 1, [0, 0], [10, 0]).etat, 'Ada'))).toBe(2);
  });

  it('avantage et désavantage : caché, cible aveuglée, empoisonné, esquive ; les deux s’annulent', () => {
    const e = table(['Ada', 0, 0], ['Gob', 1, 0]);
    const a = j(e, 'Ada'), g = j(e, 'Gob');
    expect(modeAttaque({ ...a, conditions: ['Caché'] }, g, 'melee').mode).toBe('avantage');
    expect(modeAttaque(a, { ...g, conditions: ['Aveuglé'] }, 'melee').mode).toBe('avantage');
    expect(modeAttaque({ ...a, conditions: ['Empoisonné'] }, g, 'melee').mode).toBe('desavantage');
    expect(modeAttaque(a, { ...g, conditions: ['Esquive'] }, 'melee').mode).toBe('desavantage');
    expect(modeAttaque({ ...a, conditions: ['Caché', 'Empoisonné'] }, g, 'melee').mode).toBe('normal');
    expect(modeAttaque(a, g, 'distance', true).raisons).toEqual(['ennemi au contact']);
  });

  it('attaque : avantage en deux dés, la cachette est consommée, attaque supplémentaire, attaque sournoise, rage', () => {
    let e = table(['Ada', 0, 0, { bonusAttaque: 5, degats: '1d6+3', profil: profil({ attaquesParAction: 2, sournoise: 2 }) }], ['Gob', 1, 0, { ca: 12, pv: 30, pvMax: 30 }]);
    e = avec(e, 'Ada', (x) => ({ ...x, conditions: ['Caché'] }));
    const r = attaquer(e, 1, 2, 'melee', suite([0.1, 0.9, 0.5, 0.5, 0.5]));
    expect(r.resultat).toMatchObject({ mode: 'avantage', touche: true, jet: 19 });
    expect(j(r.etat, 'Ada').conditions).not.toContain('Caché');
    expect(j(r.etat, 'Ada').drapeaux.action).toBe(false); // il reste une attaque
    expect(r.etat.journal.some((l) => l.msg.includes('attaque sournoise'))).toBe(true);
    const r2 = attaquer(r.etat, 1, 2, 'melee', fixe(0.5));
    expect(j(r2.etat, 'Ada').drapeaux.action).toBe(true);
    // La rage divise par deux les dégâts d'arme subis.
    const enRage = avec(table(['Ada', 0, 0, { bonusAttaque: 5, degats: '10' }], ['Gob', 1, 0, { ca: 1, pv: 30, pvMax: 30 }]), 'Gob', (x) => ({ ...x, conditions: ['Rage'] }));
    expect(attaquer(enRage, 1, 2, 'melee', fixe(0.5)).resultat!.degats).toBe(5);
  });

  it('ne peut pas agir : paralysé, et le tour le dit ; sauvegarde ratée d’office en DEX', () => {
    const e = avec(table(['Ada', 0, 0], ['Gob', 1, 0]), 'Ada', (x) => ({ ...x, conditions: ['Paralysé'] }));
    expect(attaquer(e, 1, 2, 'melee', fixe(0.5)).erreur).toMatch(/ne peut pas agir/);
    expect(sauvegarde(j(e, 'Ada'), 'dex', 5, fixe(0.99))).toMatchObject({ reussi: false, auto: true });
    expect(tourSuivant(tourSuivant(e)).journal.some((l) => l.msg.includes('ne peut pas agir'))).toBe(true);
  });

  it('sorts : sauvegarde des cibles contre le DD du lanceur, moitié des dégâts', () => {
    const boule: Gabarit = { id: 100, nom: 'Boule', forme: 'cercle', rayon: 2, portee: 10, origine: 'point', effets: [{ type: 'degats', valeur: 20 }], couleur: '', particule: null, concentration: false, desc: '', sauvegarde: 'dex' };
    let e = table(['Ada', 0, 0, { profil: profil({ ddSorts: 15 }) }], ['Gob', 3, 0, { pv: 40, pvMax: 40 }], ['Orc', 4, 0, { pv: 40, pvMax: 40, carac: { for: 10, dex: 10, con: 10, int: 10, sag: 10, cha: 10 } }]);
    e = { ...e, sorts: [boule] };
    const r = lancerSort(e, 100, 1, { categorie: 'sort', forme: 'cercle', x: 3, y: 0, rayon: 2, angle: 0, couleur: '', nom: 'Boule' }, suite([0.99, 0.0]));
    expect(j(r.etat, 'Gob').pv).toBe(30); // sauvegarde réussie (20 + 0 ≥ 15) : moitié
    expect(j(r.etat, 'Orc').pv).toBe(20); // ratée (1) : tout
  });

  it('actions : foncer, se cacher, second souffle limité, aider, premiers soins', () => {
    let e = table(['Ada', 0, 0, { pv: 5, pvMax: 30, profil: profil({ niveau: 4, competences: { discretion: 6, medecine: 4 } }) }], ['Bo', 1, 0, { pv: 0, pvMax: 20 }], ['Gob', 6, 0]);
    let r = jouerAction(e, 1, 'foncer', null, fixe(0.5));
    expect(j(r.etat, 'Ada').conditions).toContain('Fonce');
    expect(jouerAction(r.etat, 1, 'esquiver', null, fixe(0.5)).erreur).toMatch(/Action déjà utilisée/);
    r = jouerAction(e, 1, 'second-souffle', null, fixe(0.5)); // 1d10 (6) + 4
    expect(j(r.etat, 'Ada').pv).toBe(15);
    expect(jouerAction({ ...r.etat, jetons: r.etat.jetons.map((x) => ({ ...x, drapeaux: { ...x.drapeaux, bonus: false } })) }, 1, 'second-souffle', null, fixe(0.5)).erreur).toMatch(/Plus d’utilisation/);
    expect(jouerAction(e, 1, 'cacher', null, fixe(0.5)).texte).toMatch(/caché/); // 11 + 6 = 17 ≥ 10
    expect(jouerAction(e, 1, 'aider', 3, fixe(0.5)).erreur).toMatch(/pas un allié/);
    expect(j(jouerAction(e, 1, 'premiers-soins', 2, fixe(0.5)).etat, 'Bo').pv).toBe(1);
  });
});
