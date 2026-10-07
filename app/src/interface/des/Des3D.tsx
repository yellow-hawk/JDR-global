// Animation d'un jet en 3D (écran joueurs) : les bons dés roulent, rebondissent et s'arrêtent sur leur valeur,
// face à la caméra. Le total s'affiche ensuite, puis l'ensemble s'efface. Chargé à la demande (three).
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { JetDes } from '../../noyau/regles';
import { creerDe, desPhysiques, type ModeleDe } from './geometrie';

const DUREE = 1.9;       // s, roulement d'un dé
const DECALAGE = 0.09;   // s, entre deux dés
const AFFICHAGE = 6.5;   // s, avant de s'effacer
const MAX_VISIBLES = 12;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

interface Anime {
  de: ModeleDe; ecarte: boolean;
  depart: THREE.Vector3; arrivee: THREE.Vector3; final: THREE.Quaternion;
  axe: THREE.Vector3; tours: number; retard: number; echelle: number;
}

export default function Des3D({ jet }: { jet: JetDes }) {
  const boite = useRef<HTMLDivElement>(null);
  const [fini, setFini] = useState(false);
  const [efface, setEfface] = useState(false);

  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    setFini(false); setEfface(false);
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { setFini(true); return; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 14);
    scene.add(new THREE.AmbientLight('#ffffff', 1.1));
    const soleil = new THREE.DirectionalLight('#fff3dd', 2.4);
    soleil.position.set(-4, 6, 10);
    scene.add(soleil);
    const contre = new THREE.DirectionalLight('#aac4ff', 0.7);
    contre.position.set(5, -4, 6);
    scene.add(contre);

    // Dés physiques (un d100 = deux d10), disposés en rangées au centre.
    const physiques = jet.des.flatMap((d) => desPhysiques(d.faces, d.valeur).map((p) => ({ ...p, ecarte: !!d.ecarte })));
    const visibles = physiques.slice(0, MAX_VISIBLES);
    const parRangee = visibles.length <= 4 ? visibles.length : Math.ceil(visibles.length / 2);
    const rangees = Math.ceil(visibles.length / Math.max(1, parRangee));
    const echelle = visibles.length > 6 ? 0.8 : 1;
    const pas = 2.3 * echelle;
    const hasard = (a: number, b: number) => a + Math.random() * (b - a); // animation seulement (pas de génération)
    const animes: Anime[] = visibles.map((p, i) => {
      const de = creerDe(p.faces, p.variante);
      const col = i % parRangee, lig = Math.floor(i / parRangee);
      const nbLigne = Math.min(parRangee, visibles.length - lig * parRangee);
      const arrivee = new THREE.Vector3((col - (nbLigne - 1) / 2) * pas, ((rangees - 1) / 2 - lig) * pas * 0.95 + 0.6, 0);
      const cote = Math.random() < 0.5 ? -1 : 1;
      const depart = new THREE.Vector3(arrivee.x + cote * hasard(5, 9), hasard(-7, -5), hasard(1, 3));
      de.groupe.scale.setScalar(echelle);
      scene.add(de.groupe);
      return {
        // légère inclinaison finale : le dé garde du relief, la face du résultat reste lisible
        de, ecarte: p.ecarte, depart, arrivee, final: new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.32, hasard(-0.3, 0.3), hasard(-0.12, 0.12))).multiply(de.orientationPour(p.etiquette)),
        axe: new THREE.Vector3(hasard(-1, 1), hasard(-1, 1), hasard(-0.4, 0.4)).normalize(),
        tours: hasard(5, 8) * Math.PI, retard: i * DECALAGE, echelle,
      };
    });

    const taille = () => {
      const { clientWidth: l, clientHeight: h } = el;
      renderer.setSize(l, h, false);
      camera.aspect = l / Math.max(1, h);
      // garder toute la rangée dans le champ sur un écran étroit
      camera.position.z = camera.aspect < 1.2 ? 14 * (1.2 / camera.aspect) : 14;
      camera.updateProjectionMatrix();
    };
    taille();
    const obs = new ResizeObserver(taille);
    obs.observe(el);

    const debut = performance.now();
    const fin = DUREE + DECALAGE * Math.max(0, animes.length - 1);
    let image = 0, annonce = false;
    const tourne = new THREE.Quaternion();
    const boucle = () => {
      const t = (performance.now() - debut) / 1000;
      for (const a of animes) {
        const u = Math.min(1, Math.max(0, (t - a.retard) / DUREE));
        const e = easeOut(u);
        const g = a.de.groupe;
        g.visible = t >= a.retard;
        g.position.lerpVectors(a.depart, a.arrivee, e);
        g.position.z = a.depart.z * (1 - e) + 1.6 * Math.abs(Math.sin(u * Math.PI * 3)) * Math.pow(1 - u, 2);
        tourne.setFromAxisAngle(a.axe, a.tours * (1 - e));
        g.quaternion.copy(tourne).multiply(a.final);
        if (a.ecarte) {
          const k = Math.min(1, Math.max(0, (t - a.retard - DUREE) / 0.5));
          a.de.assombrir(k);
          g.scale.setScalar(a.echelle * (1 - 0.18 * k));
        }
      }
      if (!annonce && t >= fin) { annonce = true; setFini(true); }
      renderer.render(scene, camera);
      if (t < fin + AFFICHAGE + 1) image = requestAnimationFrame(boucle);
    };
    image = requestAnimationFrame(boucle);
    const effacer = window.setTimeout(() => setEfface(true), (fin + AFFICHAGE) * 1000);

    return () => {
      cancelAnimationFrame(image);
      window.clearTimeout(effacer);
      obs.disconnect();
      animes.forEach((a) => a.de.liberer());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [jet]);

  const garde = jet.des.filter((d) => !d.ecarte);
  const cache = jet.des.length > MAX_VISIBLES ? ` (+${jet.des.length - MAX_VISIBLES} dés)` : '';
  return (
    <div className={`des3d ${efface ? 'efface' : ''}`} aria-live="polite">
      <div ref={boite} className="des3d-scene" />
      <div className={`des3d-total ${fini ? 'visible' : ''}`}>
        {jet.qui && <div className="des3d-qui">{jet.qui}</div>}
        <div className="des3d-nombre">{jet.total}</div>
        <div className="des3d-detail">
          {jet.formule}{jet.mode === 'avantage' ? ' · avantage' : jet.mode === 'desavantage' ? ' · désavantage' : ''}
          {(garde.length > 1 || jet.modificateur !== 0) && garde.length <= 6 && ` · ${garde.map((d) => `${d.negatif ? '−' : ''}${d.valeur}`).join(' + ').replace(/\+ −/g, '− ')}${jet.modificateur ? ` ${jet.modificateur > 0 ? '+' : '−'} ${Math.abs(jet.modificateur)}` : ''}`}{cache}
        </div>
      </div>
    </div>
  );
}
