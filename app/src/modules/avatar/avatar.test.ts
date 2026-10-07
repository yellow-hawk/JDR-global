import { describe, expect, it } from 'vitest';
import { apparenceAuto } from './auto';
import { sanitizePreset } from './createur/store/presets.js';
import especes from './createur/data/species.json';

type Preset = { data: { morphs: { values: Record<string, number> }; assets: Record<string, string | null> } };
const humain = especes.species[0];
const morphsConnus = new Set(humain.morphTargets.map((m) => m.id));
const sansDates = (p: Record<string, unknown>) => ({ ...p, createdAt: 0, updatedAt: 0 });

describe('apparenceAuto', () => {
  const pnj = { nom: 'Zedd', apparence: 'Vieil homme grand et maigre, regard perçant', peuple: 'k3' };

  it('est déterministe (même PNJ → même visage)', () => {
    expect(sansDates(apparenceAuto(pnj))).toEqual(sansDates(apparenceAuto(pnj)));
    expect(sansDates(apparenceAuto(pnj))).not.toEqual(sansDates(apparenceAuto({ ...pnj, nom: 'Richard' })));
  });

  it('ne produit que des morphs connus de species.json, bornés à −2..2', () => {
    const { values } = (apparenceAuto(pnj) as unknown as Preset).data.morphs;
    for (const [id, v] of Object.entries(values)) {
      expect(morphsConnus.has(id), id).toBe(true);
      expect(Math.abs(v)).toBeLessThanOrEqual(2);
    }
  });

  it('applique les mots de la description', () => {
    const maigre = (apparenceAuto({ nom: 'A', apparence: 'grand et maigre' }) as unknown as Preset).data.morphs.values;
    const massif = (apparenceAuto({ nom: 'A', apparence: 'massif' }) as unknown as Preset).data.morphs.values;
    expect(maigre.belly).toBeLessThan(massif.belly);
    expect((apparenceAuto({ nom: 'B', apparence: 'chauve' }) as unknown as Preset).data.assets.hair).toBeNull();
  });

  it('se charge dans le créateur sans aucun avertissement', () => {
    for (const feminin of [false, true]) {
      const { warnings } = sanitizePreset(apparenceAuto({ ...pnj, feminin }));
      expect(warnings).toEqual([]);
    }
  });
});

describe('chargement tolérant des presets', () => {
  it('ignore un morph ou une option inconnus sans planter', () => {
    const { patch, warnings } = sanitizePreset({
      presetVersion: 1, data: { species: 'human', morphs: { values: { inconnu: 1 } }, assets: { hair: 'crete' } },
    });
    expect(warnings.length).toBe(2);
    expect((patch.morphs as Record<string, number>).inconnu).toBeUndefined();
  });
});
