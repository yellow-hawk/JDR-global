// Disposition d'un arbre de talents en étoile (pur, testé) : le tronc au centre, chaque branche dans son secteur,
// un anneau par rang ; un talent se place dans l'axe de ses prérequis (les jonctions entre deux branches voisines
// tombent entre elles), les frères s'écartent et un anneau n'a jamais deux talents l'un sur l'autre.
import type { ArbreTalents, NoeudTalent } from '../../../noyau/talents';

export const ANNEAU = 120, RAYON_NOEUD = 26;

export interface PlacementTalent { noeud: NoeudTalent; branche: string; couleur: string; x: number; y: number; angle: number }
export interface LienTalent { de: string; vers: string; ou: boolean }
export interface DispositionTalents { noeuds: PlacementTalent[]; liens: LienTalent[]; branches: { nom: string; couleur: string; x: number; y: number }[]; rayon: number }

const TOUR = Math.PI * 2;
const moyenneAngles = (a: number[]) => Math.atan2(a.reduce((s, x) => s + Math.sin(x), 0), a.reduce((s, x) => s + Math.cos(x), 0));
const ecart = (a: number, b: number) => { const d = ((b - a) % TOUR + TOUR * 1.5) % TOUR - Math.PI; return d; };

export function disposerTalents(a: ArbreTalents): DispositionTalents {
  const tous = a.branches.flatMap((b) => b.noeuds.map((n) => ({ n, b })));
  const parId = new Map(tous.map((x) => [x.n.id, x]));
  const prerequis = (n: NoeudTalent) => [...n.requis, ...(n.requisUn ?? [])].filter((r) => parId.has(r));
  const racines = tous.filter((x) => !prerequis(x.n).length);
  // Rang = distance au tronc (recalculé : l'arbre peut avoir été modifié à la main).
  const rang = new Map<string, number>();
  const rangDe = (id: string, pile = new Set<string>()): number => {
    if (rang.has(id)) return rang.get(id)!;
    if (pile.has(id)) return 1;
    pile.add(id);
    const n = parId.get(id)!.n, req = n.requis.filter((r) => parId.has(r)), un = (n.requisUn ?? []).filter((r) => parId.has(r));
    const v = 1 + Math.max(0, ...req.map((r) => rangDe(r, pile)), ...(un.length ? [Math.min(...un.map((r) => rangDe(r, pile)))] : []));
    rang.set(id, v);
    return v;
  };
  tous.forEach((x) => rangDe(x.n.id));

  // Secteurs : les branches qui ont des talents hors du tronc, dans l'ordre des données.
  const idsRacines = new Set(racines.map((x) => x.n.id));
  const secteurs = a.branches.filter((b) => b.noeuds.some((n) => !idsRacines.has(n.id)));
  const angleBranche = new Map(secteurs.map((b, i) => [b.id, -Math.PI / 2 + (TOUR * i) / Math.max(1, secteurs.length)]));
  const largeurSecteur = TOUR / Math.max(1, secteurs.length);

  const angle = new Map<string, number>();
  const ordre = [...tous].sort((x, y) => rang.get(x.n.id)! - rang.get(y.n.id)!);
  racines.forEach((x, i) => angle.set(x.n.id, racines.length > 1 ? (TOUR * i) / racines.length : 0));
  // Angle voulu : l'axe de la branche pour un enfant du tronc, sinon la moyenne des prérequis.
  const voulu = (x: { n: NoeudTalent; b: { id: string } }) => {
    const ps = prerequis(x.n).filter((p) => !idsRacines.has(p));
    return ps.length ? moyenneAngles(ps.map((p) => angle.get(p) ?? 0)) : angleBranche.get(x.b.id) ?? 0;
  };
  for (const r of [...new Set(ordre.map((x) => rang.get(x.n.id)!))]) {
    if (r === 1 && racines.length) continue;
    const anneau = ordre.filter((x) => rang.get(x.n.id) === r && !idsRacines.has(x.n.id));
    // Frères (même angle voulu) : écartés autour de l'axe, dans l'ordre des données.
    const groupes = new Map<string, typeof anneau>();
    for (const x of anneau) { const k = voulu(x).toFixed(3); groupes.set(k, [...(groupes.get(k) ?? []), x]); }
    const rayon = (r - 1) * ANNEAU;
    const pas = Math.min(largeurSecteur * 0.45, (RAYON_NOEUD * 3.2) / rayon);
    for (const [k, l] of groupes) l.forEach((x, i) => angle.set(x.n.id, Number(k) + (i - (l.length - 1) / 2) * pas));
    // Anneau : écart minimal entre voisins, par petites poussées symétriques.
    const min = (RAYON_NOEUD * 2.6) / rayon;
    for (let tour = 0; tour < 60; tour++) {
      const tri = [...anneau].sort((p, q) => angle.get(p.n.id)! - angle.get(q.n.id)!);
      let bouge = false;
      for (let i = 0; i < tri.length && tri.length > 1; i++) {
        const p = tri[i].n.id, q = tri[(i + 1) % tri.length].n.id;
        const d = ecart(angle.get(p)!, angle.get(q)!);
        if (d >= 0 && d < min) { const m = (min - d) / 2 + 1e-4; angle.set(p, angle.get(p)! - m); angle.set(q, angle.get(q)! + m); bouge = true; }
      }
      if (!bouge) break;
    }
  }

  const noeuds: PlacementTalent[] = tous.map(({ n, b }) => {
    const r = idsRacines.has(n.id) ? (racines.length > 1 ? ANNEAU * 0.45 : 0) : (rang.get(n.id)! - 1) * ANNEAU;
    const t = angle.get(n.id) ?? 0;
    return { noeud: n, branche: b.id, couleur: b.couleur ?? '#8a6a4a', x: Math.cos(t) * r, y: Math.sin(t) * r, angle: t };
  });
  const liens: LienTalent[] = tous.flatMap(({ n }) => [
    ...n.requis.filter((r) => parId.has(r)).map((r) => ({ de: r, vers: n.id, ou: false })),
    ...(n.requisUn ?? []).filter((r) => parId.has(r)).map((r) => ({ de: r, vers: n.id, ou: true })),
  ]);
  const rayon = Math.max(ANNEAU, ...noeuds.map((p) => Math.hypot(p.x, p.y))) + RAYON_NOEUD;
  const branches = secteurs.map((b) => {
    const t = angleBranche.get(b.id)!;
    return { nom: b.nom, couleur: b.couleur ?? '#8a6a4a', x: Math.cos(t) * (rayon + 40), y: Math.sin(t) * (rayon + 40) };
  });
  return { noeuds, liens, branches, rayon: rayon + 70 };
}
