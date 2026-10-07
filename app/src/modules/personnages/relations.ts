// Relations entre personnages (allié, rival, dette…), rangées sur le personnage de départ. Pur, testé.
// Une relation secrète porte `mj: { cache: true }` : elle disparaît de la vue joueurs.
import type { Campagne, Personnage, RelationPersonnage } from '../../noyau/contrat';
import donnees from './relations.json';

export interface SorteRelation { id: string; libelle: string; inverse?: string; couleur: string; symetrique?: boolean }
export const RELATIONS = donnees.relations as SorteRelation[];
export const sorteRelation = (id: string): SorteRelation => RELATIONS.find((r) => r.id === id) ?? { id, libelle: id, couleur: '#888' };

const majPerso = (c: Campagne, id: string, f: (p: Personnage) => Personnage): Campagne =>
  ({ ...c, personnages: c.personnages.map((p) => (p.id === id ? f(p) : p)) });

export function ajouterRelation(c: Campagne, de: string, vers: string, sorte: string, texte = '', secret = false): Campagne {
  if (de === vers) return c;
  const r: RelationPersonnage = { vers: { type: 'personnage', id: vers }, sorte, ...(texte ? { texte } : {}), ...(secret ? { mj: { cache: true } } : {}) };
  return majPerso(c, de, (p) => ({ ...p, relations: [...(p.relations ?? []).filter((x) => !(x.vers.id === vers && x.sorte === sorte)), r] }));
}

export const retirerRelation = (c: Campagne, de: string, index: number): Campagne =>
  majPerso(c, de, (p) => ({ ...p, relations: (p.relations ?? []).filter((_, i) => i !== index) }));

export interface RelationVue { de: string; vers: string; index: number; sorte: SorteRelation; libelle: string; sortante: boolean; secret: boolean; texte?: string; autre: string }

/** Relations d'un personnage, dans les deux sens (une relation entrante est lue avec son libellé inverse). */
export function relationsDe(c: Campagne, persoId: string): RelationVue[] {
  const sortie: RelationVue[] = [];
  for (const p of c.personnages) {
    (p.relations ?? []).forEach((r, index) => {
      const s = sorteRelation(r.sorte);
      const secret = !!(r.mj as { cache?: boolean } | undefined)?.cache;
      if (p.id === persoId) sortie.push({ de: p.id, vers: r.vers.id, index, sorte: s, libelle: s.libelle, sortante: true, secret, texte: r.texte, autre: r.vers.id });
      else if (r.vers.id === persoId) sortie.push({ de: p.id, vers: r.vers.id, index, sorte: s, libelle: s.symetrique ? s.libelle : s.inverse ?? s.libelle, sortante: false, secret, texte: r.texte, autre: p.id });
    });
  }
  return sortie;
}
