// Contrôle d'équilibre de la table : sorts de base traduits en gabarits (dégâts, zones, défenses), actions de combat
// et ce que la fiche apporte (talents, dons, classes). Échoue si une donnée sort des bornes.
import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, nouveauPersonnage, type Personnage } from '../../noyau/contrat';
import { regles, type SystemeAvecFiche } from '../../noyau/regles';
import TALENTS from '../../noyau/regles/dnd5e/talents.json';
import { capacitesCombat } from './capacites';
import { gabarit } from './logique';
import { ACTIONS_COMBAT, actionCombat } from './moteur';
import { sortsDeLaCampagne } from './sorts';

const R = regles('dnd5e') as SystemeAvecFiche;

describe('équilibre des sorts', () => {
  const sorts = sortsDeLaCampagne(nouvelleCampagne('T')).map((s) => ({ nom: s.nom, g: gabarit(s.analyse, R) }));
  const degats = (g: ReturnType<typeof gabarit>) => g.effets.find((e) => e.type === 'degats')?.valeur ?? 0;
  const zone = (g: ReturnType<typeof gabarit>) => g.forme !== 'cercle' || g.rayon > 1;

  it('tout sort offensif laisse une défense aux cibles (sauvegarde ou jet d’attaque)', () => {
    for (const { nom, g } of sorts) {
      const nuit = g.effets.some((e) => e.type === 'degats' || (e.type === 'condition' && e.valeur !== 'Invisible'));
      if (nuit) expect(!!g.sauvegarde || !!g.attaque, nom).toBe(true);
    }
  });

  it('dégâts plafonnés : 35 sur une cible (10d6), 28 en zone (8d6) ; soins ≤ 35 ; zones et portées raisonnables', () => {
    for (const { nom, g } of sorts) {
      expect(degats(g), nom).toBeLessThanOrEqual(zone(g) ? 28 : 35);
      expect(g.effets.find((e) => e.type === 'soin')?.valeur ?? 0, nom).toBeLessThanOrEqual(35);
      if (g.effets.some((e) => e.type !== 'soin')) expect(g.rayon, nom).toBeLessThanOrEqual(12); // zone d'un sort qui nuit
      expect(g.portee, nom).toBeLessThanOrEqual(60);
    }
  });

  it('répartition (pour le rapport)', () => {
    const d = sorts.map(({ g }) => degats(g)).filter((x) => x > 0).sort((a, b) => a - b);
    console.log(`sorts : ${sorts.length} · offensifs : ${d.length} · dégâts min ${d[0]} / médiane ${d[Math.floor(d.length / 2)]} / max ${d[d.length - 1]} · zones : ${sorts.filter(({ g }) => zone(g)).length} · sauvegardes : ${sorts.filter(({ g }) => g.sauvegarde).length} · attaques : ${sorts.filter(({ g }) => g.attaque).length}`);
    expect(d.length).toBeGreaterThan(0);
  });

  it('à puissance égale, une zone fait moins de dégâts par cible qu’un sort à une cible', () => {
    const a = gabarit({ nom: 'A', coeur: 'braise', coeurInverse: false, forme: 'dard', formeInverse: false, directionCote: false, puissance: 6, porteeM: 18, zoneM: 0, dureeLongue: false, resume: '' }, R);
    const z = gabarit({ nom: 'Z', coeur: 'braise', coeurInverse: false, forme: 'pluie', formeInverse: false, directionCote: false, puissance: 6, porteeM: 18, zoneM: 6, dureeLongue: false, resume: '' }, R);
    expect(degats(z)).toBeLessThan(degats(a));
    expect(a.attaque).toBe(true);
    expect(z.sauvegarde).toBe('dex');
  });
});

describe('actions de combat et fiche', () => {
  it('chaque action référencée (talents, dons) existe ; chaque action a un effet', () => {
    for (const a of ACTIONS_COMBAT) expect(a.effets.length, a.id).toBeGreaterThan(0);
    const arbres = TALENTS.arbres as unknown as { branches: { noeuds: { id: string; action?: string }[] }[] }[];
    for (const n of arbres.flatMap((a) => a.branches.flatMap((b) => b.noeuds))) if (n.action) expect(actionCombat(n.action), n.id).toBeTruthy();
    for (const d of R.catalogue.dons ?? []) for (const id of d.actions ?? []) expect(actionCombat(id), d.id).toBeTruthy();
  });

  it('la fiche décide : guerrier (second souffle, fougue), talents (action et passif), don (CA, initiative), magie', () => {
    const base = nouveauPersonnage('Brune', 'pj', 'dnd5e', R.statsParDefaut());
    const p: Personnage = { ...base, fiche: { progression: { classes: [{ id: 'guerrier', niveau: 5 }], talents: ['fer.f1', 'fer.racine'], dons: ['vigilant', 'bouclier-vivant'] } } };
    const c = capacitesCombat(p, R);
    expect(c.actions).toEqual(expect.arrayContaining(['foncer', 'esquiver', 'second-souffle', 'fougue']));
    expect(c.actions).not.toContain('rage');
    expect(c.profil.passifs).toContain('sang-chaud');
    expect(c.profil.attaquesParAction).toBe(2); // attaque supplémentaire au niveau 5
    expect(c.profil.bonusInitiative).toBe(6); // +5 Vigilant, +1 talent
    expect(c.profil.magie).toBe(false);
    const sans = capacitesCombat({ ...p, fiche: { progression: { classes: [{ id: 'guerrier', niveau: 5 }] } } }, R);
    expect((c.jeton.ca ?? 0) - (sans.jeton.ca ?? 0)).toBe(1); // Bouclier vivant
    // La magie : une classe qui lance des sorts, ou le don qui l'éveille.
    expect(capacitesCombat({ ...base, fiche: { progression: { classes: [{ id: 'magicien', niveau: 1 }] } } }, R).profil.magie).toBe(true);
    expect(capacitesCombat({ ...base, fiche: { progression: { classes: [{ id: 'guerrier', niveau: 1 }], dons: ['initie-sceaux'] } } }, R).profil.magie).toBe(true);
  });
});
