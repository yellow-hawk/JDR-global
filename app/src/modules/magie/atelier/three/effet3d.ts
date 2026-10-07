// Effets 3D des sorts : un émetteur par forme (Rameau), réglé par l'élément (Cœur) et les Nœuds.
import * as THREE from 'three';
import type { Analyse } from '../engine/analyse';
import type { Element, Particule, Valeurs } from '../engine/effets';
import type { Sceau } from '../engine/types';
import type { Nuage } from './particules';
import { centreCible, pousser, reagir, type Cible, type Fx } from './cibles';
import type { Banc } from './banc';

export interface Env {
  scene: THREE.Scene;
  nuage: Nuage;
  banc: Banc;
  fx: Fx;
  cle: string; // clé de l'élément (« braise », « braise~ »…)
  lumiere: THREE.PointLight;
  sceau: Sceau;
  analyse: Analyse;
  element: Element;
  valeurs: Valeurs;
  Rw: number; // rayon du sceau en mètres (monde)
  reduit: boolean;
}

export interface Effet { update(dt: number): boolean; dispose(): void; duree: number }

interface Style { size: number; grow: number; grav: number; drag: number; vie: number; varie: number }
const STYLES: Record<Particule, Style> = {
  flamme: { size: 0.22, grow: -0.12, grav: -1.6, drag: 0.98, vie: 0.9, varie: 0.5 },
  givre: { size: 0.14, grow: 0, grav: 0.3, drag: 0.98, vie: 1.4, varie: 0.4 },
  goutte: { size: 0.13, grow: 0, grav: 4, drag: 1, vie: 1.2, varie: 0.15 },
  poussiere: { size: 0.3, grow: 0.25, grav: 0.2, drag: 0.96, vie: 1.8, varie: 0.2 },
  roche: { size: 0.22, grow: 0, grav: 6, drag: 1, vie: 1.4, varie: 0.25 },
  vent: { size: 0.15, grow: 0, grav: 0, drag: 1, vie: 1.2, varie: 0.2 },
  brume: { size: 0.55, grow: 0.35, grav: 0, drag: 0.97, vie: 2.2, varie: 0.1 },
  lueur: { size: 0.16, grow: 0, grav: -0.2, drag: 0.99, vie: 1.3, varie: 0.25 },
  ombre: { size: 0.5, grow: 0.2, grav: 0, drag: 0.97, vie: 1.8, varie: 0.1 },
  eclat: { size: 0.15, grow: -0.02, grav: 0, drag: 0.98, vie: 1.2, varie: 0.4 },
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export function creerEffet(env: Env): Effet {
  const { scene, nuage, banc, fx, cle, lumiere, sceau, analyse: A, element: el, valeurs: V, Rw } = env;
  const support = banc.support;
  const base = new THREE.Color(A.coeur!.couleur);
  const st = STYLES[el.particule];
  nuage.setSombre(!!el.sombre);
  const has = (id: string, inv: boolean) => sceau.noeuds.some((n) => n.id === id && n.inv === inv);
  const T = Math.max(3.2, env.reduit ? 2.5 : A.dureeSecondes);
  const power = 0.5 + A.puissance / 8;
  const W = clamp(V.portee || 1.2, 1.2, 9);
  const Z = clamp(V.zone, 1, 6);
  const H = clamp(V.hauteur, 1, 4);
  const instable = A.stabilite < 60;
  const objets: THREE.Object3D[] = [];
  const ajouter = <T extends THREE.Object3D>(o: T) => { scene.add(o); objets.push(o); return o; };
  /** matière des murs et dômes selon l'élément : pierre pleine, glace, eau, ou énergie translucide */
  const matMur = (): THREE.Material => {
    if (el.particule === 'roche') return new THREE.MeshStandardMaterial({ color: base.clone().lerp(new THREE.Color('#9a958c'), 0.5), roughness: 0.95, flatShading: true, transparent: true, opacity: 0 });
    if (el.particule === 'givre') return new THREE.MeshStandardMaterial({ color: '#d6f0ff', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    if (el.particule === 'goutte') return new THREE.MeshStandardMaterial({ color: '#4f8fd0', roughness: 0.05, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    return matBrillant(0);
  };
  const opaciteMur = el.particule === 'roche' ? 0.97 : el.particule === 'givre' ? 0.6 : el.particule === 'goutte' ? 0.5 : el.sombre ? 0.6 : 0.3;
  const matBrillant = (op = 0.35) => new THREE.MeshBasicMaterial({ color: base, transparent: true, opacity: op, blending: el.sombre ? THREE.NormalBlending : THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });

  // directions dans le plan : haut de la feuille = -Z
  const horiz = (deg: number) => new THREE.Vector3(Math.sin((deg * Math.PI) / 180), 0, -Math.cos((deg * Math.PI) / 180));
  const dirs = A.direction.type === 'cote' ? [horiz(A.direction.angle)] : A.direction.type === 'axe' ? [horiz(A.direction.angle), horiz(A.direction.angle + 180)] : [];
  const radial = dirs.length === 0;
  const pick = () => dirs[Math.floor(Math.random() * dirs.length)];
  const tint = () => {
    const c = base.clone();
    if (el.particule === 'flamme') c.lerp(new THREE.Color('#ffe08a'), Math.random() * 0.6);
    else if (el.particule === 'roche' || el.particule === 'poussiere') c.lerp(new THREE.Color('#ffe2b8'), 0.25 + Math.random() * 0.3);
    else c.offsetHSL(0, 0, (Math.random() - 0.5) * st.varie);
    return c;
  };
  const spawn = (p: THREE.Vector3, v: THREE.Vector3, o: { vie?: number; size?: number; grav?: number; drag?: number; grow?: number } = {}) =>
    nuage.add({ x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z, max: o.vie ?? st.vie * rnd(0.7, 1.2), size: (o.size ?? st.size) * rnd(0.7, 1.3), grow: o.grow ?? st.grow, grav: o.grav ?? st.grav, drag: o.drag ?? st.drag }, tint());
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const disque = (r: number, c = V3()) => { const a = rnd(0, Math.PI * 2), d = Math.sqrt(Math.random()) * r; return V3(c.x + Math.cos(a) * d, c.y, c.z + Math.sin(a) * d); };
  const rate = (n: number, dt: number) => { const x = n * dt * power * (env.reduit ? 0.3 : 1); return Math.floor(x) + (Math.random() < x % 1 ? 1 : 0); };

  // ---- action sur les corps externes
  const douce = has('douce', false) ? 0.3 : has('douce', true) ? 1.6 : 1;
  const dosage = (k: number, dt: number) => k * dt * power * douce;
  const autorise = (c: Cible) => {
    const d = Math.hypot(c.g.position.x, c.g.position.z);
    if (has('fenetre', false)) return c === support;
    if (has('fenetre', true)) return d < Rw * 1.8;
    if (has('halo', true) && d < Rw * 0.8) return false;
    return true;
  };
  const cibles = () => banc.cibles.filter(autorise);
  const toucher = (c: Cible, q: number, dir?: THREE.Vector3) => reagir(c, cle, q, fx, dir);
  const accel = (c: Cible, a: THREE.Vector3, dt: number) => {
    if (!isFinite(c.masse) || c.e.lie > 0.5 || c.e.fige > 0.6 || c.e.petrifie > 0.8) return;
    c.vel.addScaledVector(a, dt * Math.max(0.12, Math.min(1.4, 35 / c.masse)));
    const v = Math.hypot(c.vel.x, c.vel.z); if (v > 5) { c.vel.x *= 5 / v; c.vel.z *= 5 / v; }
  };
  const plat = (c: Cible) => new THREE.Vector3(c.g.position.x, 0, c.g.position.z);
  /** dans un faisceau partant du centre */
  const dansFaisceau = (c: Cible, d: THREE.Vector3, larg: number, long: number) => {
    const v = plat(c); const proj = v.dot(d);
    if (proj < 0 || proj > long) return false;
    return v.clone().sub(d.clone().multiplyScalar(proj)).length() < larg + c.r;
  };
  const dansCone = (c: Cible, d: THREE.Vector3, demiAngle: number, long: number) => {
    const v = plat(c); const l = v.length();
    if (l > long) return false;
    return l < 0.01 || v.normalize().dot(d) > Math.cos(demiAngle);
  };
  const dist = (c: Cible, p = new THREE.Vector3()) => plat(c).distanceTo(p.clone().setY(0));
  // zone (Halo / Refuge)
  if (has('halo', false) || has('halo', true)) {
    const g = has('halo', true) ? new THREE.RingGeometry(Rw * 0.7, Z, 64) : new THREE.CircleGeometry(Z, 64);
    const m = ajouter(new THREE.Mesh(g, matBrillant(0.07)));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.02;
    const bord = ajouter(new THREE.Mesh(new THREE.RingGeometry(Z - 0.04, Z, 96), matBrillant(0.6)));
    bord.rotation.x = -Math.PI / 2; bord.position.y = 0.025;
  }

  type Upd = (dt: number, t: number, k: number) => void; // k : intensité d'émission 0..1
  const ups: Upd[] = [];
  const acts: Upd[] = [];
  const formes = A.formes.slice(0, 3);
  let dome = 0;
  let mur: { centre: THREE.Vector3; normale: THREE.Vector3; larg: number } | null = null;
  if (!formes.length) {
    ups.push((dt, _t, k) => { for (let i = 0; i < rate(60 * k, dt); i++) spawn(disque(0.3, V3(0, 0.1, 0)), V3(rnd(-0.2, 0.2), rnd(0.5, 1.2), rnd(-0.2, 0.2))); });
    acts.push((dt, _t, k) => { for (const c of cibles()) if (dist(c) < Rw * 1.6) toucher(c, dosage(k, dt) * 0.8); });
  }

  for (const f of formes) {
    const n = f.nombre;
    switch (f.id + (f.inv ? '~' : '')) {
      case 'jet': ups.push((dt, _t, k) => {
        const sp = 7 * power;
        for (let i = 0; i < rate(220 * Math.min(n, 4) * k, dt); i++) {
          const d = radial ? V3(rnd(-0.06, 0.06), 1, rnd(-0.06, 0.06)).normalize() : pick().clone().add(V3(rnd(-0.06, 0.06), 0.08 + rnd(-0.04, 0.04), rnd(-0.06, 0.06))).normalize();
          spawn(disque(0.12, V3(0, 0.25, 0)), d.multiplyScalar(sp * rnd(0.85, 1.15)), { vie: (radial ? H * 2.2 : W) / sp, grav: 0, drag: 1, size: st.size * 1.6 });
        }
      });
      acts.push((dt, t, k) => {
        for (const c of cibles()) {
          if (radial) { if (dist(c) < Rw * 0.9) { toucher(c, dosage(k, dt) * 1.5, V3(0, 1, 0)); if (k > 0) c.lift = Math.min(H * 1.2, 0.4 + t * 1.5); else c.lift = null; } }
          else for (const d of dirs) if (dansFaisceau(c, d, 0.25 + V.diam / 250, W)) toucher(c, dosage(k, dt) * 1.6 * Math.min(n, 4) / 2, d);
        }
      }); break;
      case 'jet~': ups.push((dt, _t, k) => {
        for (let i = 0; i < rate(160 * k, dt); i++) {
          const d = radial ? V3(rnd(-0.3, 0.3), 1, rnd(-0.3, 0.3)).normalize() : pick().clone().add(V3(0, 0.2, 0)).normalize();
          const from = d.clone().multiplyScalar(W).add(disque(0.6)); from.y += 0.3;
          const v = from.clone().sub(V3(0, 0.3, 0)).multiplyScalar(-1 / 0.9);
          spawn(from, v, { vie: 0.9, grav: 0, drag: 1, grow: -0.1 });
        }
      });
      acts.push((dt, _t, k) => { for (const c of cibles()) { const dd = dist(c); if (dd < W + 1 && dd > 0.3 && (radial || dirs.some((d) => dansCone(c, d, 0.6, W + 1)))) { accel(c, plat(c).normalize().multiplyScalar(-6 * k * power), dt); toucher(c, dosage(k, dt) * 0.6); } } }); break;
      case 'pluie': case 'pluie~': {
        const C = radial ? V3() : pick().clone().multiplyScalar(W * 0.6);
        const up = f.inv;
        ups.push((dt, _t, k) => {
          for (let i = 0; i < rate(260 * k, dt); i++) {
            if (up) spawn(disque(Z, C), V3(rnd(-0.3, 0.3), rnd(4, 7), rnd(-0.3, 0.3)), { grav: 4, vie: 1.4, drag: 1 });
            else { const p = disque(Z, C); p.y = rnd(3.5, 4.5); spawn(p, V3(0.2, -rnd(7, 9), 0), { grav: 0, vie: p.y / 8, drag: 1, size: st.size * 0.7 }); }
          }
          if (!up) for (let i = 0; i < rate(25 * k, dt); i++) { const p = disque(Z * 1.1, C); p.y = rnd(4.3, 4.8); spawn(p, V3(rnd(-0.2, 0.2), 0, rnd(-0.2, 0.2)), { size: 0.7, grow: 0.2, grav: 0, vie: 1.6 }); }
        });
        acts.push((dt, _t, k) => { for (const c of cibles()) if (dist(c, C) < Z + c.r) { toucher(c, dosage(k, dt) * 1.2, up ? V3(0, 1, 0) : V3(0, -1, 0)); if (up && k > 0 && c.g.position.y < 0.01 && Math.random() < dt * 2) c.vel.y += 5 * power; } });
        break;
      }
      case 'gerbe': ups.push((dt, _t, k) => {
        for (let i = 0; i < rate(240 * k, dt); i++) {
          let h = radial ? horiz(rnd(0, 360)) : pick().clone().applyAxisAngle(V3(0, 1, 0), rnd(-1, 1));
          h = h.multiplyScalar(rnd(1.5, 3.5) * power).add(V3(0, rnd(2.5, 4.5), 0));
          spawn(V3(0, 0.2, 0), h, { grav: el.particule === 'flamme' || el.particule === 'brume' ? 1 : 6, vie: 1.4, drag: 0.99 });
        }
      });
      acts.push((dt, _t, k) => { const L = Math.max(3, W); for (const c of cibles()) { const dd = dist(c); if (dd < L && (radial || dirs.some((d) => dansCone(c, d, 1, L)))) toucher(c, dosage(k, dt) * (1.3 - dd / L), plat(c).normalize()); } }); break;
      case 'gerbe~': ups.push((dt, _t, k) => {
        for (let i = 0; i < rate(200 * k, dt); i++) {
          const from = horiz(rnd(0, 360)).multiplyScalar(W * rnd(0.8, 1.3)); from.y = rnd(0.1, 1.2);
          spawn(from, from.clone().sub(V3(0, 0.3, 0)).multiplyScalar(-1 / 1.1), { vie: 1.1, grav: 0, drag: 1 });
        }
      });
      acts.push((dt, _t, k) => { for (const c of cibles()) { const dd = dist(c); if (dd < W * 1.3 && dd > 0.4) { accel(c, plat(c).normalize().multiplyScalar(-3 * k), dt); toucher(c, dosage(k, dt) * 0.4); } } }); break;
      case 'plume': ups.push((dt, t, k) => {
        const portes = cibles().filter((c) => c === support || dist(c) < (has('halo', false) ? Z : Rw * 1.1));
        for (const c of portes) {
          c.lift = k > 0 ? Math.min(1, t / 1.5) * H * (c === support ? 1 : 0.6) + Math.sin(t * 2 + c.g.id) * 0.08 : null;
          toucher(c, dosage(k, dt) * 0.4);
          for (let i = 0; i < rate(50 * k, dt); i++) spawn(disque(0.35, V3(c.g.position.x, c.g.position.y - 0.05, c.g.position.z)), V3(rnd(-0.1, 0.1), rnd(-0.8, -0.3), rnd(-0.1, 0.1)), { grav: 0, vie: 0.9 });
        }
      }); break;
      case 'plume~': ups.push((dt, _t, k) => {
        for (let i = 0; i < rate(160 * k, dt); i++) { const p = disque(Z); p.y = rnd(1.5, 2.5); spawn(p, V3(0, -6, 0), { grav: 0, vie: p.y / 6, drag: 1 }); }
        for (const c of cibles()) if (dist(c) < Z) {
          if (k > 0) { c.lift = null; c.vel.y = Math.min(c.vel.y, -3); c.e.fige = Math.max(c.e.fige, 0.65 * k); c.corps.scale.y += (0.75 - c.corps.scale.y) * dt * 3; }
          else c.corps.scale.y += (1 - c.corps.scale.y) * dt * 3;
          toucher(c, dosage(k, dt) * 0.5);
        }
      }); break;
      case 'appel': ups.push((dt, _t, k) => {
        for (let i = 0; i < rate(160 * k, dt); i++) nuage.add({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, max: 1.6, size: st.size, grow: 0, drag: 1, grav: 0, orbit: { r: W * rnd(0.8, 1.2), a: rnd(0, 6.28), w: 2.4, dr: -W / 1.6, y: rnd(0.1, 0.8), vy: 0, cx: 0, cz: 0 } }, tint());
      });
      acts.push((dt, _t, k) => { for (const c of cibles()) { const dd = dist(c); if (dd < W * 1.2 && dd > Rw * 0.6) { const tg = V3(-c.g.position.z, 0, c.g.position.x).normalize(); accel(c, plat(c).normalize().multiplyScalar(-5 * k * power).addScaledVector(tg, 1.5 * k), dt); toucher(c, dosage(k, dt) * 0.7); } } }); break;
      case 'appel~': {
        const ring = ajouter(new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), matBrillant(0.5)));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05;
        ups.push((dt, t, k) => {
          const s = 0.3 + ((t * 2) % 1) * W; ring.scale.setScalar(s); (ring.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - ((t * 2) % 1)) * k;
          for (let i = 0; i < rate(200 * k, dt); i++) { const d = radial ? horiz(rnd(0, 360)) : pick().clone().applyAxisAngle(V3(0, 1, 0), rnd(-0.8, 0.8)); spawn(V3(0, 0.3, 0), d.multiplyScalar(rnd(6, 9) * power).add(V3(0, rnd(0, 1), 0)), { drag: 0.95, grav: 0, vie: 1 }); }
        });
        acts.push((dt, t, k) => { const front = 0.3 + ((t * 2) % 1) * W; for (const c of cibles()) { const dd = dist(c); if (Math.abs(dd - front) < 0.6 && k > 0 && (radial || dirs.some((d) => dansCone(c, d, 0.9, W + 1)))) { pousser(c, plat(c).normalize().multiplyScalar(Math.min(c.masse, 35) * 30 * power * dt).add(V3(0, Math.min(c.masse, 35) * 12 * dt, 0))); toucher(c, 1.2 * power * dt); } } });
        break;
      }
      case 'dard': {
        const projs: { p: THREE.Vector3; v: THREE.Vector3; vie: number }[] = [];
        let acc = 0;
        ups.push((dt, _t, k) => {
          acc += dt;
          if (acc > 0.35 && k > 0) {
            acc = 0;
            for (let i = 0; i < Math.min(n, 6); i++) {
              const d = radial ? horiz(rnd(0, 360)).add(V3(0, rnd(0.6, 1.4), 0)).normalize() : pick().clone().applyAxisAngle(V3(0, 1, 0), rnd(-0.12, 0.12)).add(V3(0, 0.06, 0)).normalize();
              projs.push({ p: V3(0, 0.6, 0), v: d.multiplyScalar(14 * power), vie: (W * 1.6) / (14 * power) });
            }
          }
          for (let i = projs.length - 1; i >= 0; i--) {
            const q = projs[i]; q.vie -= dt; q.p.addScaledVector(q.v, dt);
            const touche = cibles().find((c) => centreCible(c).distanceTo(q.p) < c.r * c.echelle + 0.25 || (c.type === 'flaque' && q.p.y < 0.3 && dist(c, q.p) < 0.9));
            if (touche) { toucher(touche, 0.3 * power * douce, q.v.clone().normalize()); pousser(touche, q.v.clone().normalize().multiplyScalar(touche.masse * 0.8 * power)); q.vie = 0; }
            spawn(q.p.clone(), V3(), { vie: 0.25, size: st.size * 2.2, grav: 0, grow: -0.6 });
            for (let j = 0; j < 3; j++) spawn(q.p.clone().add(V3(rnd(-0.05, 0.05), rnd(-0.05, 0.05), rnd(-0.05, 0.05))), q.v.clone().multiplyScalar(-0.05), { vie: 0.35, grav: 0 });
            if (q.vie <= 0) { for (let j = 0; j < 20; j++) spawn(q.p.clone(), V3(rnd(-2, 2), rnd(0, 3), rnd(-2, 2)), { vie: 0.6 }); projs.splice(i, 1); }
          }
        });
        break;
      }
      case 'dard~': {
        const geo = radial ? new THREE.SphereGeometry(Rw * 1.6, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2) : new THREE.SphereGeometry(Rw * 1.8, 32, 16, 0, Math.PI * 0.8, Math.PI * 0.15, Math.PI * 0.45);
        const m = ajouter(new THREE.Mesh(geo, matBrillant(0.0)));
        if (!radial) { const a = Math.atan2(dirs[0].x, dirs[0].z); m.rotation.y = a - Math.PI * 0.9 + Math.PI / 2; }
        const wire = ajouter(new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: base, transparent: true, opacity: 0 })));
        wire.rotation.copy(m.rotation);
        ups.push((_dt, t, k) => { (m.material as THREE.MeshBasicMaterial).opacity = 0.18 * Math.min(1, t * 2) * (0.4 + 0.6 * k); (wire.material as THREE.LineBasicMaterial).opacity = 0.35 * Math.min(1, t * 2) * (0.4 + 0.6 * k); });
        break;
      }
      case 'etau': {
        const core = ajouter(new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: base, emissive: base, emissiveIntensity: 1.2, roughness: 0.3 })));
        core.position.y = 1.1;
        ups.push((dt, t, k) => {
          core.scale.setScalar(0.05 + Math.min(1, t / 2) * clamp(V.diam / 300, 0.12, 0.45)); core.rotation.y += dt;
          for (let i = 0; i < rate(220 * k, dt); i++) { const d = V3(rnd(-1, 1), rnd(-0.6, 1), rnd(-1, 1)).normalize(); const from = d.multiplyScalar(Z).add(V3(0, 1.1, 0)); spawn(from, V3(0, 1.1, 0).sub(from).multiplyScalar(1 / 0.7), { vie: 0.7, grav: 0, drag: 1 }); }
        });
        acts.push((dt, _t, k) => { for (const c of cibles()) { const dd = dist(c); if (dd < Z) { if (dd > 0.5) accel(c, plat(c).normalize().multiplyScalar(-2.5 * k), dt); if (k > 0) c.echelleCible = Math.max(0.6, c.echelleCible - dt * 0.15); toucher(c, dosage(k, dt) * 0.7); } } });
        break;
      }
      case 'etau~': ups.push((dt, _t, k) => {
        for (let i = 0; i < rate(50 * k, dt); i++) { const d = horiz(rnd(0, 360)); spawn(V3(0, rnd(0.2, 1), 0), d.multiplyScalar(rnd(0.6, 1.4)).add(V3(0, rnd(-0.05, 0.2), 0)), { size: 0.9, grow: 0.6, vie: 3, grav: 0, drag: 0.995 }); }
      });
      acts.push((dt, _t, k) => { for (const c of cibles()) if (dist(c) < Z * 2) toucher(c, dosage(k, dt) * 0.3); }); break;
      case 'rempart': case 'rempart~': {
        let mesh: THREE.Mesh;
        const breche = f.inv;
        if (radial && !breche) {
          mesh = ajouter(new THREE.Mesh(new THREE.SphereGeometry(Math.min(Z, 4.5), 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), matMur()));
          dome = Math.min(Z, 4.5);
          acts.push((dt, _t, k) => { for (const c of cibles()) { const dd = dist(c); if (Math.abs(dd - dome) < 0.5 + c.r) { accel(c, plat(c).normalize().multiplyScalar(6 * k), dt); toucher(c, dosage(k, dt) * 0.8); } } });
          const fil = ajouter(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(Math.min(Z, 4.5), 24, 10, 0, Math.PI * 2, 0, Math.PI / 2)), new THREE.LineBasicMaterial({ color: base, transparent: true, opacity: 0 })));
          ups.push(() => { (fil.material as THREE.LineBasicMaterial).opacity = (mesh.material as THREE.MeshBasicMaterial).opacity * 1.6; });
        } else {
          const d = radial ? horiz(0) : dirs[0];
          const g = new THREE.Group();
          const larg = Z * 2, ep = clamp(V.epaisseur / 100, 0.12, 0.6);
          const trou = breche ? clamp(V.diam / 100, 0.6, 1.6) : 0;
          for (const s of breche ? [-1, 1] : [0]) {
            const w = breche ? (larg - trou) / 2 : larg;
            const b = new THREE.Mesh(new THREE.BoxGeometry(w, H, ep, 6, 4, 1), matMur()); b.castShadow = el.particule === 'roche';
            b.position.set(s * (trou / 2 + w / 2), H / 2, 0);
            g.add(b);
          }
          g.position.copy(d.clone().multiplyScalar(clamp(W / 2, 1.4, 5)));
          g.rotation.y = Math.atan2(d.x, d.z);
          ajouter(g);
          mesh = g.children[0] as THREE.Mesh;
          ups.push(() => { g.children.forEach((c) => { ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = ((mesh.material as THREE.MeshStandardMaterial).opacity); }); });
          if (breche) {
            ups.push((dt, _t, k) => { for (let i = 0; i < rate(120 * k, dt); i++) spawn(V3(0, 0.6, 0), d.clone().multiplyScalar(rnd(5, 8)).add(V3(rnd(-0.4, 0.4), rnd(0, 0.6), rnd(-0.4, 0.4))), { vie: 1, grav: 0 }); });
            acts.push((dt, _t, k) => { for (const c of cibles()) if (dansFaisceau(c, d, 0.5, 9)) { c.e.degats += dt * 1.5 * k * power; toucher(c, dosage(k, dt) * 0.5, d); } });
          } else {
            mur = { centre: g.position.clone(), normale: d.clone(), larg: larg / 2 };
            acts.push((dt, _t, k) => { for (const c of cibles()) { const v = plat(c).sub(g.position); const dn = v.dot(d); const lat = Math.abs(v.dot(V3(-d.z, 0, d.x))); if (Math.abs(dn) < 0.6 + c.r && lat < larg / 2) { accel(c, d.clone().multiplyScalar(Math.sign(dn || 1) * 8 * k), dt); toucher(c, dosage(k, dt) * 0.8); } } });
          }
        }
        ups.push((dt, t, k) => {
          const op = Math.min(1, t / 1.2) * (radial && !breche && el.particule !== 'roche' && el.particule !== 'givre' && el.particule !== 'goutte' ? 0.14 : opaciteMur) * (k > 0 || t < T ? 1 : 0.5);
          (mesh.material as THREE.MeshBasicMaterial).opacity = op;
          if (radial && !breche) for (let i = 0; i < rate(120 * k, dt); i++) { const a = rnd(0, 6.28), ph = Math.acos(rnd(0, 1)); const Zd = Math.min(Z, 4.5); const p = V3(Math.cos(a) * Math.sin(ph) * Zd, Math.cos(ph) * Zd, Math.sin(a) * Math.sin(ph) * Zd); spawn(p, V3(0, 0.3, 0), { vie: 0.8, grav: 0 }); }
        });
        break;
      }
      case 'tourbillon': ups.push((dt, _t, k) => {
        for (let i = 0; i < rate(420 * k, dt); i++) nuage.add({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, max: 2, size: st.size, grow: 0, drag: 1, grav: 0, orbit: { r: rnd(0.15, 0.5), a: rnd(0, 6.28), w: rnd(4, 6) * power, dr: Z * 0.35, y: 0.05, vy: H / 2, cx: 0, cz: 0 } }, tint());
      });
      acts.push((dt, t, k) => {
        for (const c of cibles()) {
          const dd = dist(c); if (dd > Z * 1.2) continue;
          const tg = V3(-c.g.position.z, 0, c.g.position.x).normalize();
          accel(c, tg.multiplyScalar(4 * k * power).addScaledVector(plat(c).normalize(), -2.5 * k), dt);
          if (c.masse <= 45 && k > 0) { c.lift = Math.min(H, 0.3 + t * 0.6); c.corps.rotation.y += dt * 6; } else if (k === 0) c.lift = null;
          toucher(c, dosage(k, dt) * 0.8, tg);
        }
      }); break;
      case 'tourbillon~': ups.push((dt, t, k) => {
        if (t < 0.5) for (let i = 0; i < rate(600, dt); i++) { const p = disque(Z); p.y = rnd(0.2, 2); spawn(p, V3(rnd(-4, 4), rnd(-1, 2), rnd(-4, 4)), { drag: 0.9, grav: 0, vie: 3 }); }
        for (const c of cibles()) if (dist(c) < Z * 2) {
          c.vel.multiplyScalar(Math.max(0, 1 - dt * 3 * k)); c.e.anime = Math.max(0, c.e.anime - dt * k);
          c.e.feu = Math.max(0, c.e.feu - dt * 0.5 * k);
          if (c.type === 'tourniquet') c.x.vitesse = Math.max(0, c.x.vitesse - dt * 3 * k);
          if (c.type === 'brasero') c.x.allume = Math.max(0.3, c.x.allume - dt * 0.4 * k);
          toucher(c, dosage(k, dt) * 0.3);
        }
      }); break;
      case 'figure': case 'figure~': {
        const bird = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: base, emissive: base, emissiveIntensity: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
        const body = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 8), mat); body.rotation.x = Math.PI / 2; bird.add(body);
        const wingG = new THREE.BufferGeometry(); wingG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.15, 0, 0, -0.2, 0.9, 0, 0.05], 3)); wingG.computeVertexNormals();
        const wl = new THREE.Mesh(wingG, mat), wr = new THREE.Mesh(wingG, mat); wr.scale.x = -1; bird.add(wl, wr);
        const s = clamp(A.puissance / 4, 0.8, 2.2); bird.scale.setScalar(s);
        ajouter(bird);
        const dissout = f.inv;
        let explose = false;
        // la créature chasse les cibles une à une ; en Dissolution, une créature ennemie arrive et se défait
        const proies = () => cibles().filter((c) => c !== banc.protege && (radial || dirs.some((d) => dansCone(c, d, 1.2, 12)))).sort((a, b) => dist(a) - dist(b));
        let proie: Cible | null = null; let attaque = 0;
        const pos = dissout ? V3(0, 1.6, 0).add((radial ? horiz(130) : pick()).multiplyScalar(9)) : V3(0, 1.4, 0);
        const vit = V3();
        ups.push((dt, t, k) => {
          let but: THREE.Vector3;
          if (dissout) but = V3(0, 1.5, 0);
          else {
            if (!proie || attaque > 1.4) { const l = proies(); proie = l.length ? l[Math.floor(t / 1.6) % l.length] : null; attaque = 0; }
            but = proie ? centreCible(proie) : V3(Math.sin(t) * 2, 1.8, Math.cos(t) * 2);
          }
          const vers = but.clone().sub(pos); const L = vers.length();
          vit.lerp(vers.normalize().multiplyScalar(dissout ? 3 : 7 * power), Math.min(1, dt * 3));
          pos.addScaledVector(vit, dt);
          bird.position.copy(pos); bird.lookAt(pos.clone().add(vit));
          const flap = Math.sin(t * 12) * 0.6; wl.rotation.z = flap; wr.rotation.z = -flap;
          if (!dissout) {
            for (let i = 0; i < rate(80 * k, dt); i++) spawn(pos.clone().add(V3(rnd(-0.1, 0.1), rnd(-0.1, 0.1), rnd(-0.1, 0.1))), V3(0, -0.2, 0), { vie: 0.7, grav: 0 });
            if (proie && L < proie.r + 0.4) { attaque += dt; toucher(proie, dosage(k, dt) * 2.5, vit.clone().normalize()); if (attaque < dt * 1.5) pousser(proie, vit.clone().normalize().multiplyScalar(proie.masse * 1.5)); }
            bird.visible = k > 0 || t < T;
          } else if (L < Rw * 2.2 && !explose && t > 0.5) {
            explose = true; bird.visible = false;
            for (let i = 0; i < 400; i++) spawn(pos.clone(), V3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(1, 5)), { drag: 0.96, grav: 0.5, vie: 2 });
            for (const c of banc.cibles) { c.e.feu = 0; }
          }
        });
        break;
      }
      case 'tisse': {
        const nb = Math.max(2, Math.min(n * 2, 6));
        const tubes: THREE.Mesh[] = [];
        const mat = new THREE.MeshStandardMaterial({ color: base, emissive: base, emissiveIntensity: 0.6, side: THREE.DoubleSide, roughness: 0.5 });
        for (let i = 0; i < nb; i++) tubes.push(ajouter(new THREE.Mesh(new THREE.BufferGeometry(), mat)));
        const liees = cibles().filter((c) => dist(c) < Math.max(3, W) + 0.5 && (radial || dirs.some((d) => dansCone(c, d, 0.9, 12)))).sort((a, b) => dist(a) - dist(b)).slice(0, nb);
        acts.push((dt, t, k) => { liees.forEach((c) => { if (t > 1.5 && k > 0) { if (c.e.lie < 0.05) c.liens.children.forEach((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial; m.color.copy(base); m.emissive.copy(base); }); c.e.lie = Math.min(1, c.e.lie + dt * 1.5); toucher(c, dosage(k, dt) * 0.4); if (dist(c) > Rw + 0.8) accel(c, plat(c).normalize().multiplyScalar(-1.5), dt); } }); });
        ups.push((_dt, t) => {
          tubes.forEach((m, i) => {
            const cible = liees[i];
            const d = cible ? plat(cible).normalize() : radial ? horiz((i * 360) / nb + t * 20) : pick().clone().applyAxisAngle(V3(0, 1, 0), (i - nb / 2) * 0.18);
            const L = Math.min(1, t / 1.5) * (cible ? dist(cible) : W);
            const lat = V3(-d.z, 0, d.x);
            const pts: THREE.Vector3[] = [];
            for (let j = 0; j <= 30; j++) { const u = j / 30; pts.push(d.clone().multiplyScalar(u * L).addScaledVector(lat, Math.sin(u * 8 - t * 5 + i) * 0.25 * u).add(V3(0, 0.3 + Math.sin(u * 5 + t * 3 + i) * 0.25 * u + u * 0.5, 0))); }
            m.geometry.dispose();
            m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.035, 5, false);
          });
        });
        break;
      }
      case 'tisse~': {
        const shards: THREE.Mesh[] = [];
        const mat = new THREE.MeshStandardMaterial({ color: base.clone().lerp(new THREE.Color('#ffffff'), 0.5), emissive: base, emissiveIntensity: 0.3, roughness: 0.15, metalness: 0.3, flatShading: true });
        for (let i = 0; i < 9; i++) { const m = ajouter(new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), mat)); const a = (i / 9) * Math.PI * 2; m.position.set(Math.cos(a) * 0.55, 0.15, Math.sin(a) * 0.55); m.rotation.set(rnd(-0.4, 0.4), a, rnd(-0.4, 0.4)); m.scale.set(0.001, 0.001, 0.001); shards.push(m); }
        const vise = support ?? cibles().sort((a, b) => dist(a) - dist(b))[0];
        if (vise) shards.forEach((m, i) => { const a = (i / 9) * Math.PI * 2; m.position.set(vise.g.position.x + Math.cos(a) * (vise.r + 0.15), 0.15, vise.g.position.z + Math.sin(a) * (vise.r + 0.15)); });
        let brise = false;
        ups.push((dt, t, k) => {
          shards.forEach((m, i) => { const s = clamp((t - i * 0.08) / 0.8, 0, 1); m.scale.set(0.08 * s, 0.35 * s, 0.08 * s); });
          if (vise) { vise.e.petrifie = Math.max(vise.e.petrifie, Math.min(0.55, t * 0.3)); vise.e.gel = Math.max(vise.e.gel, Math.min(0.5, t * 0.25)); toucher(vise, dosage(k, dt) * 0.3);
            if (t > 2.4 && !brise && vise.morceaux.length) { brise = true; vise.e.degats = 2; fx('etincelle', centreCible(vise), 10); } }
        });
        break;
      }
      case 'ampleur': case 'ampleur~': {
        const cible = f.inv ? 1 / Math.min(V.mult, 4) : Math.min(V.mult, 3);
        const vise = support ?? cibles().filter((c) => radial || dirs.some((d) => dansCone(c, d, 0.6, 12))).sort((a, b) => dist(a) - dist(b))[0];
        ups.push((dt, t, k) => {
          if (vise) { vise.echelleCible = 1 + (cible - 1) * Math.min(1, t / 1.5); toucher(vise, dosage(k, dt) * 0.3); }
          for (let i = 0; i < rate(60 * k, dt); i++) { const d = horiz(rnd(0, 360)); spawn(d.clone().multiplyScalar(f.inv ? 1.2 : 0.3).add(V3(0, 0.1, 0)), d.multiplyScalar(f.inv ? -1 : 1.5), { vie: 0.8, grav: 0 }); }
        });
        break;
      }
    }
  }

  // ---- volées de flèches ennemies pour juger les défenses (Rempart, Parade)
  const bouclier = formes.some((f) => (f.id === 'rempart' && !f.inv) || (f.id === 'dard' && f.inv));
  const fleches: { o: THREE.Group; v: THREE.Vector3; morte: boolean; vie: number }[] = [];
  let tFleche = 0;
  const geoF = new THREE.CylinderGeometry(0.012, 0.012, 0.7, 4); geoF.rotateX(Math.PI / 2);
  const geoP = new THREE.ConeGeometry(0.03, 0.1, 6); geoP.rotateX(Math.PI / 2); geoP.translate(0, 0, 0.4);
  const matF = new THREE.MeshStandardMaterial({ color: '#7a5a38' }), matP = new THREE.MeshStandardMaterial({ color: '#555', metalness: 0.6 });
  const tirer = () => {
    const a = radial ? rnd(0, 360) : (A.direction.angle + rnd(-25, 25));
    const de = horiz(a).multiplyScalar(11).add(V3(0, 1.6, 0));
    const vise = V3(rnd(-0.3, 0.3), 1.1, rnd(-0.3, 0.3));
    const o = new THREE.Group(); o.add(new THREE.Mesh(geoF, matF), new THREE.Mesh(geoP, matP)); o.position.copy(de);
    const v = vise.sub(de).normalize().multiplyScalar(14); o.lookAt(o.position.clone().add(v));
    ajouter(o); fleches.push({ o, v, morte: false, vie: 3 });
  };
  const fleches_maj = (dt: number, k: number) => {
    if (!bouclier) return;
    tFleche += dt; if (tFleche > 0.45 && tFleche < 99 && k > 0) { tFleche = 0; tirer(); }
    for (const f of fleches) {
      f.vie -= dt; if (f.vie < 0) { f.o.visible = false; continue; }
      if (!f.morte) {
        const avant = f.o.position.clone();
        f.o.position.addScaledVector(f.v, dt);
        const d = Math.hypot(f.o.position.x, f.o.position.z);
        let bloque = false;
        if (dome > 0 && d < dome && Math.hypot(avant.x, avant.z) >= dome) bloque = true;
        if (mur) { const da = avant.clone().setY(0).sub(mur.centre).dot(mur.normale), db = f.o.position.clone().setY(0).sub(mur.centre).dot(mur.normale); const lat = Math.abs(f.o.position.clone().setY(0).sub(mur.centre).dot(V3(-mur.normale.z, 0, mur.normale.x))); if (da * db < 0 && lat < mur.larg) bloque = true; }
        if (formes.some((x) => x.id === 'dard' && x.inv) && d < Rw * 1.7 && Math.hypot(avant.x, avant.z) >= Rw * 1.7 && (radial || f.v.clone().setY(0).normalize().dot(dirs[0]) < -0.5)) bloque = true;
        if (bloque && k > 0) { f.morte = true; f.v.multiplyScalar(-0.15).add(V3(rnd(-1, 1), 1.5, rnd(-1, 1))); for (let j = 0; j < 12; j++) spawn(f.o.position.clone(), V3(rnd(-2, 2), rnd(0, 2), rnd(-2, 2)), { vie: 0.4, grav: 0 }); }
        else if (f.o.position.y < 1.2 && d < 0.4) { f.morte = true; f.v.set(0, 0, 0); if (banc.protege) pousser(banc.protege, V3(0, 0, 0)); }
      } else { f.v.y -= 9.8 * dt; f.o.position.addScaledVector(f.v, dt); f.o.rotation.x += dt * 5; if (f.o.position.y < 0.02) { f.o.position.y = 0.02; f.v.set(0, 0, 0); } }
    }
  };

  // ---- Guet : le sort attend qu'un intrus s'approche
  const intrus = banc.intrus;
  let declenche = !intrus || !has('guet', false);
  let t0 = 0;

  // rythme : Écho (pulsations), Retenue (charge puis décharge), instabilité
  const nEcho = sceau.noeuds.filter((x) => x.id === 'echo' && !x.inv).length;
  const retenue = has('echo', true);
  let t = 0;
  const fin = T + 2.5;
  return {
    duree: fin,
    update(dt) {
      if (!declenche) {
        t0 += dt;
        lumiere.intensity = 0.6 + Math.sin(t0 * 6) * 0.4;
        if (intrus && !intrus.marche) { declenche = true; fx('etincelle', V3(0, 0.3, 0), 12); }
        else return t0 < 12;
      }
      t += dt;
      let k = t < T ? 1 : 0;
      if (nEcho) k *= Math.sin((t / T) * Math.PI * 2 * (nEcho + 1)) > 0 ? 1 : 0.05;
      if (retenue) k *= t > T * 0.6 ? 2.5 : 0;
      if (instable && Math.random() < 0.3) k *= 0.1;
      const tt = retenue ? Math.max(0, t - T * 0.6) : t;
      ups.forEach((u) => u(dt, tt, k));
      acts.forEach((u) => u(dt, tt, k));
      fleches_maj(dt, k);
      const fade = Math.min(1, (fin - t) / 1.5);
      nuage.update(dt, Math.max(0, fade), instable ? 0.03 : 0);
      lumiere.intensity = (t < T ? 6 + Math.sin(t * 20) * (instable ? 3 : 0.4) : 6 * Math.max(0, fade)) * power;
      return t < fin;
    },
    dispose() {
      objets.forEach((o) => { scene.remove(o); o.traverse((c) => { const m = c as THREE.Mesh; m.geometry?.dispose(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose(); }); });
      nuage.clear(); nuage.update(0, 0, 0);
      lumiere.intensity = 0;
      geoF.dispose(); geoP.dispose(); matF.dispose(); matP.dispose();
      for (const c of banc.cibles) c.lift = null;
    },
  };
}
