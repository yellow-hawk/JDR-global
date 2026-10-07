// Décor du banc d'essai : ciel, sol, lumières, et cinq lieux (prairie, forêt, village, grotte, atelier).
import * as THREE from 'three';

export type Ambiance = 'jour' | 'crepuscule' | 'nuit';
export type Lieu = 'pre' | 'foret' | 'village' | 'grotte' | 'atelier';
export const LIEUX: { id: Lieu; nom: string }[] = [
  { id: 'pre', nom: 'Prairie' }, { id: 'foret', nom: 'Forêt' }, { id: 'village', nom: 'Village' }, { id: 'grotte', nom: 'Grotte' }, { id: 'atelier', nom: 'Atelier' },
];

const AMB: Record<Ambiance, { haut: string; horizon: string; soleil: string; intSoleil: number; hemi: number; brouillard: string; pos: [number, number, number] }> = {
  jour: { haut: '#5d93d1', horizon: '#d6e6f2', soleil: '#fff4dc', intSoleil: 2.4, hemi: 0.9, brouillard: '#cfdde9', pos: [6, 12, 4] },
  crepuscule: { haut: '#2c3168', horizon: '#eea06b', soleil: '#ffb27c', intSoleil: 1.5, hemi: 0.55, brouillard: '#9e7f86', pos: [-9, 4, -6] },
  nuit: { haut: '#050916', horizon: '#1b2747', soleil: '#9fb4ff', intSoleil: 0.45, hemi: 0.22, brouillard: '#141d36', pos: [5, 10, -4] },
};

function tex(dessin: (x: CanvasRenderingContext2D) => void, rep: number, taille = 256): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = taille;
  dessin(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const taches = (x: CanvasRenderingContext2D, fond: string, couleurs: string[], n: number, max = 3) => {
  x.fillStyle = fond; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < n; i++) { x.fillStyle = couleurs[Math.floor(Math.random() * couleurs.length)]; const s = 1 + Math.random() * max; x.fillRect(Math.random() * 256, Math.random() * 256, s, s); }
};
const SOLS: Record<Lieu, () => THREE.CanvasTexture> = {
  pre: () => tex((x) => taches(x, '#5f7d3b', ['rgba(70,100,40,.45)', 'rgba(120,150,70,.4)', 'rgba(110,90,55,.3)'], 2600), 14),
  foret: () => tex((x) => taches(x, '#3e4a2a', ['rgba(30,40,20,.5)', 'rgba(90,110,50,.35)', 'rgba(100,70,40,.4)', 'rgba(60,80,40,.4)'], 3200, 4), 12),
  village: () => tex((x) => {
    x.fillStyle = '#6d6a64'; x.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const v = 95 + Math.random() * 50; x.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
      x.beginPath(); x.roundRect(c * 32 + (r % 2) * 16 + 2, r * 32 + 2, 28, 28, 6); x.fill();
    }
  }, 16),
  grotte: () => tex((x) => taches(x, '#3c3a38', ['rgba(20,20,20,.5)', 'rgba(90,85,80,.4)', 'rgba(60,70,80,.3)'], 3000, 5), 10),
  atelier: () => tex((x) => {
    for (let i = 0; i < 8; i++) { const v = 110 + Math.random() * 40; x.fillStyle = `rgb(${v},${v * 0.72},${v * 0.45})`; x.fillRect(0, i * 32, 256, 31); x.fillStyle = 'rgba(40,25,10,.5)'; x.fillRect(0, i * 32 + 31, 256, 1); x.fillRect(Math.random() * 256, i * 32, 1, 31); }
    for (let i = 0; i < 400; i++) { x.fillStyle = 'rgba(60,35,15,.15)'; x.fillRect(Math.random() * 256, Math.random() * 256, 8 + Math.random() * 20, 1); }
  }, 8),
};
function textureAire(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(128, 128, 20, 128, 128, 128);
  g.addColorStop(0, '#7f7462'); g.addColorStop(0.8, '#736856'); g.addColorStop(1, 'rgba(115,104,86,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export interface Monde {
  appliquer(a: Ambiance): void;
  lieu(l: Lieu): void;
}

const M = (c: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, ...o });
const ombre = <T extends THREE.Object3D>(o: T) => { o.traverse((c) => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return o; };
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function arbre(g: THREE.Group, x: number, z: number, h: number, sapin: boolean) {
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * h / 3, 0.16 * h / 3, h * 0.45, 7), M('#4f3720')); t.position.set(x, h * 0.22, z); g.add(t);
  if (sapin) for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(h * (0.34 - i * 0.07), h * 0.42, 8), M(i % 2 ? '#2f4f26' : '#36592b', { flatShading: true })); c.position.set(x, h * (0.45 + i * 0.2), z); g.add(c); }
  else for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(h * rnd(0.2, 0.28), 0), M('#3f6d32', { flatShading: true })); c.position.set(x + rnd(-0.4, 0.4), h * rnd(0.6, 0.85), z + rnd(-0.4, 0.4)); g.add(c); }
}
function maison(g: THREE.Group, x: number, z: number, rot: number) {
  const m = new THREE.Group(); m.position.set(x, 0, z); m.rotation.y = rot;
  const w = rnd(3, 4.5), d = rnd(3, 4), h = rnd(2.4, 3.2);
  const murs = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(['#d9cdb4', '#cbbd9e', '#e2d6c0'][Math.floor(Math.random() * 3)])); murs.position.y = h / 2; m.add(murs);
  const toit = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 1.8, 4), M(['#8a3b2a', '#6b4a3a', '#5a5f6a'][Math.floor(Math.random() * 3)], { flatShading: true })); toit.position.y = h + 0.9; toit.rotation.y = Math.PI / 4; m.add(toit);
  const porte = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.05), M('#5a3a1e')); porte.position.set(0, 0.85, d / 2 + 0.02); m.add(porte);
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.05), M('#ffd98a', { emissive: '#ffb84a', emissiveIntensity: 0.6 })); f.position.set(s * w * 0.3, h * 0.6, d / 2 + 0.02); m.add(f); }
  g.add(m);
}

