// Corps externes du banc d'essai : mannequins, caisses, tonneau, arbre, brasero, flaque, pilier…
// Chaque cible a un état (brûlé, gelé, mouillé, pétrifié…) que les sorts modifient, et une physique simple.
import * as THREE from 'three';

export type TypeCible = 'mannequin' | 'caisse' | 'tonneau' | 'arbre' | 'brasero' | 'flaque' | 'pilier' | 'tourniquet' | 'coffre' | 'gemme';

export interface Etat {
  feu: number; gel: number; mouille: number; brule: number; usure: number; petrifie: number;
  lumiere: number; ombre: number; invisible: number; lie: number; anime: number; revele: number;
  degats: number; croissance: number; fletri: number; transfo: number; esprit: number; souvenir: number; fige: number;
}
const etatVide = (): Etat => ({ feu: 0, gel: 0, mouille: 0, brule: 0, usure: 0, petrifie: 0, lumiere: 0, ombre: 0, invisible: 0, lie: 0, anime: 0, revele: 0, degats: 0, croissance: 0, fletri: 0, transfo: 0, esprit: 0, souvenir: 0, fige: 0 });

interface Morceau { m: THREE.Mesh; repos: THREE.Vector3; rot0: THREE.Euler; vel: THREE.Vector3; spin: THREE.Vector3 }

export interface Cible {
  type: TypeCible;
  g: THREE.Group;          // racine (position au sol)
  corps: THREE.Group;      // pivot de bascule
  mats: { m: THREE.MeshStandardMaterial; base: THREE.Color; emis: THREE.Color }[];
  masse: number;           // Infinity = fixe
  h: number;               // hauteur
  r: number;               // rayon
  vel: THREE.Vector3;
  e: Etat;
  lift: number | null;     // hauteur visée (lévitation)
  echelle: number; echelleCible: number;
  tilt: number; tiltAxe: THREE.Vector3;
  coque: THREE.Mesh;       // gangue de glace
  liens: THREE.Group;      // anneaux de lien
  halo: THREE.Mesh;        // contour « révélé »
  morceaux: Morceau[];     // débris (caisse cassée, pilier effondré…)
  trace: THREE.Mesh;       // marque au sol (brûlure, givre, flaque)
  casse: boolean;
  x: Record<string, any>;  // références propres au type
  marche?: { de: THREE.Vector3; vers: THREE.Vector3; t: number; duree: number };
}

const mat = (c: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });

function enregistrer(cible: Omit<Cible, 'mats'> & { mats?: Cible['mats'] }): Cible {
  const mats: Cible['mats'] = [];
  cible.corps.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; }
    if (m && m.isMeshStandardMaterial && !mats.some((x) => x.m === m) && !m.userData.fixe) { m.transparent = true; mats.push({ m, base: m.color.clone(), emis: m.emissive.clone() }); }
  });
  return { ...cible, mats } as Cible;
}

function enveloppes(corps: THREE.Group, h: number, r: number) {
  const coque = new THREE.Mesh(new THREE.CapsuleGeometry(r * 1.15, Math.max(0.01, h - 2 * r), 6, 14), new THREE.MeshStandardMaterial({ color: '#dff3ff', transparent: true, opacity: 0, roughness: 0.05, metalness: 0.1, depthWrite: false }));
  coque.position.y = h / 2; (coque.material as THREE.Material).userData.fixe = true; corps.add(coque);
  const liens = new THREE.Group();
  for (const y of [0.3, 0.6]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r * 1.2, 0.035, 6, 24), new THREE.MeshStandardMaterial({ color: '#ff8fc7', emissive: '#ff4fa0', emissiveIntensity: 0.8 })); t.rotation.x = Math.PI / 2; t.position.y = h * y; (t.material as THREE.Material).userData.fixe = true; liens.add(t); }
  liens.visible = false; corps.add(liens);
  const halo = new THREE.Mesh(new THREE.CapsuleGeometry(r * 1.3, Math.max(0.01, h - 2 * r), 6, 14), new THREE.MeshBasicMaterial({ color: '#7ff6ff', transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false }));
  halo.position.y = h / 2; corps.add(halo);
  return { coque, liens, halo };
}

function base(type: TypeCible, corps: THREE.Group, masse: number, h: number, r: number, x: Record<string, any> = {}, morceaux: Morceau[] = []): Cible {
  const g = new THREE.Group(); g.add(corps);
  const env = enveloppes(corps, h, r);
  const trace = new THREE.Mesh(new THREE.CircleGeometry(r * 2.2, 20), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0, depthWrite: false }));
  trace.rotation.x = -Math.PI / 2; trace.position.y = 0.008;
  return enregistrer({ type, g, corps, masse, h, r, vel: new THREE.Vector3(), e: etatVide(), lift: null, echelle: 1, echelleCible: 1, tilt: 0, tiltAxe: new THREE.Vector3(1, 0, 0), ...env, morceaux, casse: false, x, trace });
}

