import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, vueJoueurs } from '../../noyau/contrat';
import { regles } from '../../noyau/regles';
import { enregistrerUnivers, importerPnj } from './logique';
import type { EtatAtlas, PnjAtlas } from './pont';

const etat: EtatAtlas = {
  entry: { name: 'Ciel de Tialia', params: { seed: 'tialia' } },
  monde: { nom: 'Mequa', peuples: [] },
};
const pnj = (nom: string, antagoniste = false): PnjAtlas => ({
  nom, role: 'marchande', peuple: 2, peupleNom: 'les Qaarar', apparence: 'grande', humeur: 'méfiante',
  citation: '« Rien n’est gratuit. »', veut: 'la relique', secret: 'elle travaille pour l’ennemi', antagoniste,
});

describe('monde', () => {
  it('enregistre puis met à jour le même univers', () => {
    const r = enregistrerUnivers(nouvelleCampagne('T'), etat);
    expect(r.campagne.univers[0].nom).toBe('Mequa (Ciel de Tialia)');
    const r2 = enregistrerUnivers(r.campagne, { ...etat, entry: { ...etat.entry, params: { seed: 'x' } } }, r.id);
    expect(r2.campagne.univers).toHaveLength(1);
    expect((r2.campagne.univers[0].atlas as { params: { seed: string } }).params.seed).toBe('x');
  });

  it('importe les PNJ sans doublon, secrets en MJ, antagoniste caché', () => {
    const R = regles('dnd5e');
    let r = importerPnj(nouvelleCampagne('T'), [pnj('Ysa'), pnj('Kor', true)], R);
    expect(r.ajoutes).toBe(2);
    r = importerPnj(r.campagne, [pnj('Ysa')], R);
    expect(r.ajoutes).toBe(0);
    const v = vueJoueurs(r.campagne);
    expect(v.personnages.map((p) => p.nom)).toEqual(['Ysa']);
    expect(JSON.stringify(v)).not.toContain('relique');
  });
});
