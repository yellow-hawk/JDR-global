import { describe, expect, it } from 'vitest';
import {
  chargerCampagne, nouvelleCampagne, nouvelleCarte, nouveauPersonnage,
  referencesCassees, trouver, vueJoueurs,
} from './index';

describe('chargement tolérant', () => {
  it('accepte une campagne neuve sans alerte', () => {
    const c = nouvelleCampagne('Test');
    const r = chargerCampagne(JSON.parse(JSON.stringify(c)));
    expect(r.alertes).toEqual([]);
    expect(r.campagne.campagne.nom).toBe('Test');
  });

  it('complète les champs manquants et garde les champs inconnus', () => {
    const r = chargerCampagne({
      format: 'jdr-global', version: 1,
      campagne: { id: 'camp-1', nom: 'X', champFutur: 42 },
      cartes: [{ id: 'carte-1', nom: 'Monde', bidule: 'gardé' }],
    });
    const carte = r.campagne.cartes[0] as unknown as Record<string, unknown>;
    expect(carte.reperes).toEqual([]);
    expect(carte.bidule).toBe('gardé');
    expect((r.campagne.campagne as unknown as Record<string, unknown>).champFutur).toBe(42);
    expect(r.campagne.personnages).toEqual([]);
  });

  it('répare identifiants manquants et doublons, ignore les déchets', () => {
    const r = chargerCampagne({
      campagne: { nom: 'X' },
      personnages: [{ nom: 'A' }, { id: 'p', nom: 'B' }, { id: 'p', nom: 'C' }, 'déchet'],
      sorts: 'pas une liste',
    });
    expect(r.campagne.personnages).toHaveLength(3);
    expect(new Set(r.campagne.personnages.map((p) => p.id)).size).toBe(3);
    expect(r.alertes.length).toBeGreaterThanOrEqual(4);
  });

  it('refuse un autre format', () => {
    expect(() => chargerCampagne({ format: 'atlas-des-ciels' })).toThrow();
    expect(() => chargerCampagne([1, 2])).toThrow();
  });
});

describe('références', () => {
  it('détecte un lien cassé et résout un lien valide', () => {
    const c = nouvelleCampagne('T');
    const monde = nouvelleCarte('Monde', 'monde');
    const pays = nouvelleCarte('Pays', 'pays');
    pays.parent = { carte: { type: 'carte', id: monde.id }, zone: [0, 0, 10, 10] };
    c.cartes.push(monde, pays);
    expect(referencesCassees(c)).toEqual([]);
    expect(trouver(c, { type: 'carte', id: monde.id })).toBe(monde);
    pays.parent.carte.id = 'carte-absente';
    expect(referencesCassees(c)).toHaveLength(1);
  });
});

describe('vue joueurs', () => {
  it('retire toutes les clés mj, les objets cachés et les fichiers MJ seuls', () => {
    const c = nouvelleCampagne('T');
    c.campagne.mj = { notes: 'secret' };
    const p = nouveauPersonnage('Rahl', 'ennemi', 'dnd5e', { pv: 40 });
    p.mj = { motivation: 'domination' };
    const espion = nouveauPersonnage('Espion', 'pnj', 'dnd5e', {});
    espion.mj = { cache: true };
    c.personnages.push(p, espion);
    const carte = nouvelleCarte('Orden', 'pays');
    carte.images = { joueurs: 'fichier-j', mj: { image: 'fichier-m' } };
    carte.reperes.push({ id: 'r1', nom: 'Tour', x: 1, y: 2, sorte: 'lieu', mj: { desc: 'piège' } });
    c.cartes.push(carte);
    c.fichiers.push(
      { id: 'fichier-j', nom: 'j.png', mime: 'image/png', octets: 1 },
      { id: 'fichier-m', nom: 'm.png', mime: 'image/png', octets: 1 },
    );

    const v = vueJoueurs(c);
    const texte = JSON.stringify(v);
    expect(texte).not.toContain('"mj"');
    expect(texte).not.toContain('domination');
    expect(texte).not.toContain('Espion');
    expect(v.personnages).toHaveLength(1);
    expect(v.fichiers.map((f) => f.id)).toEqual(['fichier-j']);
    // l'original n'est pas modifié
    expect(c.personnages[0].mj).toEqual({ motivation: 'domination' });
    expect(c.fichiers).toHaveLength(2);
  });
});
