import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, nouvelleCarte } from '../contrat';
import {
  ajouterFichier, construireArchive, fichiersStockes, lireArchive, lireCampagne, lireFichier,
  listerCampagnes, sauverCampagne, supprimerCampagne,
} from './index';

describe('IndexedDB', () => {
  it('sauve, liste, relit et supprime une campagne et ses fichiers', async () => {
    const c = nouvelleCampagne('Orden');
    const f = await ajouterFichier(c.campagne.id, new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }), 'a.png');
    c.fichiers.push(f);
    await sauverCampagne(c);
    expect((await listerCampagnes()).map((x) => x.nom)).toContain('Orden');
    const relue = await lireCampagne(c.campagne.id);
    expect(relue?.campagne.fichiers[0].id).toBe(f.id);
    expect((await lireFichier(c.campagne.id, f.id))?.size).toBe(3);
    expect(await fichiersStockes(c.campagne.id)).toEqual([f.id]);
    await supprimerCampagne(c.campagne.id);
    expect(await lireCampagne(c.campagne.id)).toBeNull();
    expect(await fichiersStockes(c.campagne.id)).toEqual([]);
  });
});

describe('archive', () => {
  const preparer = () => {
    const c = nouvelleCampagne('Orden');
    const carte = nouvelleCarte('Royaume', 'pays');
    carte.images = { joueurs: 'fichier-j', mj: { image: 'fichier-m' } };
    c.cartes.push(carte);
    c.fichiers.push(
      { id: 'fichier-j', nom: 'j.png', mime: 'image/png', octets: 2 },
      { id: 'fichier-m', nom: 'm.png', mime: 'image/png', octets: 2 },
    );
    const contenus: Record<string, Uint8Array> = { 'fichier-j': new Uint8Array([1, 1]), 'fichier-m': new Uint8Array([2, 2]) };
    return { c, lire: async (id: string) => contenus[id] };
  };

  it('aller-retour complet (MJ)', async () => {
    const { c, lire } = preparer();
    const { octets, manquants } = await construireArchive(c, lire);
    expect(manquants).toEqual([]);
    const r = lireArchive(octets);
    expect(r.alertes).toEqual([]);
    expect(r.campagne.cartes[0].images.mj?.image).toBe('fichier-m');
    expect([...r.fichiers.keys()].sort()).toEqual(['fichier-j', 'fichier-m']);
  });

  it('version joueurs sans la carte MJ', async () => {
    const { c, lire } = preparer();
    const r = lireArchive((await construireArchive(c, lire, { joueurs: true })).octets);
    expect(r.campagne.cartes[0].images.mj).toBeUndefined();
    expect([...r.fichiers.keys()]).toEqual(['fichier-j']);
  });

  it('accepte aussi un campagne.json seul', () => {
    const json = new TextEncoder().encode(JSON.stringify(nouvelleCampagne('Seul')));
    expect(lireArchive(json).campagne.campagne.nom).toBe('Seul');
  });
});

describe('instantanés automatiques', () => {
  it('garde les plus récents et un par jour', async () => {
    const { aGarder } = await import('./index');
    const l = [
      ...Array.from({ length: 5 }, (_, i) => ({ id: `r${i}`, quand: `2026-10-06T10:0${i}:00.000Z` })),
      { id: 'j1a', quand: '2026-10-01T08:00:00.000Z' }, { id: 'j1b', quand: '2026-10-01T09:00:00.000Z' },
      { id: 'vieux', quand: '2025-01-01T08:00:00.000Z' },
    ];
    const g = aGarder(l, new Date('2026-10-06T12:00:00Z'), 3, 30);
    expect([...g].sort()).toEqual(['j1a', 'r0', 'r2', 'r3', 'r4'].sort());
  });
  it('prend, liste et relit un instantané', async () => {
    const { faireInstantane, listerInstantanes, lireInstantane } = await import('./index');
    const c = nouvelleCampagne('Sauvée');
    const i = await faireInstantane(c, 'test');
    const liste = await listerInstantanes(c.campagne.id);
    expect(liste[0]).toMatchObject({ raison: 'test', nom: 'Sauvée' });
    expect((await lireInstantane(i.id))?.campagne.campagne.nom).toBe('Sauvée');
    await supprimerCampagne(c.campagne.id);
    expect(await listerInstantanes(c.campagne.id)).toEqual([]);
  });
});