const mesh = (geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; };
const morceau = (m: THREE.Mesh): Morceau => ({ m, repos: m.position.clone(), rot0: m.rotation.clone(), vel: new THREE.Vector3(), spin: new THREE.Vector3() });

export function creerCible(type: TypeCible): Cible {
  const c = new THREE.Group();
  switch (type) {
    case 'mannequin': {
      const bois = mat('#6b4a2b'), paille = mat('#c9a45c', { roughness: 1 }), toile = mat('#b08d57', { roughness: 1 });
      c.add(mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.08, 12), bois, 0, 0.04));
      c.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), bois, 0, 0.5));
      c.add(mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.7, 12), paille, 0, 1.05));
      const bras = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.95, 8), paille, 0, 1.28); bras.rotation.z = Math.PI / 2; c.add(bras);
      const tete = mesh(new THREE.SphereGeometry(0.17, 14, 10), toile, 0, 1.58); c.add(tete);
      const ceinture = mesh(new THREE.TorusGeometry(0.21, 0.025, 6, 16), mat('#4a3420'), 0, 0.85); ceinture.rotation.x = Math.PI / 2; c.add(ceinture);
      return base(type, c, 60, 1.75, 0.3, { tete });
    }
    case 'caisse': {
      const bois = mat('#9a6a37');
      const planches: Morceau[] = [];
      const s = 0.6;
      const faces: [number, number, number, number, number, number][] = [[0, s / 2, s / 2 - 0.02, s, s, 0.04], [0, s / 2, -s / 2 + 0.02, s, s, 0.04], [s / 2 - 0.02, s / 2, 0, 0.04, s, s], [-s / 2 + 0.02, s / 2, 0, 0.04, s, s], [0, s - 0.02, 0, s, 0.04, s], [0, 0.02, 0, s, 0.04, s]];
      for (const [x, y, z, w, hh, d] of faces) { const m = mesh(new THREE.BoxGeometry(w, hh, d), bois, x, y, z); c.add(m); planches.push(morceau(m)); }
      const cad = mat('#5c3b1c');
      for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) c.add(mesh(new THREE.BoxGeometry(0.06, s, 0.06), cad, x * (s / 2 - 0.02), s / 2, z * (s / 2 - 0.02)));
      return base(type, c, 20, s, 0.36, {}, planches);
    }
    case 'tonneau': {
      const bois = mat('#7a4b26'), fer = mat('#3c3c40', { metalness: 0.6, roughness: 0.4 });
      c.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.85, 16), bois, 0, 0.425));
      for (const y of [0.15, 0.7]) { const b = mesh(new THREE.TorusGeometry(0.305, 0.02, 6, 20), fer, 0, y); b.rotation.x = Math.PI / 2; c.add(b); }
      return base(type, c, 40, 0.85, 0.32);
    }
    case 'arbre': {
      const ecorce = mat('#5b3a1e'), feuilles = mat('#3f7d3a', { flatShading: true });
      c.add(mesh(new THREE.CylinderGeometry(0.1, 0.15, 1.5, 8), ecorce, 0, 0.75));
      const fol = new THREE.Group();
      for (const [x, y, z, r] of [[0, 1.75, 0, 0.6], [0.35, 1.5, 0.1, 0.42], [-0.3, 1.55, -0.15, 0.45], [0.05, 2.15, 0.05, 0.4]] as const) fol.add(mesh(new THREE.IcosahedronGeometry(r, 0), feuilles, x, y, z));
      c.add(fol);
      const fleurs = new THREE.Group();
      const rose = mat('#ff9fc8', { emissive: '#ff6fa8', emissiveIntensity: 0.2 }); rose.userData.fixe = true;
      for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, p = Math.random() * 3.14; fleurs.add(mesh(new THREE.SphereGeometry(0.05, 6, 4), rose, Math.cos(a) * Math.sin(p) * 0.62, 1.75 + Math.cos(p) * 0.55, Math.sin(a) * Math.sin(p) * 0.62)); }
      fleurs.scale.setScalar(0.001); c.add(fleurs);
      return base(type, c, Infinity, 2.4, 0.6, { fol, fleurs, feuilles });
    }
    case 'brasero': {
      const pierre = mat('#77736c', { flatShading: true });
      c.add(mesh(new THREE.CylinderGeometry(0.38, 0.25, 0.4, 10), pierre, 0, 0.55));
      for (let i = 0; i < 3; i++) { const a = (i / 3) * 6.28; const p = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6), mat('#3a3a3e', { metalness: 0.5 }), Math.cos(a) * 0.2, 0.2, Math.sin(a) * 0.2); c.add(p); }
      const braises = mesh(new THREE.CircleGeometry(0.33, 12), new THREE.MeshStandardMaterial({ color: '#2a1a12', emissive: '#ff5a1a', emissiveIntensity: 1.2 }), 0, 0.751); braises.rotation.x = -Math.PI / 2; (braises.material as THREE.Material).userData.fixe = true; c.add(braises);
      const lum = new THREE.PointLight('#ff8a3a', 4, 6, 1.6); lum.position.y = 1.1; c.add(lum);
      const cib = base(type, c, 80, 0.8, 0.4, { braises, lum });
      cib.x.allume = 1;
      return cib;
    }
    case 'flaque': {
      const eau = new THREE.MeshStandardMaterial({ color: '#3d6f9e', roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.85 });
      const d = mesh(new THREE.CircleGeometry(0.9, 24), eau, 0, 0.012); d.rotation.x = -Math.PI / 2; d.receiveShadow = true; c.add(d);
      const cib = base(type, c, Infinity, 0.05, 0.9, { disque: d, eau });
      cib.coque.visible = false; cib.halo.visible = false;
      cib.x.niveau = 1;
      return cib;
    }
    case 'pilier': {
      const pierre = mat('#a39d92', { flatShading: true });
      const blocs: Morceau[] = [];
      for (let i = 0; i < 4; i++) { const b = mesh(new THREE.BoxGeometry(0.55 - i * 0.03, 0.42, 0.55 - i * 0.03), pierre, 0, 0.21 + i * 0.43); b.rotation.y = (Math.random() - 0.5) * 0.2; c.add(b); blocs.push(morceau(b)); }
      return base(type, c, Infinity, 1.72, 0.36, {}, blocs);
    }
    case 'tourniquet': {
      const bois = mat('#7b5a36');
      c.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.6, 8), bois, 0, 0.8));
      const rotor = new THREE.Group(); rotor.position.y = 1.6;
      for (let i = 0; i < 4; i++) { const p = mesh(new THREE.BoxGeometry(0.9, 0.04, 0.16), mat('#d8c7a0'), 0.45, 0, 0); const bras = new THREE.Group(); bras.rotation.y = (i * Math.PI) / 2; bras.add(p); rotor.add(bras); }
      c.add(rotor);
      return base(type, c, Infinity, 1.7, 0.3, { rotor, vitesse: 4 });
    }
    case 'coffre': {
      const bois = mat('#6b3f1f'), fer = mat('#5a5a60', { metalness: 0.7, roughness: 0.35 });
      c.add(mesh(new THREE.BoxGeometry(0.8, 0.4, 0.5), bois, 0, 0.2));
      const couvercle = new THREE.Group(); couvercle.position.set(0, 0.4, -0.25);
      couvercle.add(mesh(new THREE.BoxGeometry(0.8, 0.12, 0.5), bois, 0, 0.06, 0.25)); c.add(couvercle);
      const chaine = new THREE.Group();
      for (let i = 0; i < 9; i++) { const l = mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 10), fer, -0.4 + i * 0.1, 0.48, 0); l.rotation.y = i % 2 ? Math.PI / 2 : 0; chaine.add(l); }
      for (let i = 0; i < 6; i++) { const l = mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 10), fer, 0, 0.45 - i * 0.08, 0.27); l.rotation.x = i % 2 ? Math.PI / 2 : 0; chaine.add(l); }
      c.add(chaine);
      return base(type, c, 30, 0.55, 0.45, { couvercle, chaine, ouvert: 0 });
    }
    case 'gemme': {
      c.add(mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.9, 8), mat('#8f8a80', { flatShading: true }), 0, 0.45));
      const gm = new THREE.MeshStandardMaterial({ color: '#7ff0ff', emissive: '#3fd8ff', emissiveIntensity: 0.6, transparent: true, opacity: 0.02, roughness: 0.1 }); gm.userData.fixe = true;
      const pierre = mesh(new THREE.OctahedronGeometry(0.16, 0), gm, 0, 1.15); c.add(pierre);
      const cib = base(type, c, Infinity, 1.35, 0.3, { pierre, gm });
      return cib;
    }
  }
}

