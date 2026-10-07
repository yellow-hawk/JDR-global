// Canevas de la table : caméra, boucle de dessin, aperçus des outils, clavier (Échap, Entrée, Suppr).
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePortraits } from './images';
import { modifierJeton, porteeDeplacement, supprimerJeton, supprimerZone, TERRAINS, zoneDeSort } from '../moteur';
import type { Zone } from '../moteur';
import {
  avancerParticules, cadrer, cameraInitiale, dessinerScene, echelleFond, type Apercu, type Camera, type Fond, type Public,
} from '../rendu';
import { angleVers, formeOrientable } from './interactions';
import { useSouris } from './souris';
import { NOMS_FORMES, type Controleur } from './types';

interface Props { ctl: Controleur; public: Public; fond: Fond | null }

export function Table({ ctl, public: pub, fond }: Props) {
  const toile = useRef<HTMLCanvasElement>(null);
  const [taille, setTaille] = useState({ l: 800, h: 600 });
  const [camera, setCamera] = useState<Camera>(cameraInitiale);
  const portraits = usePortraits(ctl.etat);
  const mj = pub === 'mj';
  const { souris, fermerPolygone, annulerLocal, ...gestion } = useSouris(ctl, camera, setCamera, mj);
  const { etat: e, ui } = ctl;

  // Taille du canevas = taille de son conteneur.
  useEffect(() => {
    const c = toile.current!;
    const ro = new ResizeObserver(() => setTaille({ l: c.clientWidth, h: c.clientHeight }));
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  // Cadrage automatique quand la carte de fond change.
  useEffect(() => {
    if (!fond) return;
    const k = echelleFond(e);
    setCamera(cadrer([0, 0, fond.largeur * k, fond.hauteur * k], taille.l, taille.h));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fond]);

  // État dessiné : avec le jeton ou la zone en cours de glisse à sa position provisoire.
  const g = souris.glisse;
  const vue = useMemo(() => {
    if (g?.sorte === 'jeton') return modifierJeton(e, g.id, (j) => ({ ...j, x: g.ici[0], y: g.ici[1] }));
    if (g?.sorte === 'zone') return { ...e, zones: e.zones.map((z) => (z.id === g.id ? deplacer(z, g.ici) : z)) };
    return e;
  }, [e, g]);

  const choisi = e.jetons.find((j) => j.id === ui.selection) ?? null;
  const portee = useMemo(() => {
    if (!mj || !choisi || !e.combat.actif || !e.porteeDeplacement || !['choisir'].includes(ui.outil)) return null;
    const autres = e.jetons.filter((j) => j.id !== choisi.id);
    const depart = g?.sorte === 'jeton' && g.id === choisi.id ? g.depart : [choisi.x, choisi.y] as [number, number];
    return { jeton: choisi, cases: porteeDeplacement(e.grille, e.zones, TERRAINS, autres, depart, Math.max(0, choisi.vitesse - choisi.mouvementUtilise)) };
  }, [mj, choisi, e, ui.outil, g]);

  const apercu: Apercu = { survol: g?.sorte === 'jeton' ? g.ici : souris.survol, portee, mesure: souris.mesure, polygone: souris.polygone };
  if (ui.outil === 'attaque' && choisi) apercu.attaque = { jeton: choisi, sorte: ui.attaque };
  if (ui.outil === 'brouillard' && souris.survol) apercu.pinceau = { centre: souris.survol, rayon: ui.brouillard.rayon };
  if (ui.outil === 'sort' && ui.sort && souris.survol) {
    const sp = e.sorts.find((x) => x.id === ui.sort!.id), l = e.jetons.find((x) => x.id === ui.sort!.lanceur);
    if (sp && l) {
      const angle = sp.origine === 'soi' && souris.pointeur ? angleVers(e, [l.x, l.y], ...souris.pointeur) : ui.sort.angle;
      apercu.sort = { gabarit: sp, lanceur: l, zone: zoneDeSort(sp, l, souris.survol, angle) };
    }
  }
  if (g?.sorte === 'pose') {
    apercu.zone = { categorie: 'sort', forme: ui.zone.forme, x: g.origine[0], y: g.origine[1], rayon: ui.zone.rayon, largeur: ui.zone.largeur,
      angle: formeOrientable(ui.zone.forme) ? g.angle : 0, couleur: ui.zone.couleur, nom: NOMS_FORMES[ui.zone.forme] };
  }

  // Dessin : à chaque changement, puis en continu tant que des particules ou un sort visé s'animent.
  const scene = { vue, apercu, camera, taille, portraits, fond, pub, sel: ui.selection, zc: ui.zoneChoisie };
  const derniere = useRef(scene); derniere.current = scene;
  useEffect(() => {
    let fin = false, anim = 0;
    const dessiner = () => {
      const c = toile.current;
      if (!c || fin) return;
      const s = derniere.current;
      const dpr = window.devicePixelRatio || 1;
      if (c.width !== Math.round(s.taille.l * dpr)) { c.width = Math.round(s.taille.l * dpr); c.height = Math.round(s.taille.h * dpr); }
      if (c.height !== Math.round(s.taille.h * dpr)) c.height = Math.round(s.taille.h * dpr);
      const ctx = c.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bouge = avancerParticules(ctl.particules);
      dessinerScene(ctx, {
        etat: s.vue, types: TERRAINS, camera: s.camera, largeur: s.taille.l, hauteur: s.taille.h, public: s.pub, fond: s.fond,
        portraits: s.portraits, selection: s.sel, zoneChoisie: s.zc, apercu: s.apercu, particules: ctl.particules, temps: performance.now(),
      });
      if (bouge || s.apercu.sort) anim = requestAnimationFrame(dessiner);
    };
    anim = requestAnimationFrame(dessiner);
    return () => { fin = true; cancelAnimationFrame(anim); };
  });

  // Clavier propre à la table.
  useEffect(() => {
    const touche = (ev: KeyboardEvent) => {
      const cible = ev.target as HTMLElement;
      if (cible.closest('input, textarea, select, [contenteditable]')) return;
      if (ev.key === 'Escape') { annulerLocal(); ctl.regler({ outil: 'choisir', sort: null }); }
      else if (ev.key === 'Enter' && souris.polygone.length) fermerPolygone();
      else if ((ev.key === 'Delete' || ev.key === 'Backspace') && mj && !ctl.lectureSeule) {
        if (ui.selection != null) { ctl.faire((x) => supprimerJeton(x, ui.selection!)); ctl.regler({ selection: null }); }
        else if (ui.zoneChoisie != null) { ctl.faire((x) => supprimerZone(x, ui.zoneChoisie!)); ctl.regler({ zoneChoisie: null }); }
      }
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [ctl, ui.selection, ui.zoneChoisie, souris.polygone.length, fermerPolygone, annulerLocal, mj]);

  const curseur = g?.sorte === 'pan' ? 'grabbing' : ui.outil === 'choisir' ? 'default' : 'crosshair';
  return (
    <canvas
      ref={toile} className="combat-toile" style={{ cursor: curseur }}
      onPointerDown={gestion.onPointerDown} onPointerMove={gestion.onPointerMove} onPointerUp={gestion.onPointerUp}
      onWheel={gestion.onWheel} onDoubleClick={gestion.onDoubleClick} onContextMenu={(ev) => ev.preventDefault()}
    />
  );
}

function deplacer(z: Zone, c: [number, number]): Zone {
  const dx = c[0] - z.x, dy = c[1] - z.y;
  return { ...z, x: c[0], y: c[1], points: z.points?.map((p) => [p[0] + dx, p[1] + dy] as [number, number]) };
}
