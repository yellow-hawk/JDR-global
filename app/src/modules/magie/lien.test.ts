import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, nouveauPersonnage } from '../../noyau/contrat';
import { GRIMOIRE_DE_BASE } from './atelier/data/grimoire';
import { nouveauProfil } from './atelier/engine/profils';
import { fusionnerAvecBase } from './atelier/engine/storage';
import {
  appliquerProfils, appliquerSortsMj, avecExemplesRetires, exemplesRetires, profilDe, sortsMj,
} from './lien';

describe('profils ↔ personnages', () => {
  it('un PJ sans magie reçoit un profil de départ portant son id et son nom', () => {
    const p = nouveauPersonnage('Kahlan', 'pj', 'dnd5e', {});
    const pr = profilDe(p);
    expect(pr.id).toBe(p.id);
    expect(pr.nom).toBe('Kahlan');
    expect(pr.signes.length).toBe(10);
  });

  it('applique, crée et retire sans jamais supprimer de personnage', () => {
    let c = nouvelleCampagne('T');
    const richard = nouveauPersonnage('Richard', 'pj', 'dnd5e', { pv: 52 });
    c = { ...c, personnages: [richard] };
    const pr = { ...profilDe(richard), rang: 2 as const };
    const zedd = nouveauProfil('Zedd', 'Paul');
    c = appliquerProfils(c, [pr, zedd]);
    expect(c.personnages).toHaveLength(2);
    expect((c.personnages[0].magie as { rang: number }).rang).toBe(2);
    expect(c.personnages[0].combat.stats.pv).toBe(52);
    expect(c.personnages[0].magie).not.toHaveProperty('nom');
    const z = c.personnages.find((p) => p.id === zedd.id)!;
    expect(z.sorte).toBe('pj');
    expect(z.joueur).toBe('Paul');
    // retirer Zedd de l'Atelier : le personnage reste, sa magie disparaît
    c = appliquerProfils(c, [pr]);
    expect(c.personnages).toHaveLength(2);
    expect(c.personnages.find((p) => p.id === zedd.id)!.magie).toBeNull();
  });
});

describe('grimoire du MJ', () => {
  it('range tous les sorts (exemples de base compris) comme vrais sorts de la campagne', () => {
    const c0 = nouvelleCampagne('T');
    const complet = fusionnerAvecBase([], []);
    expect(complet.length).toBe(GRIMOIRE_DE_BASE.length);
    const modifie = { ...complet[0], nom: 'Renommé' };
    const nouveau = { id: 'n1', nom: 'Mien', notes: '', sceau: complet[1].sceau, cree: 1 };
    const c = appliquerSortsMj(c0, [modifie, ...complet.slice(1), nouveau]);
    expect(c.sorts).toHaveLength(GRIMOIRE_DE_BASE.length + 1);
    const relu = fusionnerAvecBase(sortsMj(c), []);
    expect(relu.length).toBe(GRIMOIRE_DE_BASE.length + 1);
    expect(relu.find((s) => s.id === modifie.id)!.nom).toBe('Renommé');
  });

  it('mémorise les exemples retirés dans la campagne', () => {
    const c = avecExemplesRetires(nouvelleCampagne('T'), ['a', 'b']);
    expect(exemplesRetires(c)).toEqual(['a', 'b']);
    expect(fusionnerAvecBase([], [GRIMOIRE_DE_BASE[0].id]).length).toBe(GRIMOIRE_DE_BASE.length - 1);
  });
});

describe('sorts réels et PNJ lanceurs', () => {
  it('intègre le grimoire de base une seule fois, sans les exemples retirés', async () => {
    const { integrerGrimoireDeBase } = await import('./lien');
    const c0 = avecExemplesRetires(nouvelleCampagne('T'), [GRIMOIRE_DE_BASE[0].id]);
    const c = integrerGrimoireDeBase(c0);
    expect(c.sorts).toHaveLength(GRIMOIRE_DE_BASE.length - 1);
    expect(integrerGrimoireDeBase(c)).toBe(c);
  });
  it('donne des sorts adaptés aux PNJ lanceurs, une seule fois', async () => {
    const { donnerSortsAuxPnj, preparerCampagne } = await import('./lien');
    const { nouveauPersonnage } = await import('../../noyau/contrat');
    let c = nouvelleCampagne('T');
    c = { ...c, personnages: [
      { ...nouveauPersonnage('Ilia', 'pnj', 'dnd5e', {}), role: 'prêtresse du temple' },
      { ...nouveauPersonnage('Bob', 'pnj', 'dnd5e', {}), role: 'forgeron' },
    ] };
    c = preparerCampagne(c);
    const g = (c.personnages[0].magie as { grimoire: { sceau: { coeur: { id: string } } }[] }).grimoire;
    expect(g.length).toBeGreaterThan(0);
    for (const s of g) expect(['lueur', 'seve']).toContain(s.sceau.coeur.id);
    expect(c.personnages[1].magie).toBeUndefined();
    const sans = { ...c, personnages: c.personnages.map((p, i) => (i === 0 ? { ...p, magie: null } : p)) };
    expect(donnerSortsAuxPnj(sans)).toBe(sans);
  });
});
