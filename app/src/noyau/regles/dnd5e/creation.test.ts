import { describe, expect, it } from 'vitest';
import { choixAleatoires, coutAchat, creer, pointsDepenses, repartir, tirage4d6 } from './creation';
import { calculer } from './fiche';
import { mulberry32 } from '../../hasard';

describe('création 5e', () => {
  it('achat de points : coûts du SRD, 27 points pour 15/15/15/8/8/8', () => {
    expect([8, 13, 14, 15].map(coutAchat)).toEqual([0, 5, 7, 9]);
    expect(pointsDepenses({ for: 15, dex: 15, con: 15, int: 8, sag: 8, cha: 8 })).toBe(27);
  });

  it('tirage 4d6 : six valeurs de 3 à 18 ; répartition sur les caractéristiques principales', () => {
    const v = tirage4d6(mulberry32(7));
    expect(v).toHaveLength(6);
    for (const x of v) { expect(x).toBeGreaterThanOrEqual(3); expect(x).toBeLessThanOrEqual(18); }
    const r = repartir([15, 14, 13, 12, 10, 8], 'magicien', mulberry32(1));
    expect(r.int).toBe(15);
    expect(r.con).toBe(14);
  });

  it('aléatoire reproductible, rôle → classe', () => {
    expect(choixAleatoires('graine-1')).toEqual(choixAleatoires('graine-1'));
    expect(choixAleatoires('graine-1')).not.toEqual(choixAleatoires('graine-2'));
    expect(choixAleatoires('x', { role: 'capitaine de la garde', espece: 'humain' }).classe).toMatch(/guerrier|paladin|barbare/);
  });

  it('créer : bonus du peuple, maîtrises, équipement équipé, PV, niveau de sous-classe', () => {
    const c = choixAleatoires('brann', { classe: 'guerrier', espece: 'nain-des-collines', niveau: 3, methode: 'standard' });
    const { stats, fiche } = creer(c);
    const carac = stats.carac as Record<string, number>;
    expect(carac.con).toBe(c.caracs.con + 2);
    expect(fiche.maitrises?.sauvegardes).toEqual(['for', 'con']);
    expect(Object.keys(fiche.maitrises!.competences!).length).toBeGreaterThanOrEqual(4);
    expect(fiche.progression?.classes?.[0]).toMatchObject({ id: 'guerrier', niveau: 3, sousClasse: 'champion' });
    expect(fiche.inventaire!.objets.filter((o) => o.equipe).map((o) => o.ref)).toEqual(expect.arrayContaining(['armure:cotte-de-mailles', 'arme:epee-longue', 'armure:bouclier']));
    expect(stats.ca).toBe(18);
    expect(stats.pvMax).toBe(calculer({ id: 'x', nom: 'x', sorte: 'pj', combat: { regles: 'dnd5e', stats }, fiche }).pvMaxSuggere);
    expect(stats.vitesse).toBe(5);
  });

  it('chaque classe et chaque peuple se créent sans erreur', async () => {
    const { CLASSES, PEUPLES } = await import('./progression');
    for (const cl of CLASSES) for (const pe of PEUPLES) {
      const { stats } = creer(choixAleatoires(`${cl.id}-${pe.id}`, { classe: cl.id, espece: pe.id, niveau: 5 }));
      expect(stats.pvMax as number).toBeGreaterThan(0);
    }
  });
});
