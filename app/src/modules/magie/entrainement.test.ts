import { describe, expect, it } from 'vitest';
import { nouveauProfil } from './atelier/engine/profils';
import type { Sceau } from './atelier/engine/types';
import { appliquerEntrainement } from './entrainement';

const sceau = (rameau: string): Sceau => ({ coeur: { id: 'braise', inv: false }, rameaux: [{ id: rameau, angle: 90, inv: false }], noeuds: [], taille: 2, entaille: null });

describe('zone d’entraînement des joueurs', () => {
  const base = nouveauProfil('Adèle');
  const tout = { lecons: true, grimoire: true }, rien = { lecons: false, grimoire: false };

  it('records et calibrage toujours gardés (le meilleur record)', () => {
    const p = { ...base, defis: { s1: { score: 80, temps: 9000, date: 1 } } };
    const r = appliquerEntrainement(p, { defis: { s1: { score: 70, temps: 5000, date: 2 }, s2: { score: 95, temps: 7000, date: 2 } }, calibrage: { braise: [[[{ x: 1, y: 2 }]]], inconnu: [[]] } }, rien);
    expect(r.defis.s1.score).toBe(80);
    expect(r.defis.s2.score).toBe(95);
    expect(Object.keys(r.calibrage)).toEqual(['braise']);
  });

  it('leçon réussie : son signe est appris si le MJ le permet, et seulement lui', () => {
    const recu = { lecons: ['l-pluie', 'inexistante'], signes: [...base.signes, 'pluie', 'tempete'] };
    expect(appliquerEntrainement(base, recu, rien).signes).not.toContain('pluie');
    const r = appliquerEntrainement(base, recu, tout);
    expect(r.lecons).toEqual(['l-pluie']);
    expect(r.signes).toContain('pluie');
    expect(r.signes).not.toContain('tempete');
  });

  it('grimoire : seulement si permis, avec des signes connus', () => {
    const recu = { grimoire: [{ id: 'a', nom: 'Jet de braise', notes: '', sceau: sceau('jet'), cree: 1 }, { id: 'b', nom: 'Pluie', notes: '', sceau: sceau('pluie'), cree: 1 }] };
    expect(appliquerEntrainement(base, recu, rien).grimoire).toEqual([]);
    expect(appliquerEntrainement(base, recu, tout).grimoire.map((s) => s.nom)).toEqual(['Jet de braise']);
  });
});
