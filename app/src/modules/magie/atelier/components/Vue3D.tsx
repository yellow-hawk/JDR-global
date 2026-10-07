import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Analyse } from '../engine/analyse';
import { ELEMENTS, valeurs } from '../engine/effets';
import type { Pt, Stroke } from '../engine/geometry';
import type { Sceau } from '../engine/types';
import { creerEffet, type Effet } from '../three/effet3d';
import { Nuage } from '../three/particules';
import { creerMonde, LIEUX, type Ambiance, type Lieu, type Monde as Decor } from '../three/monde';
import { construireBanc, type Banc, type ChoixCibles } from '../three/banc';
import { constat, type Fx } from '../three/cibles';

interface Props {
  traits: Stroke[];  // dessin du sceau (repère 600×600)
  centre: Pt;
  R: number;
  sceau: Sceau;
  analyse: Analyse;
  playKey: number;
}

const TEX = 1024;
const reduit = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Monde {
  renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls;
  sol: THREE.Mesh; canvas: HTMLCanvasElement; texture: THREE.CanvasTexture;
  solB: THREE.Mesh;
  nuage: Nuage; nuage2: Nuage; lum: Nuage; fumee: Nuage; lumiere: THREE.PointLight; decor: Decor; fx: Fx;
  effet: Effet | null; effet2: Effet | null; banc: Banc | null; t: number;
  fendu: { axe: number; off: number; joindre: (() => void) | null } | null;
}

const lire = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const ecrire = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* indisponible */ } };