// ------------------------------------------------------------------ réactions aux éléments
export type Fx = (kind: 'flamme' | 'fumee' | 'vapeur' | 'poussiere' | 'etincelle' | 'goutte' | 'feuille' | 'esprit', p: THREE.Vector3, n?: number) => void;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export function pousser(c: Cible, F: THREE.Vector3) {
  if (!isFinite(c.masse) || c.e.lie > 0.5 || c.e.petrifie > 0.7 || c.e.fige > 0.5) return;
  c.vel.addScaledVector(F, 1 / c.masse);
  const hz = Math.hypot(F.x, F.z) / c.masse;
  if ((c.type === 'mannequin' || c.type === 'tonneau') && hz > 0.35 && c.tilt < 0.01) {
    c.tiltAxe.set(F.z, 0, -F.x).normalize(); c.tilt = 0.02;
  }
}

/** Applique une dose (≈ secondes d'exposition × puissance) de l'élément à la cible. */
export function reagir(c: Cible, cle: string, q: number, fx: Fx, dir?: THREE.Vector3) {
  const e = c.e;
  const vivant = c.type === 'arbre';
  const centre = c.g.position.clone().setY(c.g.position.y + c.h * 0.6);
  switch (cle) {
    case 'braise':
      if (e.gel > 0.05) { e.gel = clamp01(e.gel - q * 1.5); fx('vapeur', centre); break; }
      if (e.mouille > 0.05) { e.mouille = clamp01(e.mouille - q * 1.2); fx('vapeur', centre); break; }
      if (c.type === 'flaque') { c.x.niveau = Math.max(0, c.x.niveau - q * 0.5); fx('vapeur', c.g.position.clone().setY(0.1)); break; }
      if (c.type === 'brasero') { c.x.allume = Math.min(2.5, c.x.allume + q * 2); break; }
      if (c.type === 'pilier' || c.type === 'gemme') { e.brule = clamp01(e.brule + q * 0.1); break; }
      e.feu = clamp01(e.feu + q * 1.4);
      break;
    case 'braise~':
      e.feu = clamp01(e.feu - q * 3);
      if (c.type === 'brasero') { c.x.allume = Math.max(0, c.x.allume - q * 1.5); if (c.x.allume < 0.2) fx('vapeur', centre); }
      e.gel = clamp01(e.gel + q * 0.9);
      break;
    case 'source':
      e.feu = 0; e.mouille = clamp01(e.mouille + q * 1.2);
      if (c.type === 'brasero') { if (c.x.allume > 0.05) fx('vapeur', centre); c.x.allume = Math.max(0, c.x.allume - q * 2); }
      if (c.type === 'flaque') c.x.niveau = Math.min(1.8, c.x.niveau + q * 0.4);
      if (dir) pousser(c, dir.clone().multiplyScalar(60 * q));
      e.degats += q * 0.05;
      break;
    case 'source~':
      e.mouille = clamp01(e.mouille - q * 2);
      if (c.type === 'flaque') { c.x.niveau = Math.max(0, c.x.niveau - q * 0.6); fx('vapeur', c.g.position.clone().setY(0.1)); }
      if (vivant) e.fletri = clamp01(e.fletri + q * 0.5);
      e.usure = clamp01(e.usure + q * 0.15);
      break;
    case 'socle':
      e.degats += q * 0.35;
      if (dir) pousser(c, dir.clone().multiplyScalar(90 * q));
      if (Math.random() < q * 6) fx('poussiere', centre);
      break;
    case 'socle~':
      if (c.type === 'pilier' || c.type === 'caisse' || c.type === 'gemme' || c.type === 'coffre') { e.degats += q * 0.4; if (Math.random() < q * 8) fx('poussiere', centre); }
      else e.usure = clamp01(e.usure + q * 0.3);
      break;
    case 'souffle':
      if (dir) pousser(c, dir.clone().multiplyScalar(140 * q));
      if (e.feu > 0) e.feu = clamp01(e.feu + q * 0.4);
      if (c.type === 'brasero') { c.x.allume = Math.max(0, c.x.allume - q * 0.8); }
      if (c.type === 'arbre' && Math.random() < q * 6) fx('feuille', centre);
      break;
    case 'souffle~':
      e.feu = clamp01(e.feu - q * 2.5); c.vel.multiplyScalar(Math.max(0, 1 - q * 4));
      if (c.type === 'brasero') c.x.allume = Math.max(0, c.x.allume - q * 1.5);
      if (c.type === 'tourniquet') c.x.vitesse = Math.max(0, c.x.vitesse - q * 8);
      break;
    case 'lueur': e.lumiere = clamp01(e.lumiere + q * 2); e.ombre = clamp01(e.ombre - q * 2); e.revele = clamp01(e.revele + q * 1.5); e.invisible = clamp01(e.invisible - q * 2); break;
    case 'lueur~': e.ombre = clamp01(e.ombre + q * 1.5); e.lumiere = 0; if (c.type === 'brasero') c.x.lum.intensity *= 1 - q; break;
    case 'memoire':
      e.degats = Math.max(0, e.degats - q * 0.8); e.brule = clamp01(e.brule - q * 0.8); e.usure = clamp01(e.usure - q); e.mouille = clamp01(e.mouille - q); e.feu = 0; e.fletri = clamp01(e.fletri - q);
      if (Math.random() < q * 5) fx('etincelle', centre);
      break;
    case 'memoire~': e.usure = clamp01(e.usure + q * 0.6); if (vivant) e.fletri = clamp01(e.fletri + q * 0.4); e.degats += q * 0.15; if (Math.random() < q * 3) fx('poussiere', centre); break;
    case 'regard': e.revele = clamp01(e.revele + q * 2); e.invisible = clamp01(e.invisible - q * 1.5); break;
    case 'regard~': e.invisible = clamp01(e.invisible + q * 0.8); break;
    case 'lien': e.lie = clamp01(e.lie + q * 1.2); c.vel.multiplyScalar(0.5); break;
    case 'lien~': e.lie = clamp01(e.lie - q * 2); if (c.type === 'coffre') c.x.ouvert = clamp01(c.x.ouvert + q * 1.2); break;
    case 'mouvement': if (c.type !== 'arbre' && c.type !== 'flaque' && c.type !== 'pilier') e.anime = clamp01(e.anime + q * 1.2); if (c.type === 'tourniquet') c.x.vitesse = Math.min(14, c.x.vitesse + q * 10); break;
    case 'mouvement~': e.fige = clamp01(e.fige + q * 1.5); c.vel.multiplyScalar(Math.max(0, 1 - q * 6)); if (c.type === 'tourniquet') c.x.vitesse = Math.max(0, c.x.vitesse - q * 12); break;
    case 'seve': if (vivant) e.croissance = clamp01(e.croissance + q * 0.6); e.degats = Math.max(0, e.degats - q * 0.6); e.fletri = clamp01(e.fletri - q); if (Math.random() < q * 4) fx('etincelle', centre); break;
    case 'seve~': if (vivant) e.fletri = clamp01(e.fletri + q * 0.6); else e.usure = clamp01(e.usure + q * 0.2); if (vivant && Math.random() < q * 6) fx('feuille', centre); break;
    case 'chair': if (c.type === 'mannequin') e.transfo = clamp01(e.transfo + q * 0.7); break;
    case 'chair~': e.petrifie = clamp01(e.petrifie + q * 0.6); break;
    case 'esprit': case 'esprit~': if (c.type === 'mannequin') { e.esprit = clamp01(e.esprit + q * 1.5); e.souvenir = cle === 'esprit~' ? 1 : 0; } break;
  }
}

