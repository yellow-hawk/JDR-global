// Gestion de la souris sur la table, outil par outil. Renvoie les gestionnaires et l'état d'aperçu local.
import { useRef, useState } from 'react';
import {
  ajouterZone, attaquer, cellule, centre, deplacer, deplacerZone, lancerSort, modifierJeton, peindreBrouillard, TERRAINS, zoneDeSort, zoneDeTerrain,
} from '../moteur';
import type { Cellule, Zone } from '../moteur';
import { emettreParticules, versMonde, zoomer, PAS_ZOOM, type Camera } from '../rendu';
import { angleVers, casesDuPinceau, formeOrientable, jetonSous, zoneSous } from './interactions';
import { SONS } from './sons';
import { NOMS_FORMES, type Controleur } from './types';

type Glisse =
  | { sorte: 'pan'; sx: number; sy: number; cam: Camera }
  | { sorte: 'jeton'; id: number; depart: Cellule; ici: Cellule }
  | { sorte: 'zone'; id: number; decal: Cellule; ici: Cellule }
  | { sorte: 'pose'; origine: Cellule; angle: number }
  | { sorte: 'brouillard'; premier: boolean }
  | { sorte: 'mesure' };

export interface EtatSouris {
  survol: Cellule | null;
  glisse: Glisse | null;
  mesure: [Cellule, Cellule] | null;
  polygone: Cellule[];
  pointeur: [number, number] | null; // monde
}

const memeCase = (a: Cellule, b: Cellule) => a[0] === b[0] && a[1] === b[1];