/** Vue 3D : le sceau est tracé à la craie sur une aire d'essai ; le sort agit sur des corps externes posés autour. */
export function Vue3D({ traits, centre, R, sceau, analyse, playKey }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const monde = useRef<Monde | null>(null);
  const [erreur, setErreur] = useState(false);
  const [plein, setPlein] = useState(false);
  const [ambiance, setAmbiance] = useState<Ambiance>(() => lire('atelier.ambiance', 'crepuscule'));
  const [choix, setChoix] = useState<ChoixCibles>(() => lire('atelier.cibles', 'auto'));
  const [rebuild, setRebuild] = useState(0);
  const [lieu, setLieu] = useState<Lieu>(() => lire('atelier.lieu', 'pre'));
  const [vue, setVue] = useState<'orbite' | 'lanceur'>('orbite');
  const [releve, setReleve] = useState<{ nom: string; etats: string[] }[]>([]);
  useEffect(() => {
    const id = window.setInterval(() => {
      const b = monde.current?.banc; if (!b) { setReleve([]); return; }
      const l = b.cibles.map((c, i) => constat(c, b.departs[i])).filter((x) => x.etats.length);
      setReleve((old) => (JSON.stringify(old) === JSON.stringify(l) ? old : l));
    }, 400);
    return () => window.clearInterval(id);
  }, []);
  const Rw = 0.9 + 0.25 * sceau.taille;

  // ---- création de la scène
  useEffect(() => {
    const host = hostRef.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); } catch { setErreur(true); return; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 150);
    camera.position.set(6.2, 4.8, 7.8);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.6, -0.5); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 3; controls.maxDistance = 30; controls.autoRotate = !reduit; controls.autoRotateSpeed = 0.35;

    const decor = creerMonde(scene, renderer);
    decor.appliquer(lire('atelier.ambiance', 'crepuscule'));
    decor.lieu(lire('atelier.lieu', 'pre'));
    const lumiere = new THREE.PointLight('#ffffff', 0, 14, 1.5); lumiere.position.set(0, 1.2, 0); scene.add(lumiere);

    // le sceau, tracé à la craie
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = TEX;
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
    const sol = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }));
    sol.rotation.x = -Math.PI / 2; sol.position.y = 0.014; scene.add(sol);
    // seconde moitié, utilisée par le sceau fendu
    const solB = new THREE.Mesh(sol.geometry, new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }));
    solB.rotation.x = -Math.PI / 2; solB.position.y = 0.015; solB.visible = false; scene.add(solB);

    const nuage = new Nuage(6000); scene.add(nuage.points);
    const nuage2 = new Nuage(4000); scene.add(nuage2.points);
    const lum = new Nuage(2500); scene.add(lum.points);
    const fumee = new Nuage(2000); fumee.setSombre(true); scene.add(fumee.points);
    const C = (s: string) => new THREE.Color(s);
    const r = (a: number) => (Math.random() - 0.5) * a;
    const fx: Fx = (kind, p, n = 1) => {
      for (let i = 0; i < n; i++) {
        switch (kind) {
          case 'flamme': lum.add({ x: p.x + r(0.1), y: p.y, z: p.z + r(0.1), vx: r(0.3), vy: 0.8 + Math.random(), vz: r(0.3), max: 0.5 + Math.random() * 0.4, size: 0.2, grow: -0.2 }, C(Math.random() < 0.5 ? '#ff7a2a' : '#ffd36a')); break;
          case 'etincelle': lum.add({ x: p.x, y: p.y, z: p.z, vx: r(3), vy: Math.random() * 3, vz: r(3), max: 0.7, size: 0.08, grav: 4, drag: 0.98 }, C('#ffe9a8')); break;
          case 'esprit': lum.add({ x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: 0, max: 1.2, size: 0.07, orbit: { r: 0.25, a: Math.random() * 6.28, w: 4, dr: 0, y: p.y, vy: 0.1, cx: p.x, cz: p.z } }, C('#c7a4ff')); break;
          case 'goutte': lum.add({ x: p.x, y: p.y, z: p.z, vx: 0, vy: -0.5, vz: 0, max: 0.6, size: 0.05, grav: 6 }, C('#8cc8ff')); break;
          case 'fumee': fumee.add({ x: p.x + r(0.2), y: p.y, z: p.z + r(0.2), vx: r(0.2), vy: 0.6 + Math.random() * 0.4, vz: r(0.2), max: 2.2, size: 0.35, grow: 0.5, drag: 0.99 }, C('#4a4643')); break;
          case 'vapeur': fumee.add({ x: p.x + r(0.4), y: p.y, z: p.z + r(0.4), vx: r(0.3), vy: 0.9, vz: r(0.3), max: 1.4, size: 0.3, grow: 0.6 }, C('#e8eef2')); break;
          case 'poussiere': fumee.add({ x: p.x + r(0.5), y: p.y + r(0.3), z: p.z + r(0.5), vx: r(1), vy: Math.random() * 0.6, vz: r(1), max: 1.6, size: 0.3, grow: 0.5, drag: 0.96 }, C('#a08d70')); break;
          case 'feuille': fumee.add({ x: p.x + r(1), y: p.y + r(0.4), z: p.z + r(1), vx: r(0.8), vy: -0.4, vz: r(0.8), max: 2.2, size: 0.09, grav: 0.4, drag: 0.98 }, C(Math.random() < 0.5 ? '#8a6a2a' : '#5b7d2f')); break;
        }
      }
    };

    monde.current = { renderer, scene, camera, controls, sol, solB, canvas, texture, nuage, nuage2, lum, fumee, lumiere, decor, fx, effet: null, effet2: null, banc: null, t: 0, fendu: null };

    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight || w * 0.75;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(host); resize();

    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const m = monde.current!;
      m.t += dt;
      if (m.effet && !m.effet.update(dt)) { m.effet.dispose(); m.effet = null; }
      if (m.effet2 && !m.effet2.update(dt)) { m.effet2.dispose(); m.effet2 = null; }
      if (!m.effet) m.nuage.update(dt, 1, 0);
      if (!m.effet2) m.nuage2.update(dt, 1, 0);
      // sceau fendu : les deux moitiés glissent l'une vers l'autre
      if (m.fendu) {
        if (m.fendu.joindre) { m.fendu.off = Math.max(0, m.fendu.off - dt * 0.7); if (m.fendu.off === 0) { const f = m.fendu.joindre; m.fendu.joindre = null; fx('etincelle', new THREE.Vector3(0, 0.2, 0), 14); f(); } }
        const a = (m.fendu.axe * Math.PI) / 180, n = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        m.sol.position.set(n.x * m.fendu.off, 0.014, n.z * m.fendu.off);
        m.solB.position.set(-n.x * m.fendu.off, 0.015, -n.z * m.fendu.off);
        (m.sol.material as THREE.Material).clippingPlanes = [new THREE.Plane(n.clone(), -m.fendu.off)];
        (m.solB.material as THREE.Material).clippingPlanes = [new THREE.Plane(n.clone().negate(), -m.fendu.off)];
        m.solB.visible = true;
      } else if (m.solB.visible) { m.solB.visible = false; m.sol.position.set(0, 0.014, 0); (m.sol.material as THREE.Material).clippingPlanes = []; }
      m.banc?.update(dt, m.t);
      m.lum.update(dt, 1, 0); m.fumee.update(dt, 1, 0);
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      monde.current?.effet?.dispose(); monde.current?.banc?.dispose();
      renderer.dispose(); host.removeChild(renderer.domElement); monde.current = null;
    };
  }, []);

  // ---- ambiance
  useEffect(() => { monde.current?.decor.appliquer(ambiance); ecrire('atelier.ambiance', ambiance); }, [ambiance]);
  useEffect(() => { monde.current?.decor.lieu(lieu); ecrire('atelier.lieu', lieu); }, [lieu]);

  // ---- caméra : orbite libre ou vue du lanceur (derrière le sceau, à hauteur d'yeux)
  const placerCamera = (mode: 'orbite' | 'lanceur') => {
    const m = monde.current; if (!m) return;
    if (mode === 'orbite') { m.camera.position.set(6.2, 4.8, 7.8); m.controls.target.set(0, 0.6, -0.5); m.controls.autoRotate = !reduit; }
    else {
      const a = analyse.direction.type === 'cote' || analyse.direction.type === 'axe' ? analyse.direction.angle : 0;
      const d = new THREE.Vector3(Math.sin((a * Math.PI) / 180), 0, -Math.cos((a * Math.PI) / 180));
      m.camera.position.copy(d.clone().multiplyScalar(-(Rw + 1.6))).setY(1.65);
      m.controls.target.copy(d.clone().multiplyScalar(5)).setY(0.9);
      m.controls.autoRotate = false;
    }
    m.controls.update();
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => placerCamera(vue), [vue]);

  // ---- sceau fendu au repos : les moitiés sont écartées
  useEffect(() => {
    const m = monde.current; if (!m) return;
    if (sceau.fendu) { if (!m.fendu || m.fendu.axe !== sceau.fendu.axe) m.fendu = { axe: sceau.fendu.axe, off: 0.55, joindre: null }; }
    else m.fendu = null;
  }, [sceau.fendu?.axe, !!sceau.fendu]);

  // ---- banc d'essai (au repos : disposé selon le sceau en cours)
  const forme = analyse.formes.map((f) => f.id + f.inv).join(',') + analyse.direction.type + Math.round(analyse.direction.angle / 15) + (sceau.coeur?.id ?? '') + sceau.noeuds.map((n) => n.id + n.inv).join(',');
  useEffect(() => {
    const m = monde.current; if (!m) return;
    ecrire('atelier.cibles', choix);
    if (m.effet) return; // ne pas tout replacer pendant un sort
    m.banc?.dispose();
    m.banc = construireBanc(m.scene, sceau, analyse, valeurs(sceau, analyse), Rw, choix, m.fx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choix, rebuild, forme, Rw]);

  // ---- texture du sceau (craie, puis couleur de l'élément quand il est actif)
  useEffect(() => {
    const m = monde.current; if (!m) return;
    const ctx = m.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, TEX, TEX);
    const half = (R || 200) * 1.45;
    const k = TEX / (2 * half);
    const allume = analyse.actif && analyse.coeur;
    const coul = allume ? analyse.coeur!.couleur : '#f1ead6';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const pass of [0, 1]) {
      ctx.strokeStyle = coul;
      ctx.lineWidth = pass === 0 ? 16 : 6;
      ctx.globalAlpha = pass === 0 ? (allume ? 0.4 : 0.12) : 0.95;
      ctx.shadowColor = coul; ctx.shadowBlur = pass === 1 && allume ? 22 : 0;
      for (const s of traits) {
        if (!s.length) continue;
        ctx.beginPath();
        ctx.moveTo((s[0].x - centre.x + half) * k, (s[0].y - centre.y + half) * k);
        for (const p of s) ctx.lineTo((p.x - centre.x + half) * k, (p.y - centre.y + half) * k);
        if (s.length === 1) ctx.lineTo((s[0].x - centre.x + half) * k + 0.5, (s[0].y - centre.y + half) * k);
        ctx.stroke();
      }
    }
    m.texture.needsUpdate = true;
    const size = 2 * Rw * 1.45;
    m.sol.scale.set(size, size, 1);
  }, [traits, centre.x, centre.y, R, analyse.actif, analyse.coeur, Rw]);

  // ---- lancement du sort : banc remis à neuf, puis effet
  useEffect(() => {
    const m = monde.current;
    if (!m || !playKey || !analyse.coeur || !sceau.coeur) return;
    m.effet?.dispose(); m.effet = null;
    m.effet2?.dispose(); m.effet2 = null;
    m.banc?.dispose();
    const V = valeurs(sceau, analyse);
    m.banc = construireBanc(m.scene, sceau, analyse, V, Rw, choix, m.fx);
    if (vue === 'lanceur') placerCamera('lanceur');
    const lancer = () => {
      const banc = m.banc!;
      const g = analyse.technique.greffe;
      if (g?.mode === 'annulation') { m.fx('etincelle', new THREE.Vector3(0, 0.5, 0), 40); m.fx('vapeur', new THREE.Vector3(0, 0.3, 0), 10); return; }
      const cle = sceau.coeur!.id + (sceau.coeur!.inv ? '~' : '');
      m.lumiere.color.set(analyse.coeur!.couleur);
      m.effet = creerEffet({ scene: m.scene, nuage: m.nuage, banc, fx: m.fx, cle, lumiere: m.lumiere, sceau, analyse, element: ELEMENTS[cle], valeurs: V, Rw, reduit });
      // greffe : le second sceau agit en même temps (combinaison) ; en renfort, le premier suffit (puissance déjà cumulée)
      if (g?.mode === 'combinaison' && sceau.greffe?.coeur && g.analyse.coeur) {
        const s2 = sceau.greffe, c2 = s2.coeur!.id + (s2.coeur!.inv ? '~' : '');
        m.effet2 = creerEffet({ scene: m.scene, nuage: m.nuage2, banc, fx: m.fx, cle: c2, lumiere: m.lumiere, sceau: s2, analyse: g.analyse, element: ELEMENTS[c2], valeurs: valeurs(s2, g.analyse), Rw, reduit });
      }
    };
    if (sceau.fendu) { m.fendu = { axe: sceau.fendu.axe, off: 0.55, joindre: lancer }; }
    else lancer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey]);

  useEffect(() => {
    if (!plein) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setPlein(false); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [plein]);

  return (
    <div className={`vue3d-cadre ${plein ? 'plein' : ''}`}>
      <div className="vue3d" ref={hostRef} aria-label="Vue 3D du sort. Glisser pour tourner, molette pour zoomer.">
        {erreur && <p className="vue3d-err">La 3D n’est pas disponible sur cet appareil (WebGL désactivé).</p>}
        {releve.length > 0 && (
          <ul className="releve" aria-label="Effets observés sur les cibles">
            {releve.slice(0, 7).map((r, i) => <li key={i}><b>{r.nom}</b> {r.etats.join(', ')}</li>)}
          </ul>
        )}
      </div>
      <div className="vue3d-barre">
        <span>{analyse.coeur ? (analyse.actif ? 'Sort actif' : 'Sceau en attente') : 'Banc d’essai'}</span>
        <span className="vue3d-ctrl">
          <select aria-label="Cibles" value={choix} onChange={(e) => setChoix(e.target.value as ChoixCibles)}>
            <option value="auto">Cibles : adaptées</option>
            <option value="mannequins">Mannequins</option>
            <option value="objets">Objets</option>
            <option value="nature">Nature</option>
            <option value="aucune">Aucune</option>
          </select>
          <select aria-label="Lieu" value={lieu} onChange={(e) => setLieu(e.target.value as Lieu)}>
            {LIEUX.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
          </select>
          <button className="btn mini" onClick={() => setVue(vue === 'orbite' ? 'lanceur' : 'orbite')} aria-pressed={vue === 'lanceur'} title="Voir depuis la place du lanceur">{vue === 'lanceur' ? 'Vue libre' : 'Vue du lanceur'}</button>
          <select aria-label="Ambiance" value={ambiance} onChange={(e) => setAmbiance(e.target.value as Ambiance)}>
            <option value="jour">Jour</option>
            <option value="crepuscule">Crépuscule</option>
            <option value="nuit">Nuit</option>
          </select>
          <button className="btn mini" onClick={() => setRebuild((k) => k + 1)} title="Remettre les cibles en place">Remettre</button>
          <button className="btn mini" onClick={() => setPlein(!plein)} aria-pressed={plein}>{plein ? 'Réduire (Échap)' : 'Agrandir'}</button>
        </span>
      </div>
    </div>
  );
}
