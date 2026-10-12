import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, nouveauPersonnage, type Civilisation } from '../../noyau/contrat';
import { regles } from '../../noyau/regles';
import { disposer, generations } from './disposition';
import { dynastieDepuisCivilisation, familleDepuisPersonnage, separerTitre } from './generateur';
import { ajouterFamille, ajouterProche, etendre, promouvoir, supprimerMembre } from './logique';
import { harmoniserDates, incoherences, vieDepuis } from './dates';
import { HAUTEUR, LARGEUR } from './disposition';
import type { Famille } from '../../noyau/contrat';

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

  it('dates : aucune incohérence dans les arbres générés, morts posées selon l’âge', () => {
    for (const an of [120, 640, 1480, 3000]) {
      for (const g of ['a', 'b', 'c', 'd', 'e']) {
        const d = dynastieDepuisCivilisation({ ...civ, anActuel: an }, { graine: g, an });
        for (const m of d.membres) expect(incoherences(d, m, an), `${an} ${g} ${m.nom}`).toEqual([]);
        expect(harmoniserDates(d, an).corrections).toBe(0);
        // Les anciens sont morts : personne n'est vivant au-delà de la longévité.
        for (const m of d.membres) if (m.mort === null) expect(an - (m.naissance ?? an)).toBeLessThanOrEqual(80);
        const regnants = d.membres.filter((m) => m.regne).sort((a, b) => a.regne![0] - b.regne![0]);
        expect(regnants[regnants.length - 1].regne![1]).toBe(an);
        expect(regnants[regnants.length - 1].mort).toBeNull();
      }
      const p = { ...nouveauPersonnage('Vorn Daskel', 'pnj', 'dnd5e', {}), fiche: { identite: { age: '52 ans' } } };
      const f = familleDepuisPersonnage(p, civ, { an });
      expect(f.membres.find((m) => m.persoId === p.id)!.naissance).toBe(an - 52);
      for (const m of f.membres) expect(incoherences(f, m, an)).toEqual([]);
      expect(f.membres.every((m) => (m.naissance ?? 0) <= an)).toBe(true);
    }
    // Elfes : longévité respectée (pas de mort à 80 ans).
    const elfe = familleDepuisPersonnage({ ...nouveauPersonnage('Ilyan', 'pj', 'dnd5e', {}), fiche: { identite: { age: '140' } } }, civ, { an: 900, vie: [100, 750] });
    expect(elfe.membres.filter((m) => m.mort !== null).every((m) => (m.mort ?? 0) - (m.naissance ?? 0) > 300)).toBe(true);
  });

  it('dates : un arbre incohérent est corrigé', () => {
    const f: Famille = { id: 'f', nom: 'F', sorte: 'famille', racine: 'a', membres: [
      { id: 'a', nom: 'Aïeul', sexe: 'm', parents: [], conjoints: [], naissance: 800, mort: null },
      { id: 'b', nom: 'Fils', sexe: 'm', parents: ['a'], conjoints: [], naissance: 805, mort: 1200 },
      { id: 'c', nom: 'Petit', sexe: 'f', parents: ['b'], conjoints: [], naissance: null, mort: null },
      { id: 'd', nom: 'Futur', sexe: 'f', parents: ['b'], conjoints: [], naissance: 1300, mort: null },
    ] };
    const r = harmoniserDates(f, 1000, vieDepuis());
    expect(r.corrections).toBeGreaterThan(0);
    for (const m of r.famille.membres) expect(incoherences(r.famille, m, 1000), m.nom).toEqual([]);
    expect(r.famille.membres.find((m) => m.id === 'a')!.mort).not.toBeNull();
    expect(harmoniserDates(r.famille, 1000).corrections).toBe(0);
  });

  it('disposition : aucune carte ne se chevauche, même avec un usurpateur', () => {
    for (const g of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const d = dynastieDepuisCivilisation({ ...civ, anActuel: 700 }, { graine: g, an: 700 });
      const pos = disposer(d).positions;
      const l = Object.values(pos);
      for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
        const chevauche = Math.abs(l[i].x - l[j].x) < LARGEUR && Math.abs(l[i].y - l[j].y) < HAUTEUR;
        expect(chevauche, `graine ${g}`).toBe(false);
      }
    }
  });
});
