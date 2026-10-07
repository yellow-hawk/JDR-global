import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, nouvelleCarte } from '../../noyau/contrat';
import { ajouterFichier, lireArchive } from '../../noyau/stockage';
import { archiveDe, copieDe } from './echanges';

describe('archive de campagne (fichiers lus dans IndexedDB)', () => {
  const preparer = async () => {
    const c = nouvelleCampagne('Orden');
    const fj = await ajouterFichier(c.campagne.id, new Blob([new Uint8Array([1, 1])], { type: 'image/png' }), 'j.png');
    const fm = await ajouterFichier(c.campagne.id, new Blob([new Uint8Array([2, 2, 2])], { type: 'image/png' }), 'm.png');
    const carte = nouvelleCarte('Royaume', 'pays');
    carte.images = { joueurs: fj.id, mj: { image: fm.id } };
    c.cartes.push(carte);
    c.fichiers.push(fj, fm);
    return { c, fj, fm };
  };

  it('archive complète : relit les octets de chaque fichier', async () => {
    const { c, fj, fm } = await preparer();
    const { octets, manquants } = await archiveDe(c);
    expect(manquants).toEqual([]);
    const r = lireArchive(octets);
    expect(r.campagne.campagne.nom).toBe('Orden');
    expect([...(r.fichiers.get(fj.id) ?? [])]).toEqual([1, 1]);
    expect([...(r.fichiers.get(fm.id) ?? [])]).toEqual([2, 2, 2]);
  });

  it('archive joueurs : sans la carte MJ', async () => {
    const { c, fj } = await preparer();
    const r = lireArchive((await archiveDe(c, true)).octets);
    expect([...r.fichiers.keys()]).toEqual([fj.id]);
    expect(r.campagne.cartes[0].images.mj).toBeUndefined();
  });

  it('signale un fichier référencé mais absent du stockage', async () => {
    const { c } = await preparer();
    c.fichiers.push({ id: 'fantome', nom: 'x.png', mime: 'image/png', octets: 1 });
    expect((await archiveDe(c)).manquants).toEqual(['fantome']);
  });
});

describe('import à côté', () => {
  it('copieDe change l’identifiant et le nom, garde le contenu', () => {
    const c = nouvelleCampagne('Orden');
    c.cartes.push(nouvelleCarte('Royaume', 'pays'));
    const k = copieDe(c);
    expect(k.campagne.id).not.toBe(c.campagne.id);
    expect(k.campagne.nom).toBe('Orden (copie)');
    expect(k.cartes).toBe(c.cartes);
  });
});
