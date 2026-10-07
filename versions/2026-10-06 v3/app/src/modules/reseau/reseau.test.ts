import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, nouveauPersonnage, nouvelUnivers } from '../../noyau/contrat';
import { grapheDeCampagne } from './logique';

describe('réseau de la campagne', () => {
  it('relie quêtes, personnages, rencontres, cartes et peuples', () => {
    const u = { ...nouvelUnivers('M', 'genere'), civilisations: { monde: null, peuples: [
      { cle: 0, nom: 'les A', villes: [], traits: [], coutumes: [], histoire: [], noms: [], relations: [{ peuple: 1, nom: 'les B', sorte: 'rivaux' }] },
      { cle: 1, nom: 'les B', villes: [], traits: [], coutumes: [], histoire: [], noms: [], relations: [{ peuple: 0, nom: 'les A', sorte: 'rivaux' }] },
    ] } };
    const p = { ...nouveauPersonnage('Vorn', 'ennemi', 'dnd5e', {}), peuple: { atlas: '0' } };
    let c = nouvelleCampagne('T');
    c = { ...c, campagne: { ...c.campagne, univers: { type: 'univers', id: u.id } }, univers: [u], personnages: [p],
      quetes: [{ id: 'q', titre: 'Q', source: { sorte: 'fait-main' }, lieux: [], personnages: [{ type: 'personnage', id: p.id }] }],
      rencontres: [{ id: 'r', nom: 'R', jetons: [{ perso: { type: 'personnage', id: p.id }, x: 0, y: 0, visible: true }], terrain: [], quete: { type: 'quete', id: 'q' } }] };
    const g = grapheDeCampagne(c);
    const a = (de: string, vers: string) => g.liens.some((l) => l.de === de && l.vers === vers);
    expect(a('quete:q', `personnage:${p.id}`)).toBe(true);
    expect(a('quete:q', 'rencontre:r')).toBe(true);
    expect(a(`personnage:${p.id}`, `peuple:${u.id}:0`)).toBe(true);
    expect(g.liens.filter((l) => l.sorte === 'rivaux')).toHaveLength(1);
    const filtre = grapheDeCampagne(c, new Set(['ennemi', 'quete']));
    expect(filtre.noeuds.map((n) => n.sorte).sort()).toEqual(['ennemi', 'quete']);
    expect(filtre.liens).toHaveLength(1);
  });
});
