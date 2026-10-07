// Cartes de l'Atlas → module Cartes : création (ou mise à jour) par clé, emboîtement et repères reliés. Pur, testé.
import type { Campagne, Carte, Fichier, Repere } from '../../../noyau/contrat';
import { nouvelId, nouvelleCarte } from '../../../noyau/contrat';

/** Entrée du plan renvoyé par l'Atlas (atlas:cartes-plan). Coordonnées en pixels de l'image. */
export interface EntreeCarteAtlas {
  cle: string;
  nom: string;
  type: string;
  parent?: { cle: string; zone: [number, number, number, number] } | null;
  reperes: RepereAtlas[] | null;
  metresParPixel?: number;
  projection?: Carte['projection'];
  mj?: boolean;
}
export interface RepereAtlas { nom: string; x: number; y: number; sorte: string; vers?: string | null; desc?: string }

/** Rectangle de l'Atlas [x0, y0, x1, y1] → zone du format [x, y, largeur, hauteur]. */
const versZone = ([x0, y0, x1, y1]: [number, number, number, number]): [number, number, number, number] =>
  [Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0)];

const deLUnivers = (k: Carte, univ: string) => k.univers?.id === univ;
export const carteAtlas = (c: Campagne, univ: string, cle: string): Carte | undefined =>
  c.cartes.find((k) => k.source.sorte === 'atlas' && k.source.cle === cle && deLUnivers(k, univ));

/** Ajoute ou remplace l'image d'une carte de l'Atlas. Renvoie aussi les fichiers devenus inutiles. */
export function integrerCarte(
  c: Campagne, univ: string, e: EntreeCarteAtlas, joueurs: Fichier, taille: { l: number; h: number }, mj?: Fichier | null,
): { campagne: Campagne; id: string; liberes: string[] } {
  const exist = carteAtlas(c, univ, e.cle);
  const base: Carte = exist ?? { ...nouvelleCarte(e.nom, e.type), univers: { type: 'univers', id: univ }, source: { sorte: 'atlas', cle: e.cle } };
  const k: Carte = {
    ...base, nom: e.nom, type: e.type, taille, images: { joueurs: joueurs.id, ...(mj ? { mj: { image: mj.id } } : {}) },
    echelle: e.metresParPixel ? { metresParPixel: e.metresParPixel } : base.echelle ?? null,
    projection: e.projection ?? base.projection ?? null,
    ...(e.mj && !mj ? { mj: { ...(base.mj ?? {}), cache: true } } : {}),
  };
  const liberes = exist ? [exist.images.joueurs, exist.images.mj?.image].filter((x): x is string => !!x) : [];
  const fichiers = [...c.fichiers.filter((f) => !liberes.includes(f.id)), joueurs, ...(mj ? [mj] : [])];
  const cartes = exist ? c.cartes.map((x) => (x.id === exist.id ? k : x)) : [...c.cartes, k];
  return { campagne: { ...c, cartes, fichiers }, id: k.id, liberes };
}

/**
 * Emboîtement (parent + zone) et repères reliés aux cartes filles. Les repères posés à la main sont gardés ;
 * ceux de l'Atlas (marqués `atlas`) sont remplacés.
 */
export function relierCartes(c: Campagne, univ: string, plan: EntreeCarteAtlas[], reperesRendus: Record<string, RepereAtlas[]> = {}): Campagne {
  const id = (cle: string) => carteAtlas(c, univ, cle)?.id;
  const cartes = c.cartes.map((k): Carte => {
    if (k.source.sorte !== 'atlas' || !deLUnivers(k, univ) || !k.source.cle) return k;
    const e = plan.find((x) => x.cle === k.source.cle);
    if (!e) return k;
    const parentId = e.parent ? id(e.parent.cle) : undefined;
    const source = e.reperes ?? reperesRendus[e.cle];
    const rep = (source ?? []).map((r): Repere => {
      const cible = r.vers ? id(r.vers) : undefined;
      return { id: nouvelId('rep'), nom: r.nom, x: Math.round(r.x), y: Math.round(r.y), sorte: r.sorte, desc: r.desc ?? '', lien: cible ? { type: 'carte', id: cible } : null, mj: { atlas: true } };
    });
    return {
      ...k,
      parent: parentId && e.parent ? { carte: { type: 'carte', id: parentId }, zone: versZone(e.parent.zone) } : k.parent ?? null,
      // Plan de ville non redessiné cette fois : ses repères de l'Atlas sont gardés tels quels.
      reperes: source ? [...k.reperes.filter((r) => !(r.mj as { atlas?: boolean } | undefined)?.atlas), ...rep] : k.reperes,
    };
  });
  return { ...c, cartes };
}
