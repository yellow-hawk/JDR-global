import { describe, expect, it } from 'vitest';
import { nouvelleCampagne } from '../../noyau/contrat';
import { regles } from '../../noyau/regles';
import { ajouter, champsVisibles, grouper, modifierPerso, sceneJoueurs, supprimer } from './logique';

const R = regles('dnd5e');

describe('personnages', () => {
  it('ajoute avec les stats par défaut du système', () => {
    const { campagne, id } = ajouter(nouvelleCampagne('T'), 'pj', R);
    const p = campagne.personnages.find((x) => x.id === id)!;
    expect(p.combat.regles).toBe('dnd5e');
    expect(p.combat.stats.pv).toBe(20);
  });

  it('groupe dans l’ordre PJ → ennemis', () => {
    let c = nouvelleCampagne('T');
    c = ajouter(c, 'ennemi', R).campagne;
    c = ajouter(c, 'pj', R).campagne;
    expect(grouper(c.personnages).map((g) => g.sorte.id)).toEqual(['pj', 'ennemi']);
  });

  it('les joueurs ne voient que les stats publiques d’un ennemi', () => {
    let c = nouvelleCampagne('T');
    const r = ajouter(c, 'ennemi', R);
    c = modifierPerso(r.campagne, r.id, (p) => ({ ...p, mj: { notes: 'traître' } }));
    const p = c.personnages[0];
    expect(champsVisibles(p, R, 'joueurs').map((x) => x.cle)).toEqual(['vitesse']);
    const s = sceneJoueurs(p, R, null);
    expect(JSON.stringify(s)).not.toContain('PV');
    expect(JSON.stringify(s)).not.toContain('traître');
  });

  it('supprime le portrait seulement s’il n’est plus utilisé', () => {
    let c = nouvelleCampagne('T');
    const r = ajouter(c, 'pj', R);
    c = modifierPerso(r.campagne, r.id, (p) => ({ ...p, portrait: 'fichier-x' }));
    c = { ...c, fichiers: [{ id: 'fichier-x', nom: 'x.png', mime: 'image/png', octets: 1 }] };
    const s = supprimer(c, r.id);
    expect(s.fichierLibere).toBe('fichier-x');
    expect(s.campagne.fichiers).toEqual([]);
  });
});
