// Dessin complet de la table sur un canevas : fond, grille, zones, jetons, brouillard, aperçus, particules.
import { jetonActif } from '../moteur/regles';
import { jetonsDansZone } from '../moteur/formes';
import type { EtatTable, TypeTerrain } from '../moteur/types';
import { cle } from '../moteur/types';
import { dessinerApercus, dessinerPortee, type Apercu } from './apercus';
import { versEcran, type Camera } from './camera';
import { dessinerAuras, dessinerJeton, type MarquesJeton } from './jetons';
import { dessinerParticules, type Particule } from './particules';
import { casesVisiblesEcran, cheminCase, ecran, peintre, type Peintre } from './peintre';
import { jetonVisible, type Public } from './visibilite';
import { dessinerZones } from './zones';

export interface Fond { image: CanvasImageSource; largeur: number; hauteur: number }

export interface Scene {
  etat: EtatTable;
  types: TypeTerrain[];
  camera: Camera;
  largeur: number;
  hauteur: number;
  public: Public;
  fond?: Fond | null;
  portraits?: Map<number, CanvasImageSource>;
  selection?: number | null;
  zoneChoisie?: number | null;
  apercu?: Apercu;
  particules?: Particule[];
  temps?: number;
  couleurFond?: string;
  couleurGrille?: string;
}

/** Échelle monde par pixel d'image de la carte de fond (1 si la grille n'est pas calée). */
export const echelleFond = (e: EtatTable): number => (e.fond?.pxCase ? e.grille.taille / e.fond.pxCase : 1);

function dessinerGrille(p: Peintre, couleur: string): void {
  const { ctx, cam, g, largeur: w, hauteur: h } = p;
  ctx.save();
  ctx.strokeStyle = couleur; ctx.lineWidth = 0.6;
  if (g.type === 'carree') {
    const t = g.taille * cam.zoom;
    if (t < 4) { ctx.restore(); return; }
    ctx.beginPath();
    for (let x = ((cam.x % t) + t) % t; x < w; x += t) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = ((cam.y % t) + t) % t; y < h; y += t) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
  } else {
    if (g.taille * cam.zoom < 6) { ctx.restore(); return; }
    for (const c of casesVisiblesEcran(p)) { const [sx, sy] = ecran(p, c); cheminCase(p, sx, sy); ctx.stroke(); }
  }
  ctx.restore();
}

function dessinerBrouillard(p: Peintre, e: EtatTable, pub: Public): void {
  if (!e.brouillard.actif) return;
  const { ctx } = p;
  ctx.save();
  ctx.fillStyle = pub === 'mj' ? 'rgba(0,0,0,.55)' : 'rgba(0,0,0,1)';
  for (const c of casesVisiblesEcran(p)) {
    if (e.brouillard.cases[cle(c)]) continue;
    const [sx, sy] = ecran(p, c);
    cheminCase(p, sx, sy, p.g.type === 'hex' ? 1.02 : 1.03);
    ctx.fill();
  }
  ctx.restore();
}

export function dessinerScene(ctx: CanvasRenderingContext2D, s: Scene): void {
  const e = s.etat;
  const p = peintre(ctx, s.camera, e.grille, s.largeur, s.hauteur);
  const a = s.apercu ?? {};
  ctx.save();
  ctx.fillStyle = s.couleurFond ?? '#0b0c10';
  ctx.fillRect(0, 0, s.largeur, s.hauteur);
  if (s.fond) {
    const k = echelleFond(e);
    const [x, y] = versEcran(s.camera, 0, 0);
    ctx.save(); ctx.globalAlpha = e.opacites.carte;
    ctx.drawImage(s.fond.image, x, y, s.fond.largeur * k * s.camera.zoom, s.fond.hauteur * k * s.camera.zoom);
    ctx.restore();
  }
  dessinerGrille(p, s.couleurGrille ?? 'rgba(255,255,255,.09)');
  if (a.portee && s.public === 'mj') dessinerPortee(p, a.portee, a.survol);
  dessinerZones(p, e.zones, e.opacites, s.types, s.zoneChoisie ?? null);

  const visibles = e.jetons.filter((j) => jetonVisible(e, j, s.public));
  dessinerAuras(p, visibles);
  const actif = jetonActif(e)?.id;
  const cibles = a.sort ? new Set(jetonsDansZone(e.grille, { ...a.sort.zone, id: -1 }, visibles).map((j) => j.id)) : null;
  const soigne = a.sort?.gabarit.effets.some((f) => f.type === 'soin') && !a.sort?.gabarit.effets.some((f) => f.type === 'degats');
  // Les jetons à terre dessous, les debout dessus, le sélectionné en dernier.
  const ordre = [...visibles].sort((x, y) => (x.pv > 0 ? 1 : 0) - (y.pv > 0 ? 1 : 0) || (x.id === s.selection ? 1 : 0) - (y.id === s.selection ? 1 : 0));
  for (const j of ordre) {
    const m: MarquesJeton = {
      choisi: j.id === s.selection, actif: j.id === actif, lanceur: a.sort?.lanceur.id === j.id,
      attaquant: a.attaque?.jeton.id === j.id, cible: cibles?.has(j.id) ? (soigne ? 'soin' : 'degats') : null,
    };
    dessinerJeton(p, j, s.public, m, s.portraits?.get(j.id) ?? null, e.opacites.jetons);
  }
  dessinerBrouillard(p, e, s.public);
  if (s.public === 'mj') dessinerApercus(p, a, s.types, s.temps ?? 0);
  if (s.particules?.length) dessinerParticules(p, s.particules);
  ctx.restore();
}
