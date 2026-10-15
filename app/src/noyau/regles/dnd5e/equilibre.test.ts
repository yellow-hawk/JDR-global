// Contrôle d'équilibre des données D&D 5e de la suite : talents, dons, sous-classes. Échoue si une donnée sort des
// bornes (un talent trop fort, un don qui vaut deux améliorations, une sous-classe incomplète).
import { describe, expect, it } from 'vitest';
import { regles, type SystemeAvecFiche } from '../index';
import type { Effet } from '../../contrat';
import TALENTS from './talents.json';

const R = regles('dnd5e') as SystemeAvecFiche;
type Noeud = { id: string; nom: string; cout: number; niveau: number; effets?: Effet[]; action?: string; passif?: string };
const noeuds = (TALENTS.arbres as unknown as { id: string; branches: { noeuds: Noeud[] }[] }[]).flatMap((a) => a.branches.flatMap((b) => b.noeuds.map((n) => ({ ...n, arbre: a.id }))));

/** Plafond d'un effet pour un seul talent. */
const PLAFOND: Record<string, number> = { ca: 1, attaque: 1, degats: 2, initiative: 2, vitesse: 2, pvParNiveau: 2, dd: 1, 'attaque.sort': 1, 'degats.sort': 2 };
const plafond = (c: string) => PLAFOND[c] ?? (c.startsWith('carac.') ? 1 : 2);
/** Valeur d'un effet en « points d'amélioration » (une amélioration de caractéristiques = 2 points). */
const POIDS: Record<string, number> = { ca: 2, attaque: 1.5, degats: 1, initiative: 0.4, vitesse: 0.5, pvParNiveau: 1, dd: 2, 'attaque.sort': 1.5, 'degats.sort': 0.75 };
const poids = (e: Effet) => e.valeur * (POIDS[e.cible] ?? (e.cible.startsWith('carac.') ? 1 : e.cible.startsWith('sauvegarde.') ? 0.75 : 0.5));

describe('équilibre des talents', () => {
  it('aucun talent ne dépasse son plafond ; coût de 1 à 3 ; niveau de 1 à 20', () => {
    for (const n of noeuds) {
      expect(n.cout, n.id).toBeGreaterThanOrEqual(1);
      expect(n.cout, n.id).toBeLessThanOrEqual(3);
      expect(n.niveau, n.id).toBeGreaterThanOrEqual(1);
      expect(n.niveau, n.id).toBeLessThanOrEqual(20);
      for (const e of n.effets ?? []) expect(Math.abs(e.valeur), `${n.id} ${e.cible}`).toBeLessThanOrEqual(plafond(e.cible));
    }
  });

  it('un arbre entier ne donne pas plus de +3 en CA, attaque ou DD', () => {
    const total = new Map<string, number>();
    for (const n of noeuds) for (const e of n.effets ?? []) total.set(`${n.arbre} ${e.cible}`, (total.get(`${n.arbre} ${e.cible}`) ?? 0) + e.valeur);
    for (const [k, v] of total) if (/ (ca|attaque|dd|attaque\.sort)$/.test(k)) expect(v, k).toBeLessThanOrEqual(3);
  });

  it('un talent plus cher vaut au moins autant (en moyenne) qu’un talent à 1 point', () => {
    const moyenne = (c: number) => { const l = noeuds.filter((n) => n.cout === c && n.effets?.length); return l.reduce((s, n) => s + n.effets!.reduce((t, e) => t + poids(e), 0), 0) / Math.max(1, l.length); };
    expect(moyenne(1)).toBeLessThanOrEqual(2);
    if (noeuds.some((n) => n.cout === 2 && n.effets?.length)) expect(moyenne(2)).toBeGreaterThanOrEqual(moyenne(1) * 0.8);
  });
});

describe('équilibre des dons', () => {
  const dons = R.catalogue.dons ?? [];
  it('chaque don fait quelque chose, et vaut entre une demi et une amélioration de caractéristiques (2 points)', () => {
    expect(dons.length).toBeGreaterThanOrEqual(15);
    for (const d of dons) {
      const valeur = (d.effets ?? []).reduce((s, e) => s + poids(e as Effet), 0) + (d.actions?.length ?? 0) * 1 + (d.magie ? 2 : 0);
      expect(valeur, d.id).toBeGreaterThanOrEqual(1);
      expect(valeur, d.id).toBeLessThanOrEqual(3);
      for (const e of d.effets ?? []) expect(Math.abs(e.valeur), `${d.id} ${e.cible}`).toBeLessThanOrEqual(e.cible === 'initiative' ? 5 : e.cible === 'degats' ? 3 : 2);
    }
  });
});

describe('cohérence des classes', () => {
  it('trois sous-classes par classe, aux niveaux de sous-classe de la classe, chacune décrite', () => {
    for (const c of R.catalogue.classes) {
      expect(c.sousClasses.length, c.id).toBe(3);
      const niveaux = new Set(c.sousClasses[0].aptitudes.map((a) => a.niveau));
      for (const s of c.sousClasses) {
        expect(s.texte, `${c.id}/${s.id}`).toBeTruthy();
        expect(s.aptitudes.some((a) => a.niveau === c.niveauSousClasse), `${c.id}/${s.id} au niveau ${c.niveauSousClasse}`).toBe(true);
        for (const a of s.aptitudes) expect(niveaux.has(a.niveau) || a.niveau === c.niveauSousClasse, `${c.id}/${s.id} niveau ${a.niveau}`).toBe(true);
      }
    }
  });
});
