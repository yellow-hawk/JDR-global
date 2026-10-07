// Globe 3D d'un monde fait main : la carte du monde importée est enroulée sur une sphère
// (projection équirectangulaire, limitée à latMin..latMax ; le reste est rempli de glace ou d'océan).
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Projection } from '../../noyau/contrat';

const REMPLISSAGE: Record<Projection['remplissagePoles'], number> = { glace: 0xe8eef2, ocean: 0x1f4a6e, couleur: 0x6b5d48 };
const deg = Math.PI / 180;

export function Globe({ url, projection: proj }: { url: string; projection: Projection }) {
  const hote = useRef<HTMLDivElement>(null);
  const cle = JSON.stringify(proj);

  useEffect(() => {
    const el = hote.current;
    if (!el) return;
    const projection = JSON.parse(cle) as Projection;
    const rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendu.setPixelRatio(Math.min(2, window.devicePixelRatio));
    el.appendChild(rendu.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0.6, 3.6);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const soleil = new THREE.DirectionalLight(0xffffff, 1.6);
    soleil.position.set(4, 2, 3);
    scene.add(soleil);

    // Sphère de fond (pôles) puis bande texturée entre latMin et latMax.
    const fond = new THREE.Mesh(new THREE.SphereGeometry(0.995, 64, 32), new THREE.MeshStandardMaterial({ color: REMPLISSAGE[projection.remplissagePoles], roughness: 0.9 }));
    scene.add(fond);
    const { lonMin, lonMax, latMin, latMax } = projection;
    const geo = new THREE.SphereGeometry(1, 128, 64,
      (lonMin + 90) * deg, (lonMax - lonMin) * deg, // phi : longitude (décalage pour centrer lon 0 face caméra)
      (90 - latMax) * deg, (latMax - latMin) * deg);  // theta : depuis le pôle nord
    const texture = new THREE.TextureLoader().load(url, () => rendu.render(scene, camera));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = rendu.capabilities.getMaxAnisotropy();
    const bande = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 }));
    scene.add(bande);

    const ctrl = new OrbitControls(camera, rendu.domElement);
    ctrl.enableDamping = true;
    ctrl.minDistance = 1.4;
    ctrl.maxDistance = 8;
    ctrl.autoRotate = true;
    ctrl.autoRotateSpeed = 0.4;
    ctrl.addEventListener('start', () => { ctrl.autoRotate = false; });

    const taille = () => {
      const w = el.clientWidth, h = el.clientHeight || 400;
      rendu.setSize(w, h, false);
      rendu.domElement.style.width = '100%';
      rendu.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const obs = new ResizeObserver(taille);
    obs.observe(el);
    taille();
    let anim = 0;
    const boucle = () => { anim = requestAnimationFrame(boucle); ctrl.update(); rendu.render(scene, camera); };
    boucle();

    return () => {
      cancelAnimationFrame(anim);
      obs.disconnect();
      ctrl.dispose();
      texture.dispose();
      geo.dispose();
      rendu.dispose();
      el.removeChild(rendu.domElement);
    };
  }, [url, cle]);

  return <div ref={hote} className="monde-globe" aria-label="Globe du monde (glisser pour tourner, molette pour zoomer)" />;
}