// ------------------------------------------------------------------ mise à jour (physique + aspect)
const CHAR = new THREE.Color('#1c130d'), GIVRE = new THREE.Color('#d8f0ff'), PIERRE = new THREE.Color('#8e8c88'), ROUILLE = new THREE.Color('#5d5134'), BLANC = new THREE.Color('#fff4d0'), FEU = new THREE.Color('#ff6a1a');
const FEUILLE = new THREE.Color('#3f7d3a'), FANE = new THREE.Color('#8a6a2a'), VERT = new THREE.Color('#4fb34a');

export function majCible(c: Cible, dt: number, t: number, fx: Fx) {
  const e = c.e;
  // --- évolution naturelle
  if (e.feu > 0) {
    e.brule = clamp01(e.brule + e.feu * dt * 0.25);
    e.feu = clamp01(e.feu - dt * (e.brule > 0.95 ? 0.4 : 0.03));
    if (e.mouille > 0.2 || e.gel > 0.2) e.feu = clamp01(e.feu - dt * 2);
    const n = Math.ceil(e.feu * 4);
    for (let i = 0; i < n; i++) fx('flamme', c.g.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * c.r * 1.6, Math.random() * c.h, (Math.random() - 0.5) * c.r * 1.6)));
    if (Math.random() < e.feu * 0.5) fx('fumee', c.g.position.clone().setY(c.g.position.y + c.h + 0.2));
  }
  e.gel = clamp01(e.gel - dt * 0.015);
  e.mouille = clamp01(e.mouille - dt * 0.02);
  if (e.mouille > 0.3 && Math.random() < e.mouille * 0.3) fx('goutte', c.g.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * c.r, c.h * Math.random(), (Math.random() - 0.5) * c.r)));
  e.lumiere = clamp01(e.lumiere - dt * 0.6);
  e.ombre = clamp01(e.ombre - dt * 0.15);
  e.revele = clamp01(e.revele - dt * 0.25);
  e.anime = clamp01(e.anime - dt * 0.08);
  e.esprit = clamp01(e.esprit - dt * 0.1);
  if (e.esprit > 0.1 && Math.random() < e.esprit * 0.6) fx('esprit', c.g.position.clone().setY(c.g.position.y + c.h + 0.15));

  // --- casse / réparation
  if (c.morceaux.length) {
    if (!c.casse && e.degats > 1) {
      c.casse = true;
      for (const m of c.morceaux) { m.vel.set((Math.random() - 0.5) * 3, Math.random() * 3 + 1, (Math.random() - 0.5) * 3); m.spin.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); }
      fx('poussiere', c.g.position.clone().setY(0.4), 6);
    }
    if (c.casse && e.degats < 0.4) c.casse = false;
    for (const m of c.morceaux) {
      if (c.casse) {
        m.vel.y -= 9.8 * dt; m.m.position.addScaledVector(m.vel, dt);
        if (m.m.position.y < 0.05) { m.m.position.y = 0.05; m.vel.multiplyScalar(0.4); m.spin.multiplyScalar(0.5); }
        m.m.rotation.x += m.spin.x * dt; m.m.rotation.y += m.spin.y * dt; m.m.rotation.z += m.spin.z * dt;
        if (c.type === 'pilier' && e.degats > 1.5) m.m.scale.multiplyScalar(1 - dt * 0.3);
      } else {
        m.m.position.lerp(m.repos, Math.min(1, dt * 4));
        m.m.rotation.x += (m.rot0.x - m.m.rotation.x) * Math.min(1, dt * 4); m.m.rotation.y += (m.rot0.y - m.m.rotation.y) * Math.min(1, dt * 4); m.m.rotation.z += (m.rot0.z - m.m.rotation.z) * Math.min(1, dt * 4);
        m.m.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, dt * 3));
      }
    }
  }

  // --- physique
  const p = c.g.position;
  const lie = e.lie > 0.5 || e.fige > 0.6 || e.petrifie > 0.8;
  if (isFinite(c.masse)) {
    if (c.lift !== null && !lie) {
      p.y += (c.lift - p.y) * Math.min(1, dt * 1.5); c.vel.y = 0;
      c.corps.rotation.y += dt * 0.5;
    } else {
      c.vel.y -= 9.8 * dt;
      p.addScaledVector(c.vel, dt);
      if (p.y <= 0) { p.y = 0; c.vel.y = Math.abs(c.vel.y) > 2 ? -c.vel.y * 0.25 : 0; c.vel.x *= Math.pow(0.02, dt); c.vel.z *= Math.pow(0.02, dt); }
    }
    if (lie) c.vel.set(0, Math.min(0, c.vel.y), 0);
    const d = Math.hypot(p.x, p.z); if (d > 11.5) { p.x *= 11.5 / d; p.z *= 11.5 / d; c.vel.x = 0; c.vel.z = 0; }
    // animé : petits bonds
    if (e.anime > 0.2 && p.y <= 0.001 && !lie && Math.random() < dt * 3) { c.vel.y = 2.2 * e.anime; c.vel.x += (Math.random() - 0.5) * 2; c.vel.z += (Math.random() - 0.5) * 2; }
  }
  // bascule
  if (c.tilt > 0) { c.tilt = Math.min(Math.PI / 2 - 0.05, c.tilt + dt * (1.5 + c.tilt * 4)); c.corps.quaternion.setFromAxisAngle(c.tiltAxe, c.tilt); }
  // échelle (Ampleur, Réduction, Étau, croissance)
  c.echelle += (c.echelleCible - c.echelle) * Math.min(1, dt * 1.8);
  const tr = e.transfo;
  c.g.scale.set(c.echelle * (1 + tr * 0.35 * Math.sin(t * 3)), c.echelle * (1 + tr * 0.45 * Math.sin(t * 2.3 + 1)), c.echelle * (1 + tr * 0.35 * Math.sin(t * 3)));

  // --- aspect
  for (const { m, base, emis } of c.mats) {
    const col = base.clone();
    if (e.usure) col.lerp(ROUILLE, e.usure * 0.65);
    if (e.brule) col.lerp(CHAR, e.brule * 0.9);
    if (e.mouille) col.multiplyScalar(1 - 0.4 * e.mouille);
    if (e.petrifie) col.lerp(PIERRE, e.petrifie);
    if (e.gel) col.lerp(GIVRE, e.gel * 0.55);
    if (e.fige) col.lerp(new THREE.Color('#9aa3b5'), e.fige * 0.4);
    if (e.ombre) col.multiplyScalar(1 - 0.85 * e.ombre);
    m.color.copy(col);
    m.emissive.copy(emis).lerp(BLANC, e.lumiere * 0.7).lerp(FEU, e.feu * 0.35 * (0.8 + Math.random() * 0.4));
    m.emissiveIntensity = 1;
    m.opacity = 1 - 0.95 * e.invisible;
    m.depthWrite = e.invisible < 0.3;
  }
  (c.coque.material as THREE.MeshStandardMaterial).opacity = e.gel * 0.55;
  c.coque.scale.setScalar(1 + e.gel * 0.05);
  c.liens.visible = e.lie > 0.05; c.liens.scale.setScalar(Math.max(0.01, 1.4 - e.lie * 0.4)); c.liens.rotation.y += dt * 2;
  (c.halo.material as THREE.MeshBasicMaterial).opacity = e.revele * 0.35 * (0.7 + 0.3 * Math.sin(t * 6));
  // marque au sol, laissée là où se trouve la cible
  if (!c.trace.parent && c.g.parent) c.g.parent.add(c.trace);
  const tm = c.trace.material as THREE.MeshBasicMaterial;
  const forte = Math.max(e.brule, e.gel, e.mouille * 0.8, e.usure * 0.5);
  if (forte > 0.02) {
    if (e.brule >= forte) tm.color.set('#140c08'); else if (e.gel >= forte) tm.color.set('#eef8ff'); else if (e.mouille * 0.8 >= forte) tm.color.set('#1d2a33'); else tm.color.set('#4a3f2a');
    tm.opacity = Math.min(0.75, forte * 0.8);
    if (tm.opacity > 0.05 && c.trace.userData.pose !== true) { c.trace.position.set(c.g.position.x, 0.008, c.g.position.z); c.trace.userData.pose = true; }
  } else tm.opacity = 0;

  // --- spécifique
  switch (c.type) {
    case 'arbre': {
      const s = 1 + e.croissance * 0.5;
      c.corps.scale.set(s, s, s);
      const fe = c.x.feuilles as THREE.MeshStandardMaterial;
      fe.color.copy(FEUILLE).lerp(VERT, e.croissance).lerp(FANE, e.fletri).lerp(CHAR, e.brule).lerp(GIVRE, e.gel * 0.6).multiplyScalar(1 - 0.8 * e.ombre);
      (c.x.fol as THREE.Group).scale.setScalar(Math.max(0.15, 1 - e.fletri * 0.5 - e.brule * 0.8));
      (c.x.fleurs as THREE.Group).scale.setScalar(Math.max(0.001, e.croissance));
      if (e.fletri > 0.3 && Math.random() < e.fletri * 0.2) fx('feuille', c.g.position.clone().setY(1.8));
      break;
    }
    case 'brasero': {
      const a = c.x.allume as number;
      (c.x.lum as THREE.PointLight).intensity = a * 4 * (0.85 + Math.random() * 0.3) * (1 - e.ombre * 0.9);
      ((c.x.braises as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = Math.max(0.05, a * 1.2);
      const n = Math.round(a * 3);
      for (let i = 0; i < n; i++) fx('flamme', c.g.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.8 + Math.random() * 0.2 * a, (Math.random() - 0.5) * 0.4)));
      if (a < 0.3 && Math.random() < 0.05) fx('fumee', c.g.position.clone().setY(0.9));
      if (a > 1) c.x.allume = Math.max(1, a - dt * 0.3);
      break;
    }
    case 'flaque': {
      const n = c.x.niveau as number;
      (c.x.disque as THREE.Mesh).scale.setScalar(Math.max(0.01, n));
      const eau = c.x.eau as THREE.MeshStandardMaterial;
      eau.color.set('#3d6f9e').lerp(GIVRE, e.gel).multiplyScalar(1 - 0.7 * e.ombre);
      eau.roughness = 0.08 + e.gel * 0.5; eau.opacity = 0.85 * Math.min(1, n * 2);
      break;
    }
    case 'tourniquet': {
      (c.x.rotor as THREE.Group).rotation.y += dt * (c.x.vitesse as number) * (1 - e.fige) * (1 - e.gel);
      if (e.fige < 0.2 && e.gel < 0.2) c.x.vitesse += (4 - c.x.vitesse) * dt * 0.05;
      break;
    }
    case 'coffre': {
      const o = c.x.ouvert as number;
      (c.x.couvercle as THREE.Group).rotation.x = -o * 1.6;
      const ch = c.x.chaine as THREE.Group;
      if (o > 0.2 && ch.visible) { ch.visible = false; fx('etincelle', c.g.position.clone().setY(0.5), 8); }
      if (o < 0.05) ch.visible = true;
      break;
    }
    case 'gemme': {
      const gm = c.x.gm as THREE.MeshStandardMaterial;
      gm.opacity = 0.02 + 0.98 * Math.max(e.revele, gm.opacity > 0.5 ? 0.9 : 0);
      (c.x.pierre as THREE.Mesh).rotation.y += dt;
      break;
    }
    case 'mannequin': {
      if (c.marche) {
        const m = c.marche; m.t = Math.min(1, m.t + dt / m.duree);
        p.lerpVectors(m.de, m.vers, m.t);
        c.corps.rotation.z = Math.sin(t * 8) * 0.08 * (1 - m.t);
        if (m.t >= 1) c.marche = undefined;
      }
      break;
    }
  }
}

