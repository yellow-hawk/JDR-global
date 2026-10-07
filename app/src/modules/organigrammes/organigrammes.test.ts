import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, nouveauPersonnage, type Civilisation } from '../../noyau/contrat';
import type { NoeudArbre } from '../../noyau/graphe';
import { organigrammeCartes, organigrammeInstitutions } from './logique';

const tous = (n: NoeudArbre): NoeudArbre[] => [n, ...n.enfants.flatMap(tous)];
const civ: Civilisation = { cle: 1, nom: 'les A', regime: 'Royaume', souverain: 'le roi Kael', villes: [{ nom: 'Pheon', capitale: true }, { nom: 'Bah' }], traits: [], coutumes: [], relations: [], histoire: [], noms: ['Ari', 'Bel'] };

describe('organigrammes', () => {
  it('institutions : le PNJ dont le rôle convient occupe le poste, les autres postes sont à pourvoir', () => {
    const chancelier = { ...nouveauPersonnage('Vorn', 'pnj', 'dnd5e', {}), role: 'chancelier', peuple: { atlas: '1' } };
    const forgeron = { ...nouveauPersonnage('Bob', 'pnj', 'dnd5e', {}), role: 'forgeron', peuple: { atlas: '1' } };
    const c = { ...nouvelleCampagne('T'), personnages: [chancelier, forgeron] };
    const r = organigrammeInstitutions(c, 'u', civ);
    const noeuds = tous(r);
    expect(r.libelle).toBe('le roi Kael');
    expect(noeuds.find((x) => x.libelle === 'Vorn')!.sousTitre).toBe('Chancelier');
    expect(noeuds.some((x) => x.libelle === 'Seigneur de Pheon')).toBe(true);
    expect(noeuds.find((x) => x.libelle === 'Bob')).toBeDefined(); // dans « Autres personnages »
    expect(noeuds.filter((x) => (x.donnees as { vacant?: unknown } | undefined)?.vacant).length).toBeGreaterThan(3);
  });
  it('cartes emboîtées', () => {
    const c = nouvelleCampagne('T');
    const mk = (id: string, parent?: string) => ({ id, nom: id, type: 'lieu', source: { sorte: 'import' as const }, images: { joueurs: null }, reperes: [], creeLe: '', majLe: '', parent: parent ? { carte: { type: 'carte' as const, id: parent }, zone: [0, 0, 1, 1] as [number, number, number, number] } : null });
    const r = organigrammeCartes({ ...c, cartes: [mk('monde'), mk('pays', 'monde'), mk('ville', 'pays')] });
    expect(r.enfants[0].enfants[0].enfants[0].libelle).toBe('ville');
  });
});