function construireLieu(l: Lieu): { g: THREE.Group; ferme: boolean; aire: boolean } {
  const g = new THREE.Group();
  switch (l) {
    case 'pre': {
      const bois = M('#6e5233', { roughness: 0.9 });
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        if (Math.abs(Math.sin(a * 0.5)) < 0.12) continue;
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.1, 6), bois); p.position.set(Math.cos(a) * 13, 0.55, Math.sin(a) * 13); g.add(p);
        const t = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 3.2), bois); t.position.set(Math.cos(a + 0.12) * 13, 0.85, Math.sin(a + 0.12) * 13); t.rotation.y = -a - 0.12; g.add(t);
      }
      for (let i = 0; i < 14; i++) { const a = rnd(0, 6.28), r = rnd(14.5, 24), s = rnd(0.3, 1.2); const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), M('#8b8679', { flatShading: true })); m.position.set(Math.cos(a) * r, s * 0.4, Math.sin(a) * r); g.add(m); }
      for (let i = 0; i < 22; i++) { const a = rnd(0, 6.28), r = rnd(20, 36); arbre(g, Math.cos(a) * r, Math.sin(a) * r, rnd(3, 6), true); }
      return { g: ombre(g), ferme: false, aire: true };
    }
    case 'foret': {
      for (let i = 0; i < 70; i++) { const a = rnd(0, 6.28), r = rnd(8, 30); if (r < 9 && Math.random() < 0.5) continue; arbre(g, Math.cos(a) * r, Math.sin(a) * r, rnd(4, 8), Math.random() < 0.6); }
      for (let i = 0; i < 5; i++) { const a = rnd(0, 6.28), r = rnd(7, 11); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, rnd(2.5, 4), 8), M('#5a4128')); tr.rotation.z = Math.PI / 2; tr.rotation.y = rnd(0, 3); tr.position.set(Math.cos(a) * r, 0.28, Math.sin(a) * r); g.add(tr); }
      for (let i = 0; i < 18; i++) { const a = rnd(0, 6.28), r = rnd(5, 12); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.2, 6), M('#e8e0cc')); p.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r); const c = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 4, 0, 6.3, 0, 1.6), M(Math.random() < 0.5 ? '#b5361f' : '#c9a15a')); c.position.set(p.position.x, 0.2, p.position.z); g.add(p, c); }
      for (let i = 0; i < 30; i++) { const a = rnd(0, 6.28), r = rnd(5, 14); const b = new THREE.Mesh(new THREE.IcosahedronGeometry(rnd(0.3, 0.6), 0), M('#3f6328', { flatShading: true })); b.position.set(Math.cos(a) * r, 0.2, Math.sin(a) * r); b.scale.y = 0.6; g.add(b); }
      return { g: ombre(g), ferme: false, aire: true };
    }
    case 'village': {
      const pos: [number, number][] = [[-11, -9], [-4, -13], [5, -12], [12, -7], [13, 3], [11, 11], [-12, 4], [-10, 12], [2, 14]];
      for (const [x, z] of pos) maison(g, x, z, Math.atan2(-x, -z));
      const puits = new THREE.Group(); puits.position.set(-6.5, 0, 3.5);
      puits.add(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.85, 0.8, 12, 1, true), M('#8a857a', { side: THREE.DoubleSide, flatShading: true })));
      (puits.children[0] as THREE.Mesh).position.y = 0.4;
      for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 0.1), M('#5a3a1e')); p.position.set(s * 0.75, 0.9, 0); puits.add(p); }
      const t = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.7, 4), M('#6b4a3a')); t.position.y = 2.1; t.rotation.y = Math.PI / 4; puits.add(t);
      g.add(puits);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.28 + 0.4; const lp = new THREE.Group(); lp.position.set(Math.cos(a) * 7.5, 0, Math.sin(a) * 7.5);
        lp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 6), M('#2c2c30', { metalness: 0.5 }))); (lp.children[0] as THREE.Mesh).position.y = 1.3;
        const lanterne = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.32, 0.25), M('#ffd98a', { emissive: '#ffb84a', emissiveIntensity: 1.2 })); lanterne.position.y = 2.7; lp.add(lanterne);
        const lum = new THREE.PointLight('#ffb36a', 1.5, 7, 1.5); lum.position.y = 2.6; lp.add(lum); g.add(lp); }
      return { g: ombre(g), ferme: false, aire: false };
    }
    case 'grotte': {
      const voute = new THREE.Mesh(new THREE.IcosahedronGeometry(16, 2), M('#4a4642', { side: THREE.BackSide, flatShading: true }));
      voute.scale.set(1, 0.55, 1); g.add(voute);
      for (let i = 0; i < 40; i++) { const a = rnd(0, 6.28), r = rnd(6, 14), h = rnd(0.6, 2.8);
        const st = new THREE.Mesh(new THREE.ConeGeometry(h * 0.25, h, 7), M('#5c5650', { flatShading: true }));
        if (i % 2) { st.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r); } else { st.rotation.x = Math.PI; st.position.set(Math.cos(a) * r, 8.5 - h / 2 - (r - 6) * 0.35, Math.sin(a) * r); }
        g.add(st); }
      for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28 + 0.3, r = rnd(7, 10);
        const cr = new THREE.Mesh(new THREE.OctahedronGeometry(rnd(0.3, 0.6), 0), M('#7fd8ff', { emissive: '#3fb8ff', emissiveIntensity: 1.4, roughness: 0.2 }));
        cr.position.set(Math.cos(a) * r, 0.4, Math.sin(a) * r); cr.scale.y = 2; g.add(cr);
        const l = new THREE.PointLight('#5fc8ff', 2, 8, 1.6); l.position.copy(cr.position).setY(1); g.add(l); }
      return { g: ombre(g), ferme: true, aire: false };
    }
    case 'atelier': {
      const mur = M('#8f7f6a'), poutre = M('#4a3220');
      const salle = new THREE.Mesh(new THREE.BoxGeometry(26, 7, 26), M('#9b8b74', { side: THREE.BackSide })); salle.position.y = 3.5; g.add(salle);
      for (let i = -2; i <= 2; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(26, 0.35, 0.35), poutre); p.position.set(0, 6.6, i * 5); g.add(p); }
      for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) {
        const f = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.6), M('#ffe9b8', { emissive: '#ffd890', emissiveIntensity: 1.1 }));
        f.position.set(s * 12.95, 3.4, i * 7); f.rotation.y = -s * Math.PI / 2; g.add(f);
      }
      for (let k = 0; k < 3; k++) { const et = new THREE.Group(); et.position.set(-6 + k * 6, 0, -12.4);
        for (let n = 0; n < 4; n++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.08, 0.8), poutre); pl.position.y = 0.6 + n * 1.1; et.add(pl);
          for (let b = 0; b < 12; b++) { const h = rnd(0.5, 0.8); const lv = new THREE.Mesh(new THREE.BoxGeometry(0.22, h, 0.6), M(['#7a2a2a', '#2a4a7a', '#3a6a3a', '#7a6a2a'][b % 4])); lv.position.set(-2 + b * 0.34, 0.64 + n * 1.1 + h / 2, 0); et.add(lv); } }
        g.add(et); }
      const etabli = new THREE.Mesh(new THREE.BoxGeometry(4, 0.15, 1.6), poutre); etabli.position.set(9, 1, 6); g.add(etabli);
      for (const [x, z] of [[-1.8, -0.7], [1.8, -0.7], [-1.8, 0.7], [1.8, 0.7]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), poutre); p.position.set(9 + x, 0.5, 6 + z); g.add(p); }
      void mur;
      const lustre = new THREE.PointLight('#ffcf8a', 3, 18, 1.4); lustre.position.set(0, 5.5, 0); g.add(lustre);
      return { g: ombre(g), ferme: true, aire: false };
    }
  }
}

