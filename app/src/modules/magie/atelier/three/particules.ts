import * as THREE from 'three';

export interface Part {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; max: number;
  size: number; grow: number;
  drag: number; grav: number;
  r: number; g: number; b: number;
  orbit?: { r: number; a: number; w: number; dr: number; y: number; vy: number; cx: number; cz: number };
  wave?: number;
}

const VERT = `
attribute float size;
attribute float alpha;
attribute vec3 color;
varying float vA;
varying vec3 vC;
void main() {
  vA = alpha; vC = color;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(3.0, size * (360.0 / -mv.z));
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
varying float vA;
varying vec3 vC;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.15, d);
  gl_FragColor = vec4(vC, a * vA);
}`;

/** Nuage de particules CPU rendu en un seul Points */
export class Nuage {
  readonly points: THREE.Points;
  readonly parts: Part[] = [];
  private pos: Float32Array; private col: Float32Array; private siz: Float32Array; private alp: Float32Array;
  constructor(private max = 5000) {
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3);
    this.siz = new Float32Array(max); this.alp = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(this.siz, 1));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alp, 1));
    const m = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
  }
  setSombre(sombre: boolean) {
    const m = this.points.material as THREE.ShaderMaterial;
    m.blending = sombre ? THREE.NormalBlending : THREE.AdditiveBlending;
    m.needsUpdate = true;
  }
  add(p: Partial<Part> & { x: number; y: number; z: number }, c: THREE.Color) {
    if (this.parts.length >= this.max) return;
    this.parts.push({ vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 0.12, grow: 0, drag: 1, grav: 0, r: c.r, g: c.g, b: c.b, ...p });
  }
  clear() { this.parts.length = 0; }
  update(dt: number, fade: number, jitter: number) {
    const ps = this.parts;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life += dt;
      if (p.life > p.max) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
      if (p.orbit) {
        const o = p.orbit;
        o.a += o.w * dt; o.r = Math.max(0, o.r + o.dr * dt); o.y += o.vy * dt;
        p.x = o.cx + Math.cos(o.a) * o.r; p.z = o.cz + Math.sin(o.a) * o.r; p.y = o.y;
      } else {
        const d = Math.pow(p.drag, dt * 60);
        p.vx *= d; p.vy = p.vy * d - p.grav * dt; p.vz *= d;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.wave !== undefined) { p.y += Math.sin(p.life * 9 + p.wave) * 0.02; }
        if (jitter) { p.x += (Math.random() - 0.5) * jitter; p.z += (Math.random() - 0.5) * jitter; }
        if (p.y < 0 && p.grav > 0) { p.y = 0; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
      }
      p.size = Math.max(0.01, p.size + p.grow * dt);
    }
    const n = ps.length;
    for (let i = 0; i < n; i++) {
      const p = ps[i];
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.col[i * 3] = p.r; this.col[i * 3 + 1] = p.g; this.col[i * 3 + 2] = p.b;
      this.siz[i] = p.size;
      const t = p.life / p.max;
      this.alp[i] = Math.min(1, t * 8) * (1 - t) * fade;
    }
    const g = this.points.geometry;
    g.setDrawRange(0, n);
    (['position', 'color', 'size', 'alpha'] as const).forEach((k) => { (g.getAttribute(k) as THREE.BufferAttribute).needsUpdate = true; });
  }
}