export function useSouris(ctl: Controleur, camera: Camera, setCamera: (c: Camera) => void, mj: boolean) {
  const [s, setS] = useState<EtatSouris>({ survol: null, glisse: null, mesure: null, polygone: [], pointeur: null });
  const ref = useRef(s); ref.current = s;
  const maj = (p: Partial<EtatSouris>) => setS((x) => ({ ...x, ...p }));
  const { etat: e, ui, faire, regler, dire } = ctl;
  const actif = mj && !ctl.lectureSeule;

  const position = (ev: React.PointerEvent | React.WheelEvent | React.MouseEvent) => {
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const sx = ev.clientX - r.left, sy = ev.clientY - r.top;
    const [wx, wy] = versMonde(camera, sx, sy);
    return { sx, sy, wx, wy, c: cellule(e.grille, wx, wy) };
  };

  const peindre = (c: Cellule, premier: boolean) =>
    faire((x) => peindreBrouillard(x, casesDuPinceau(x, c, ui.brouillard.rayon), ui.brouillard.reveler), !premier);

  function lancer(c: Cellule, wx: number, wy: number) {
    const sp = ui.sort && e.sorts.find((x) => x.id === ui.sort!.id);
    const l = ui.sort && e.jetons.find((x) => x.id === ui.sort!.lanceur);
    if (!sp || !l || !ui.sort) return;
    const angle = sp.origine === 'soi' ? angleVers(e, [l.x, l.y], wx, wy) : ui.sort.angle;
    const zone = zoneDeSort(sp, l, c, angle);
    const r = lancerSort(e, sp.id, l.id, zone, Math.random);
    if (r.erreur) { dire(r.erreur, 'erreur'); if (/antimagie/.test(r.erreur)) { faire(() => r.etat); regler({ outil: 'choisir', sort: null }); } return; }
    faire(() => r.etat);
    if (sp.particule) { const [px, py] = centre(e.grille, [zone.x, zone.y]); emettreParticules(ctl.particules, px, py, sp.particule, 40); }
    if (ui.sons) SONS.sort();
    dire(`${sp.nom} : ${r.cibles?.length ? r.cibles.join(', ') : 'aucune cible'}`, 'succes');
    regler({ outil: 'choisir', sort: null });
  }

  function attaque(cible: number) {
    if (ui.selection == null) { dire('Choisis d’abord l’attaquant.', 'erreur'); return; }
    const r = attaquer(e, ui.selection, cible, ui.attaque, Math.random);
    if (r.erreur) { dire(r.erreur, 'erreur'); return; }
    faire(() => r.etat);
    const t = r.resultat!;
    if (ui.sons) (t.touche ? SONS.coup : SONS.rate)();
    dire(t.touche ? `${t.critique ? 'Critique ! ' : 'Touché : '}${t.degats} dégâts (d20 ${t.jet}, total ${t.total})` : `Raté (d20 ${t.jet}, total ${t.total})`, t.touche ? 'succes' : 'info');
    regler({ outil: 'choisir' });
  }

  function fermerPolygone() {
    const pts = ref.current.polygone;
    if (pts.length < 3) { maj({ polygone: [] }); return; }
    const t = TERRAINS.find((x) => x.id === ui.terrain.type) ?? TERRAINS[0];
    const cx = Math.round(pts.reduce((a, p) => a + p[0], 0) / pts.length), cy = Math.round(pts.reduce((a, p) => a + p[1], 0) / pts.length);
    faire((x) => ajouterZone(x, { ...zoneDeTerrain(t, 'cercle', cx, cy, 0), forme: 'polygone', points: pts }).etat);
    maj({ polygone: [] });
  }

  const onPointerDown = (ev: React.PointerEvent) => {
    const { sx, sy, wx, wy, c } = position(ev);
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    if (ev.button === 1 || ev.button === 2 || ev.altKey || !actif) { maj({ glisse: { sorte: 'pan', sx, sy, cam: camera } }); return; }
    switch (ui.outil) {
      case 'choisir': {
        const j = jetonSous(e, wx, wy);
        if (j) { regler({ selection: j.id, zoneChoisie: null }); maj({ glisse: { sorte: 'jeton', id: j.id, depart: [j.x, j.y], ici: [j.x, j.y] } }); return; }
        const z = zoneSous(e, wx, wy);
        if (z) { regler({ zoneChoisie: z.id, selection: null }); maj({ glisse: { sorte: 'zone', id: z.id, decal: [c[0] - z.x, c[1] - z.y], ici: [z.x, z.y] } }); return; }
        regler({ selection: null, zoneChoisie: null });
        maj({ glisse: { sorte: 'pan', sx, sy, cam: camera } });
        return;
      }
      case 'zone': maj({ glisse: { sorte: 'pose', origine: c, angle: 0 } }); return;
      case 'terrain': {
        if (ui.terrain.forme === 'polygone') {
          const pts = ref.current.polygone;
          if (!pts.length || !memeCase(pts[pts.length - 1], c)) maj({ polygone: [...pts, c] });
          return;
        }
        const t = TERRAINS.find((x) => x.id === ui.terrain.type) ?? TERRAINS[0];
        faire((x) => ajouterZone(x, zoneDeTerrain(t, ui.terrain.forme as 'cercle' | 'carre', c[0], c[1], ui.terrain.rayon)).etat);
        return;
      }
      case 'brouillard': peindre(c, true); maj({ glisse: { sorte: 'brouillard', premier: false } }); return;
      case 'mesure': maj({ mesure: [c, c], glisse: { sorte: 'mesure' } }); return;
      case 'attaque': { const j = jetonSous(e, wx, wy); if (j) attaque(j.id); return; }
      case 'sort': lancer(c, wx, wy); return;
    }
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    const { sx, sy, wx, wy, c } = position(ev);
    const g = ref.current.glisse;
    const p: Partial<EtatSouris> = { pointeur: [wx, wy] };
    if (!ref.current.survol || !memeCase(ref.current.survol, c)) p.survol = c;
    if (g?.sorte === 'pan') setCamera({ ...g.cam, x: g.cam.x + sx - g.sx, y: g.cam.y + sy - g.sy });
    else if (g?.sorte === 'jeton' && !memeCase(g.ici, c)) p.glisse = { ...g, ici: c };
    else if (g?.sorte === 'zone') { const ici: Cellule = [c[0] - g.decal[0], c[1] - g.decal[1]]; if (!memeCase(g.ici, ici)) p.glisse = { ...g, ici }; }
    else if (g?.sorte === 'pose') p.glisse = { ...g, angle: angleVers(e, g.origine, wx, wy) };
    else if (g?.sorte === 'brouillard' && p.survol) peindre(c, false);
    else if (g?.sorte === 'mesure' && ref.current.mesure) p.mesure = [ref.current.mesure[0], c];
    maj(p);
  };

  const onPointerUp = (ev: React.PointerEvent) => {
    const g = ref.current.glisse;
    maj({ glisse: null });
    if (!g) return;
    if (g.sorte === 'jeton' && !memeCase(g.depart, g.ici)) {
      if (ev.shiftKey) { faire((x) => modifierJeton(x, g.id, (j) => ({ ...j, x: g.ici[0], y: g.ici[1] }))); return; }
      const r = deplacer(e, g.id, g.depart, g.ici);
      if (r.ok) faire(() => r.etat); else if (r.raison) dire(`${r.raison} (Maj + glisser pour forcer)`, 'erreur');
    } else if (g.sorte === 'zone') {
      const z = e.zones.find((x) => x.id === g.id);
      if (z && !memeCase([z.x, z.y], g.ici)) faire((x) => deplacerZone(x, g.id, g.ici));
    } else if (g.sorte === 'pose') {
      const z: Omit<Zone, 'id'> = {
        categorie: 'sort', forme: ui.zone.forme, x: g.origine[0], y: g.origine[1], rayon: ui.zone.rayon, largeur: ui.zone.largeur,
        angle: formeOrientable(ui.zone.forme) ? g.angle : 0, couleur: ui.zone.couleur, nom: NOMS_FORMES[ui.zone.forme],
      };
      let id = 0;
      faire((x) => { const r = ajouterZone(x, z); id = r.id; return r.etat; });
      window.setTimeout(() => regler({ zoneChoisie: id }), 0);
    }
  };

  const onWheel = (ev: React.WheelEvent) => {
    const { sx, sy } = position(ev);
    const sp = ui.outil === 'sort' && ui.sort ? e.sorts.find((x) => x.id === ui.sort!.id) : null;
    if (sp && sp.origine === 'point' && formeOrientable(sp.forme)) {
      regler({ sort: { ...ui.sort!, angle: ui.sort!.angle + Math.sign(ev.deltaY) * (Math.PI / 12) } });
      return;
    }
    setCamera(zoomer(camera, ev.deltaY < 0 ? PAS_ZOOM : 1 / PAS_ZOOM, sx, sy));
  };

  const onDoubleClick = () => { if (ui.outil === 'terrain' && ui.terrain.forme === 'polygone') fermerPolygone(); };

  const annulerLocal = () => maj({ polygone: [], mesure: null, glisse: null });

  return { souris: s, onPointerDown, onPointerMove, onPointerUp, onWheel, onDoubleClick, fermerPolygone, annulerLocal };
}