export function creerMonde(scene: THREE.Scene, renderer: THREE.WebGLRenderer): Monde {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;

  const ciel = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { haut: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 haut; uniform vec3 horizon; varying vec3 vP; void main(){ float h = clamp(vP.y * 1.6, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, haut, pow(h, 0.7)), 1.0); }',
  }));
  scene.add(ciel);
  const hemi = new THREE.HemisphereLight('#ffffff', '#4a3b2a', 0.8); scene.add(hemi);
  const soleil = new THREE.DirectionalLight('#ffffff', 2);
  soleil.castShadow = true; soleil.shadow.mapSize.set(1024, 1024);
  const sc = soleil.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 45;
  soleil.shadow.bias = -0.0008;
  scene.add(soleil);

  const solMat = new THREE.MeshStandardMaterial({ map: SOLS.pre(), roughness: 1 });
  const sol = new THREE.Mesh(new THREE.CircleGeometry(45, 64), solMat);
  sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; scene.add(sol);
  const aire = new THREE.Mesh(new THREE.CircleGeometry(4.2, 64), new THREE.MeshStandardMaterial({ map: textureAire(), transparent: true, roughness: 1, depthWrite: false }));
  aire.rotation.x = -Math.PI / 2; aire.position.y = 0.004; aire.receiveShadow = true; scene.add(aire);

  let decor: THREE.Group | null = null;
  let ferme = false;
  let amb: Ambiance = 'crepuscule';
  const appliquer = (a: Ambiance) => {
    amb = a;
    const p = AMB[a];
    (ciel.material as THREE.ShaderMaterial).uniforms.haut.value.set(p.haut);
    (ciel.material as THREE.ShaderMaterial).uniforms.horizon.value.set(p.horizon);
    scene.fog = new THREE.Fog(ferme ? '#1a1816' : p.brouillard, ferme ? 14 : 18, ferme ? 40 : 55);
    hemi.intensity = ferme ? p.hemi * 0.45 + 0.15 : p.hemi; hemi.color.set(p.horizon).lerp(new THREE.Color('#ffffff'), 0.5);
    soleil.color.set(p.soleil); soleil.intensity = ferme ? 0.25 : p.intSoleil; soleil.position.set(...p.pos);
    ciel.visible = !ferme;
  };
  return {
    appliquer,
    lieu(l) {
      if (decor) { scene.remove(decor); decor.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material | undefined)?.dispose?.(); }); }
      const r = construireLieu(l);
      decor = r.g; ferme = r.ferme; scene.add(decor);
      solMat.map?.dispose(); solMat.map = SOLS[l](); solMat.needsUpdate = true;
      aire.visible = r.aire;
      appliquer(amb);
    },
  };
}
