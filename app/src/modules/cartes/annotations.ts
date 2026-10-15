// Annotations des joueurs sur une carte montrée (pur, testé) : repères nommés et traits dessinés, en pixels de
// l'image. Rangées dans `modules.cartes.annotations[carteId]` ; le MJ permet ou non d'annoter chaque carte et efface
// ce qu'il veut. Un joueur n'efface que les siennes.
import type { Campagne } from '../../noyau/contrat';
import { nouvelId } from '../../noyau/contrat';

export interface Annotation {
  id: string;
  sorte: 'repere' | 'trait';
  /** Repère : position ; trait : premier point. */
  x: number; y: number;
  texte?: string;
  points?: [number, number][];
  couleur: string;
  auteur: string;
  /** Personnage du joueur (null : tablette de la table). */
  persoId: string | null;
}
type Mod = { annotations?: Record<string, Annotation[]>; annoter?: Record<string, boolean> };
const mod = (c: Campagne): Mod => (c.modules?.cartes ?? {}) as Mod;
const avecMod = (c: Campagne, f: (m: Mod) => Mod): Campagne => ({ ...c, modules: { ...c.modules, cartes: { ...c.modules?.cartes, ...f(mod(c)) } } });

export const COULEURS_ANNOTATION = ['#e0b040', '#d9484a', '#4a90d9', '#45a84a', '#9b59b6', '#f0f0f0'];
export const annotationsDe = (c: Campagne, carteId: string): Annotation[] => mod(c).annotations?.[carteId] ?? [];
export const annotationPermise = (c: Campagne, carteId: string): boolean => mod(c).annoter?.[carteId] ?? true;
export const avecAnnotationPermise = (c: Campagne, carteId: string, oui: boolean): Campagne =>
  avecMod(c, (m) => ({ annoter: { ...(m.annoter ?? {}), [carteId]: oui } }));
const avecListe = (c: Campagne, carteId: string, l: Annotation[]): Campagne =>
  avecMod(c, (m) => ({ annotations: { ...(m.annotations ?? {}), [carteId]: l } }));

const MAX_PAR_CARTE = 300, MAX_POINTS = 400;

/** Ajoute ce que propose un écran (validé : dans l'image, texte court, trait simplifié). */
export function avecAnnotation(c: Campagne, carteId: string, brut: Record<string, unknown>, taille: { l: number; h: number }, auteur: { nom: string; persoId: string | null }): Campagne {
  if (!annotationPermise(c, carteId) || annotationsDe(c, carteId).length >= MAX_PAR_CARTE) return c;
  const dedans = (x: unknown, y: unknown): x is number => typeof x === 'number' && typeof y === 'number' && x >= 0 && y >= 0 && x <= taille.l && y <= taille.h;
  const couleur = COULEURS_ANNOTATION.includes(String(brut.couleur)) ? String(brut.couleur) : COULEURS_ANNOTATION[0];
  let a: Annotation | null = null;
  if (brut.sorte === 'repere' && dedans(brut.x, brut.y)) {
    const texte = String(brut.texte ?? '').trim().slice(0, 60);
    a = { id: nouvelId('ann'), sorte: 'repere', x: Math.round(brut.x), y: Math.round(brut.y as number), texte: texte || '?', couleur, auteur: auteur.nom, persoId: auteur.persoId };
  } else if (brut.sorte === 'trait' && Array.isArray(brut.points)) {
    const pts = (brut.points as unknown[]).filter((p): p is [number, number] => Array.isArray(p) && dedans(p[0], p[1])).map(([x, y]) => [Math.round(x), Math.round(y)] as [number, number]);
    const pas = Math.max(1, Math.ceil(pts.length / MAX_POINTS));
    const garde = pts.filter((_, i) => i % pas === 0);
    if (garde.length >= 2) a = { id: nouvelId('ann'), sorte: 'trait', x: garde[0][0], y: garde[0][1], points: garde, couleur, auteur: auteur.nom, persoId: auteur.persoId };
  }
  return a ? avecListe(c, carteId, [...annotationsDe(c, carteId), a]) : c;
}

/** Efface une annotation : `persoId` null = le MJ (tout), sinon seulement celles de ce personnage. */
export function sansAnnotation(c: Campagne, carteId: string, id: string, persoId: string | null): Campagne {
  const a = annotationsDe(c, carteId).find((x) => x.id === id);
  if (!a || (persoId !== null && a.persoId !== persoId)) return c;
  return avecListe(c, carteId, annotationsDe(c, carteId).filter((x) => x.id !== id));
}
export const sansAnnotations = (c: Campagne, carteId: string): Campagne => avecListe(c, carteId, []);

/** Chemin SVG d'un trait. */
export const cheminTrait = (pts: [number, number][]): string => `M${pts.map(([x, y]) => `${x} ${y}`).join(' L')}`;