export function libererCible(c: Cible) {
  c.trace.removeFromParent(); c.trace.geometry.dispose(); (c.trace.material as THREE.Material).dispose();
  c.g.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mt = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mt)) mt.forEach((x) => x.dispose()); else mt?.dispose();
  });
}

/** Position de référence (centre du volume) */
export const centreCible = (c: Cible) => c.g.position.clone().setY(c.g.position.y + (c.h * c.echelle) / 2);

const NOMS: Record<TypeCible, string> = { mannequin: 'Mannequin', caisse: 'Caisse', tonneau: 'Tonneau', arbre: 'Arbre', brasero: 'Brasero', flaque: 'Flaque', pilier: 'Pilier de pierre', tourniquet: 'Tourniquet', coffre: 'Coffre enchaîné', gemme: 'Gemme cachée' };

/** Ce qu'on observe sur une cible, en mots (pour le relevé à côté de la vue 3D) */
export function constat(c: Cible, depart: THREE.Vector3): { nom: string; etats: string[] } {
  const e = c.e, et: string[] = [];
  if (e.feu > 0.2) et.push('en feu'); else if (e.brule > 0.5) et.push('carbonisé'); else if (e.brule > 0.15) et.push('roussi');
  if (e.gel > 0.3) et.push(c.type === 'flaque' ? 'gelée' : 'pris dans la glace');
  if (e.mouille > 0.3 && c.type !== 'flaque') et.push('trempé');
  if (c.casse) et.push(c.type === 'pilier' ? 'effondré' : 'brisé');
  if (c.tilt > 1) et.push('renversé');
  if (c.lift !== null && c.g.position.y > 0.4) et.push('en lévitation');
  if (e.lie > 0.5) et.push('lié');
  if (e.petrifie > 0.5) et.push('pétrifié');
  if (e.invisible > 0.5) et.push('invisible');
  if (e.lumiere > 0.3) et.push('ébloui');
  if (e.ombre > 0.4) et.push('plongé dans l\u2019ombre');
  if (e.fige > 0.5) et.push('figé');
  if (e.anime > 0.3) et.push('animé');
  if (c.echelle > 1.25) et.push('agrandi'); else if (c.echelle < 0.85) et.push('rétréci');
  if (e.croissance > 0.3) et.push('en pleine croissance');
  if (e.fletri > 0.3) et.push('flétri');
  if (e.usure > 0.4) et.push('vieilli');
  if (e.transfo > 0.3) et.push('déformé');
  if (e.esprit > 0.3) et.push(e.souvenir ? 'souvenir retrouvé' : 'mémoire altérée');
  if (e.revele > 0.3 && c.type !== 'gemme') et.push('révélé');
  if (c.type === 'brasero') { if (c.x.allume < 0.2) et.push('éteint'); else if (c.x.allume > 1.3) et.push('attisé'); }
  if (c.type === 'flaque' && c.x.niveau < 0.3) et.push('évaporée'); else if (c.type === 'flaque' && c.x.niveau > 1.3) et.push('agrandie');
  if (c.type === 'coffre' && c.x.ouvert > 0.5) et.push('ouvert, chaînes brisées');
  if (c.type === 'tourniquet' && c.x.vitesse < 0.5) et.push('arrêté'); else if (c.type === 'tourniquet' && c.x.vitesse > 7) et.push('emballé');
  if (c.type === 'gemme' && e.revele > 0.3) et.push('rendue visible');
  const d = Math.hypot(c.g.position.x - depart.x, c.g.position.z - depart.z);
  if (d > 1.2) et.push(`déplacé de ${String(Math.round(d * 10) / 10).replace('.', ',')} m`);
  return { nom: NOMS[c.type], etats: et };
}
