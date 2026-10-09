import { describe, expect, it } from 'vitest';
import { nouvelleCampagne } from '../../../noyau/contrat';
import { regles, type SystemeAvecFiche } from '../../../noyau/regles';
import { personnageDepuisChoix } from '../creation/logique';
import { appliquerNiveau, donnerXp, etatProgression, xpRencontre } from './logique';

const R = regles('dnd5e') as SystemeAvecFiche;
const pj = () => personnageDepuisChoix(R, R.creation.aleatoire('brann', { classe: 'guerrier', espece: 'humain', niveau: 2, methode: 'standard' }), 'pj', {}, false);

describe('progression', () => {
  it('seuils d’XP et nouveautés de niveau', () => {
    const p = pj();
    expect(etatProgression(p, R)).toMatchObject({ niveau: 2, xp: 300, suivant: 900, pret: false });
    expect(R.progression.nouveautes('guerrier', 3)!.sousClasse!.map((s) => s.id)).toEqual(['champion']);
    expect(R.progression.nouveautes('guerrier', 4)!.amelioration).toBe(true);
    expect(R.progression.gainPv('guerrier', 2)).toBe(8);
    expect(R.progression.gainPv('magicien', -3, 1)).toBe(1);
  });

  it('monter de niveau : classe, sous-classe, PV, amélioration, journal', () => {
    const p = pj();
    const pv = Number(p.combat.stats.pvMax);
    const q = appliquerNiveau(p, R, { classe: 'guerrier', pv: 8, sousClasse: 'champion', amelioration: { for: 2 } }, 'auj.');
    expect(q.fiche!.progression!.classes![0]).toMatchObject({ niveau: 3, sousClasse: 'champion' });
    expect(q.combat.stats.pvMax).toBe(pv + 8);
    expect((q.combat.stats.carac as Record<string, number>).for).toBe(Math.min(20, (p.combat.stats.carac as Record<string, number>).for + 2));
    expect(q.combat.stats.niveau).toBe(3);
    expect(q.fiche!.journal!.slice(-1)[0].texte).toMatch(/Niveau 3/);
    const m = appliquerNiveau(q, R, { classe: 'magicien', pv: 4 }, 'auj.');
    expect(m.fiche!.progression!.classes!.map((c) => `${c.id}${c.niveau}`)).toEqual(['guerrier3', 'magicien1']);
  });

  it('distribuer l’XP d’une rencontre', () => {
    const c = nouvelleCampagne('T');
    const a = pj(), b = { ...pj(), id: 'b' };
    const orc = { ...personnageDepuisChoix(R, R.creation.aleatoire('orc', { niveau: 2 }), 'ennemi', {}, false) };
    const xp = xpRencontre([orc, orc], R);
    expect(xp).toBe(900);
    const d = donnerXp({ ...c, personnages: [a, b] }, [a.id, b.id], xp, 'Embuscade', 'auj.');
    expect(d.personnages.map((p) => p.fiche!.progression!.xp)).toEqual([750, 750]);
    expect(d.personnages[0].fiche!.progression!.journalXp!.slice(-1)[0]).toMatchObject({ gain: 450, raison: 'Embuscade' });
  });
});
