import { describe, expect, it } from 'vitest';
import type { Fichier } from '../../../noyau/contrat';
import { nouvelleCampagne, nouveauPersonnage, nouvelUnivers } from '../../../noyau/contrat';
import { regles } from '../../../noyau/regles';
import { apparenceAuto } from '../../avatar';
import { adversairesPour, carteBataille, integrerBataille, lieuxDeBataille, type QueteAtlasDetail } from './batailles';
import { carteAtlas, integrerCarte, relierCartes, type EntreeCarteAtlas } from './cartes';

const R = regles('dnd5e');
const f = (id: string): Fichier => ({ id, nom: id, mime: 'image/jpeg', octets: 1 });
const PLAN: EntreeCarteAtlas[] = [
  { cle: 'monde', nom: 'Monde', type: 'monde', reperes: [{ nom: 'Pays A', x: 10, y: 20, sorte: 'ville', vers: 'pays|0' }] },
  { cle: 'pays|0', nom: 'Pays A', type: 'region', parent: { cle: 'monde', zone: [0, 0, 100, 50] }, reperes: [{ nom: 'Cité', x: 5, y: 5, sorte: 'ville', vers: 'ville|0|0' }] },
  { cle: 'ville|0|0', nom: 'Cité', type: 'ville', parent: { cle: 'pays|0', zone: [1, 1, 9, 9] }, reperes: null },
];

function campagneAvecCartes() {
  let c = nouvelleCampagne('T');
  const u = nouvelUnivers('Monde', 'genere');
  c = { ...c, univers: [u] };
  for (const e of PLAN) c = integrerCarte(c, u.id, e, f(`img-${e.cle}`), { l: 100, h: 50 }).campagne;
  return { c: relierCartes(c, u.id, PLAN, { 'ville|0|0': [{ nom: 'Taverne', x: 50, y: 60, sorte: 'lieu' }] }), u: u.id };
}

describe('installation : cartes de l’Atlas', () => {
  it('crée, emboîte et relie par repères', () => {
    const { c, u } = campagneAvecCartes();
    const monde = carteAtlas(c, u, 'monde')!, pays = carteAtlas(c, u, 'pays|0')!, ville = carteAtlas(c, u, 'ville|0|0')!;
    expect(c.cartes).toHaveLength(3);
    expect(pays.parent?.carte.id).toBe(monde.id);
    expect(ville.parent).toEqual({ carte: { type: 'carte', id: pays.id }, zone: [1, 1, 8, 8] });
    expect(monde.reperes[0].lien).toEqual({ type: 'carte', id: pays.id });
    expect(ville.reperes.map((r) => r.nom)).toEqual(['Taverne']);
  });

  it('relancer ne crée pas de doublon et garde les repères posés à la main', () => {
    let { c, u } = campagneAvecCartes();
    const monde = carteAtlas(c, u, 'monde')!;
    c = { ...c, cartes: c.cartes.map((k) => (k.id === monde.id ? { ...k, reperes: [...k.reperes, { id: 'r1', nom: 'Mon repère', x: 1, y: 1, sorte: 'note' }] } : k)) };
    const r = integrerCarte(c, u, PLAN[0], f('img-2'), { l: 100, h: 50 });
    expect(r.liberes).toEqual(['img-monde']);
    c = relierCartes(r.campagne, u, PLAN);
    expect(c.cartes).toHaveLength(3);
    expect(carteAtlas(c, u, 'monde')!.reperes.map((x) => x.nom).sort()).toEqual(['Mon repère', 'Pays A']);
    expect(carteAtlas(c, u, 'ville|0|0')!.reperes.map((x) => x.nom)).toEqual(['Taverne']);
  });
});

