import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, nouveauPersonnage, type Civilisation } from '../../noyau/contrat';
import { regles } from '../../noyau/regles';
import { disposer, generations } from './disposition';
import { dynastieDepuisCivilisation, familleDepuisPersonnage, separerTitre } from './generateur';
import { ajouterFamille, ajouterProche, etendre, promouvoir, supprimerMembre } from './logique';

const civ: Civilisation = {
  cle: 2, nom: 'les Glófar', villes: [], traits: [], coutumes: [], relations: [], histoire: [], anActuel: 640,
  titres: ['le roi', 'la reine'], souverain: 'la reine Ilsa II', fondateur: 'Harn', noms: ['Ari', 'Bel', 'Cor', 'Dun', 'Eda', 'Fen', 'Gil', 'Hal', 'Ivo', 'Jor', 'Kel', 'Lun'],
};

describe('généalogie', () => {
  it('famille d’un personnage : parents, grands-parents, liens cohérents, déterministe', () => {
    const p = { ...nouveauPersonnage('Vorn Daskel', 'pnj', 'dnd5e', {}), notes: 'âgé, un œil voilé' };
    const f = familleDepuisPersonnage(p, civ);
    const ego = f.membres.find((m) => m.persoId === p.id)!;
    expect(ego.parents).toHaveLength(2);
    const pere = f.membres.find((m) => m.id === ego.parents[0])!;
    expect(pere.parents).toHaveLength(2);
    expect(pere.nom.endsWith('Daskel')).toBe(true);
    expect((ego.naissance ?? 0) - (pere.naissance ?? 0)).toBeGreaterThan(18);
    const ids = new Set(f.membres.map((m) => m.id));
    for (const m of f.membres) for (const r of [...m.parents, ...m.conjoints]) expect(ids.has(r)).toBe(true);
    expect(familleDepuisPersonnage(p, civ).membres.map((m) => m.nom)).toEqual(f.membres.map((m) => m.nom));
  });

  it('dynastie : du fondateur au souverain actuel, règnes continus', () => {
    expect(separerTitre('la reine Ilsa II', civ.titres)).toEqual({ titre: 'la reine', nom: 'Ilsa II', sexe: 'f' });
    const d = dynastieDepuisCivilisation(civ);
    const regnants = d.membres.filter((m) => m.regne).sort((a, b) => a.regne![0] - b.regne![0]);
    expect(regnants[0].nom).toBe('Harn');
    expect(regnants[regnants.length - 1]).toMatchObject({ nom: 'Ilsa II', titre: 'la reine', sexe: 'f' });
    expect(regnants[regnants.length - 1].regne![1]).toBe(640);
    for (let i = 1; i < regnants.length; i++) expect(regnants[i].regne![0]).toBe(regnants[i - 1].regne![1]);
  });

  it('édition : ajouter, étendre, supprimer, promouvoir', () => {
    const p = nouveauPersonnage('Kel', 'pnj', 'dnd5e', {});
    let f = familleDepuisPersonnage(p, civ);
    const ego = f.membres.find((m) => m.persoId === p.id)!.id;
    const r = ajouterProche(f, ego, 'enfant', civ, 'g');
    f = r.famille;
    expect(f.membres.find((m) => m.id === r.id)!.parents[0]).toBe(ego);
    const seul = { ...f, membres: [{ id: 'a', nom: 'A', sexe: 'm' as const, parents: [], conjoints: [] }] };
    const e = etendre(seul, 'a', civ, 'x');
    expect(e.membres.find((m) => m.id === 'a')!.parents).toHaveLength(2);
    expect(e.membres.some((m) => m.parents.includes('a'))).toBe(true);
    const s = supprimerMembre(f, ego);
    for (const m of s.membres) expect([...m.parents, ...m.conjoints]).not.toContain(ego);
    let c = ajouterFamille(nouvelleCampagne('T'), f);
    const autre = f.membres.find((m) => !m.persoId)!;
    const pr = promouvoir(c, f.id, autre.id, regles('dnd5e'));
    c = pr.campagne;
    expect(c.personnages.find((x) => x.id === pr.persoId)!.nom).toBe(autre.nom);
    expect(c.familles[0].membres.find((m) => m.id === autre.id)!.persoId).toBe(pr.persoId);
  });

  it('disposition : générations et enfants sous leurs parents', () => {
    const f = dynastieDepuisCivilisation(civ);
    const g = generations(f);
    for (const m of f.membres) for (const p of m.parents) expect(g[m.id]).toBe(g[p] + 1);
    const d = disposer(f);
    const ys = new Set(f.membres.map((m) => d.positions[m.id].y));
    expect(ys.size).toBeGreaterThan(3);
    for (const [a, b] of d.couples) expect(d.positions[a].y).toBe(d.positions[b].y);
  });
});
