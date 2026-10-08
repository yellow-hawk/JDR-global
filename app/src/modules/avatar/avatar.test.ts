import { describe, expect, it } from 'vitest';
import { apparenceAuto } from './auto';
import { sanitizePreset } from './createur/store/presets.js';
import especes from './createur/data/species.json';
import * as THREE from 'three';
import { lirePlages, masquerCorps } from './createur/three/masqueCorps.js';

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

describe('tenue et peuple', () => {
  type P = { data: { assets: Record<string, string | null>; morphs: { values: Record<string, number> }; colors: Record<string, string> } };
  const pnj = (role: string, peupleNom = '', feminin = false) => apparenceAuto({ nom: 'Aldric', role, peupleNom, feminin }) as unknown as P;

  it('habille selon le rôle', () => {
    expect(pnj('capitaine de la garde').data.assets.armure).toBe('cotte');
    expect(pnj('chevalier errant').data.assets.armure).toBe('plastron');
    expect(pnj('chevalier errant').data.assets.epaules).toBe('epaulieres');
    expect(pnj('voleur').data.assets.mains).toBe('gants');
    expect(pnj('mage de la tour').data.assets.haut).toBe('robe');
    expect(pnj('forgeron').data.assets.armure).toBeNull();
    expect(pnj('aubergiste').data.assets.pieds).toBe('bottes');
  });

  it('chaque tenue tirée existe dans species.json', () => {
    const options = new Map(humain.assetSlots.map((s: { id: string; options: { id: string | null }[] }) => [s.id, new Set(s.options.map((o) => o.id))]));
    for (const role of ['garde', 'chevalier', 'mage', 'prêtre', 'noble', 'voleur', 'chasseur', 'forgeron', 'inconnu'])
      for (const feminin of [false, true])
        for (const [slot, id] of Object.entries(pnj(role, '', feminin).data.assets)) expect(options.get(slot)?.has(id), `${role} ${slot}=${id}`).toBe(true);
  });

  it('traits du peuple : oreilles pointues des elfes, petite stature des nains', () => {
    expect(pnj('marchand', 'Elfes des brumes').data.morphs.values.ear_pointed).toBe(1);
    expect(pnj('marchand', 'Nains du Roc').data.morphs.values.stature).toBeLessThan(-0.5);
    expect(pnj('marchand', 'Humains').data.morphs.values.ear_pointed).toBeUndefined();
    expect(pnj('forgeron', 'Nains du Roc').data.assets.barbe).toBe('fournie');
    expect(pnj('forgeron', 'Nains du Roc', true).data.assets.barbe).toBeNull();
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

describe('peau cachée sous les vêtements', () => {
  it('lit les plages compactes', () => {
    expect([...lirePlages('3-5,9')]).toEqual([3, 4, 5, 9]);
    expect(lirePlages('').size).toBe(0);
  });

  it('retire les triangles touchant un sommet caché, puis les rend', () => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Array(12).fill(0), 3));
    geo.setAttribute('_id', new THREE.Float32BufferAttribute([10, 11, 12, 13], 1));
    geo.setIndex([0, 1, 2, 1, 3, 2]);
    const racine = new THREE.Group();
    racine.add(new THREE.Mesh(geo));
    masquerCorps(racine, new Set([13]));
    expect(geo.drawRange.count).toBe(3);
    expect([...geo.index!.array.slice(0, 3)]).toEqual([0, 1, 2]);
    masquerCorps(racine, new Set());
    expect(geo.drawRange.count).toBe(6);
  });
});