describe('installation : cartes de bataille', () => {
  const quete = {
    cle: 'q0', sorte: 'principale', titre: 'Le complot', resume: '', lieux: [], pnj: [], recompenses: [], etapes: [], mj: {}, adversaire: 'Vorn',
    lieuxDetail: [
      { nom: 'Cité', sorte: 'cité', etape: 'L’appel', ou: { cle: 'ville|0|0', x: 500, y: 500 } },
      { nom: 'Cité', sorte: 'cité', etape: 'Doublon' },
      { nom: 'Tombeau de Kar', sorte: 'lieu remarquable', danger: 'dangereux', etape: 'La nuit', ou: { cle: 'pays|0', x: 40, y: 40 } },
    ],
  } as QueteAtlasDetail;

  it('un lieu par étape, l’adversaire nommé au dernier', () => {
    const l = lieuxDeBataille([quete]);
    expect(l.map((x) => [x.lieu.nom, x.dernier])).toEqual([['Cité', false], ['Tombeau de Kar', true]]);
    let c = nouvelleCampagne('T');
    c = { ...c, personnages: [nouveauPersonnage('Vorn', 'ennemi', 'dnd5e', {})] };
    const adv = adversairesPour(c, l[1], R);
    expect(adv[0]).toMatchObject({ nom: 'Vorn', camp: 'ennemi' });
    expect(adv).toHaveLength(4);
    expect(adversairesPour(c, l[0], R).some((a) => a.nom === 'Vorn')).toBe(false);
  });

  it('carte cachée, rencontre liée à la quête, repère MJ sur le lieu ; pas de doublon', () => {
    let { c, u } = campagneAvecCartes();
    c = { ...c, quetes: [{ id: 'quete-1', titre: 'Le complot', source: { sorte: 'atlas', cle: 'q0' }, univers: { type: 'univers', id: u }, lieux: [], personnages: [] }] };
    const b = lieuxDeBataille([quete])[0];
    const args = { univ: u, idCarte: 'carte-b', b, libelle: 'taverne', theme: 'interieur', joueurs: f('j'), mj: f('m'), taille: { l: 10, h: 10 }, pxCase: 70, table: { jetons: [] } };
    c = integrerBataille(c, args);
    const k = carteBataille(c, u, b.cle)!;
    expect(k).toMatchObject({ id: 'carte-b', type: 'donjon', mj: { cache: true } });
    expect(k.parent?.carte.id).toBe(carteAtlas(c, u, 'ville|0|0')!.id);
    expect(c.rencontres[0]).toMatchObject({ carte: { type: 'carte', id: 'carte-b' }, quete: { type: 'quete', id: 'quete-1' } });
    const rep = carteAtlas(c, u, 'ville|0|0')!.reperes.find((r) => r.sorte === 'quete')!;
    expect(rep).toMatchObject({ lien: { type: 'rencontre', id: c.rencontres[0].id }, mj: { cache: true } });
    expect(c.quetes[0].lieux).toEqual([{ type: 'carte', id: 'carte-b' }]);
    expect(integrerBataille(c, { ...args, idCarte: 'autre' })).toBe(c);
  });
});

describe('apparence automatique', () => {
  it('déterministe, genre et morphologie tirés de la description', () => {
    const a = apparenceAuto({ nom: 'Vorn', apparence: 'massif, une cicatrice', feminin: false, peuple: 2 });
    expect(apparenceAuto({ nom: 'Vorn', apparence: 'massif, une cicatrice', feminin: false, peuple: 2 }).data).toEqual(a.data);
    const d = a.data as { gender: string; morphs: { values: Record<string, number> } };
    expect(d.gender).toBe('male');
    expect(d.morphs.values.chest_breadth).toBeGreaterThan(0.7);
    const f2 = apparenceAuto({ nom: 'Ilia', apparence: 'chauve', feminin: true }).data as { gender: string; assets: { hair: string | null }; morphs: { values: Record<string, number> } };
    expect(f2.gender).toBe('female');
    expect(f2.assets.hair).toBeNull();
    expect(f2.morphs.values.genre).toBeGreaterThan(0.5);
    expect(d.morphs.values.genre).toBeLessThan(-0.5);
    for (const v of Object.values(d.morphs.values)) expect(Math.abs(v)).toBeLessThanOrEqual(2);
  });
});

describe('civilisations', () => {
  it('calendrier : jour de l’année → mois et jour', async () => {
    const { calendrierDepuisAtlas } = await import('./civilisations');
    const c = calendrierDepuisAtlas({ jours: 30, mois: [{ nom: 'A', jours: 10 }, { nom: 'B', jours: 20 }], fetes: [{ nom: 'F', texte: '', jour: 0 }, { nom: 'G', texte: 'x', jour: 14 }] });
    expect(c.fetes).toEqual([{ nom: 'F', texte: '', mois: 0, jour: 1 }, { nom: 'G', texte: 'x', mois: 1, jour: 5 }]);
  });
  it('rangées dans l’univers, notes MJ gardées', async () => {
    const { integrerCivilisations } = await import('./civilisations');
    const u = nouvelUnivers('M', 'genere');
    const p = { cle: 0, nom: 'les A', villes: [], traits: [], coutumes: [], relations: [], histoire: [], noms: ['X'], calendrier: null };
    let c = { ...nouvelleCampagne('T'), univers: [u] };
    c = integrerCivilisations(c, u.id, { peuples: [p], monde: null });
    c = { ...c, univers: c.univers.map((x) => ({ ...x, civilisations: { ...x.civilisations!, peuples: x.civilisations!.peuples.map((q) => ({ ...q, mj: { notes: 'secret' } })) } })) };
    c = integrerCivilisations(c, u.id, { peuples: [{ ...p, souverain: 'Roi' }], monde: null });
    expect(c.univers[0].civilisations!.peuples[0]).toMatchObject({ souverain: 'Roi', mj: { notes: 'secret' } });
  });
});
