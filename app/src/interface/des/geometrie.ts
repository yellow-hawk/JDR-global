// Dés en 3D (three) : polyèdre du bon nombre de faces, numéros sur chaque face,
// et orientation finale qui montre une valeur donnée face à la caméra, chiffre à l'endroit.
import * as THREE from 'three';

export interface FaceDe { centre: THREE.Vector3; normale: THREE.Vector3; haut: THREE.Vector3; rayon: number }

export interface ModeleDe {
  groupe: THREE.Group;
  faces: FaceDe[];
  /** Étiquette affichée sur chaque face (même ordre que faces). */
  etiquettes: string[];
  materiaux: THREE.Material[];
  /** Assombrit le dé (dé écarté d'un avantage / désavantage), t de 0 à 1. */
  assombrir(t: number): void;
  /** Orientation qui présente la face portant `etiquette` à la caméra (axe +z), chiffre vers le haut (+y). */
  orientationPour(etiquette: string): THREE.Quaternion;
  liberer(): void;
}

const COULEURS: Record<string, string> = {
  '4': '#b8382c', '6': '#2e74b5', '8': '#2f9a57', '10': '#7d3fa8', '12': '#d0651b', '20': '#b8901c', '100': '#3b4d63',
};
export const couleurDe = (faces: number): string => COULEURS[String(faces)] ?? '#666';

/** Trapézoèdre pentagonal (d10) : 10 cerfs-volants plans. */
function geometrieD10(): THREE.BufferGeometry {
  const h = 1.15, c36 = Math.cos(Math.PI / 5);
  const a = (h * (1 - c36)) / (1 + c36); // condition de planéité des faces
  const anneau = (i: number) => new THREE.Vector3(Math.cos((i * Math.PI) / 5), Math.sin((i * Math.PI) / 5), i % 2 === 0 ? a : -a);
  const haut = new THREE.Vector3(0, 0, h), bas = new THREE.Vector3(0, 0, -h);
  const tri: THREE.Vector3[] = [];
  const kite = (p: THREE.Vector3, q: THREE.Vector3, r: THREE.Vector3, s: THREE.Vector3) => { tri.push(p, q, r, p, r, s); };
  for (let k = 0; k < 5; k++) {
    kite(haut, anneau(2 * k), anneau(2 * k + 1), anneau(2 * k + 2));
    kite(bas, anneau(2 * k + 1), anneau(2 * k + 2), anneau(2 * k + 3));
  }
  // Remettre chaque triangle dans le sens sortant.
  for (let i = 0; i < tri.length; i += 3) {
    const [p, q, r] = [tri[i], tri[i + 1], tri[i + 2]];
    const n = new THREE.Vector3().subVectors(q, p).cross(new THREE.Vector3().subVectors(r, p));
    const m = new THREE.Vector3().add(p).add(q).add(r);
    if (n.dot(m) < 0) { tri[i + 1] = r; tri[i + 2] = q; }
  }
  const g = new THREE.BufferGeometry().setFromPoints(tri);
  g.scale(0.9, 0.9, 0.9);
  return g;
}

function geometrie(faces: number): THREE.BufferGeometry {
  switch (faces) {
    case 4: return new THREE.TetrahedronGeometry(1.05);
    case 6: return new THREE.BoxGeometry(1.15, 1.15, 1.15).toNonIndexed();
    case 8: return new THREE.OctahedronGeometry(0.95);
    case 10: return geometrieD10();
    case 12: return new THREE.DodecahedronGeometry(0.95);
    default: return new THREE.IcosahedronGeometry(0.95);
  }
}

/** Regroupe les triangles coplanaires en faces : centre, normale, direction « haut » du chiffre, rayon utile. */
export function facesDe(g: THREE.BufferGeometry): FaceDe[] {
  const pos = g.getAttribute('position');
  const groupes = new Map<string, { n: THREE.Vector3; pts: THREE.Vector3[] }>();
  for (let i = 0; i < pos.count; i += 3) {
    const p = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(pos, i + k));
    const n = new THREE.Vector3().subVectors(p[1], p[0]).cross(new THREE.Vector3().subVectors(p[2], p[0])).normalize();
    const cle = [n.x, n.y, n.z].map((v) => Math.round(v * 100)).join(',');
    if (!groupes.has(cle)) groupes.set(cle, { n, pts: [] });
    const gr = groupes.get(cle)!;
    for (const v of p) if (!gr.pts.some((w) => w.distanceToSquared(v) < 1e-6)) gr.pts.push(v);
  }
  return [...groupes.values()].map(({ n, pts }) => {
    const centre = pts.reduce((s, v) => s.add(v), new THREE.Vector3()).divideScalar(pts.length);
    const dist = pts.map((v) => v.distanceTo(centre));
    const loin = Math.max(...dist), pres = Math.min(...dist);
    const regulier = loin - pres < 1e-3;
    let cible: THREE.Vector3;
    if (regulier && pts.length === 4) {
      // carré : vers le milieu d'un côté (pts[0] et son voisin le plus proche)
      const voisin = pts.slice(1).reduce((a, b) => (b.distanceTo(pts[0]) < a.distanceTo(pts[0]) ? b : a));
      cible = pts[0].clone().add(voisin).multiplyScalar(0.5);
    } else cible = pts[dist.indexOf(loin)]; // vers le sommet le plus éloigné (pointe du d10, sommet d'un triangle ou d'un pentagone)
    const haut = cible.clone().sub(centre);
    haut.sub(n.clone().multiplyScalar(haut.dot(n))).normalize();
    // rayon utile pour le chiffre : rayon inscrit d'un polygone régulier, sinon une part de la distance au sommet le plus proche
    const rayon = regulier ? pres * Math.cos(Math.PI / pts.length) : pres * 0.6;
    return { centre, normale: n, haut, rayon };
  });
}

function texteEtiquette(t: string, encre: string): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = encre;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${t.length > 1 ? 66 : 84}px Georgia, serif`;
  ctx.fillText(t, 64, 68);
  if (t === '6' || t === '9') ctx.fillRect(40, 108, 48, 7); // repère sous 6 et 9
  const tx = new THREE.CanvasTexture(cv);
  tx.anisotropy = 4;
  return tx;
}

/** Étiquettes d'un dé : 1..n ; d10 de dizaines « 00..90 » ; d10 d'unités « 0..9 ». */
export function etiquettesDe(faces: number, variante?: 'dizaines' | 'unites'): string[] {
  if (variante === 'dizaines') return Array.from({ length: 10 }, (_, i) => `${i}0`);
  if (variante === 'unites') return Array.from({ length: 10 }, (_, i) => String(i));
  return Array.from({ length: faces }, (_, i) => String(i + 1));
}

export function creerDe(faces: number, variante?: 'dizaines' | 'unites'): ModeleDe {
  const g = geometrie(faces === 100 ? 10 : faces);
  g.computeVertexNormals();
  const fs = facesDe(g);
  const couleur = couleurDe(variante ? 100 : faces);
  const corps = new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.45, metalness: 0.15, flatShading: true });
  const base = new THREE.Color(couleur), gris = new THREE.Color('#3a3530');
  const groupe = new THREE.Group();
  groupe.add(new THREE.Mesh(g, corps));
  const aretes = new THREE.LineSegments(new THREE.EdgesGeometry(g, 10), new THREE.LineBasicMaterial({ color: '#f3e3c0', transparent: true, opacity: 0.55 }));
  groupe.add(aretes);
  const etiquettes = etiquettesDe(fs.length, variante);
  const materiaux: THREE.Material[] = [corps, aretes.material as THREE.Material];
  fs.forEach((f, i) => {
    const m = new THREE.MeshBasicMaterial({ map: texteEtiquette(etiquettes[i], '#fff6e0'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    materiaux.push(m);
    const cote = f.rayon * (faces === 10 || faces === 100 ? 1.7 : faces === 12 ? 1.45 : 1.55);
    const plan = new THREE.Mesh(new THREE.PlaneGeometry(cote, cote), m);
    const droite = new THREE.Vector3().crossVectors(f.haut, f.normale);
    plan.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(droite, f.haut, f.normale));
    // sur le d10, le chiffre est un peu remonté vers la pointe
    plan.position.copy(f.centre).add(f.normale.clone().multiplyScalar(0.004)).add(f.haut.clone().multiplyScalar(faces === 10 || faces === 100 ? f.rayon * 0.25 : 0));
    groupe.add(plan);
  });
  return {
    groupe, faces: fs, etiquettes, materiaux,
    orientationPour(etiquette: string) {
      const f = fs[Math.max(0, etiquettes.indexOf(etiquette))];
      const droite = new THREE.Vector3().crossVectors(f.haut, f.normale);
      const base = new THREE.Matrix4().makeBasis(droite, f.haut, f.normale);
      return new THREE.Quaternion().setFromRotationMatrix(base.transpose());
    },
    assombrir(t: number) {
      corps.color.copy(base).lerp(gris, t);
      materiaux.slice(1).forEach((m) => { (m as THREE.MeshBasicMaterial).opacity = 1 - 0.65 * t; });
    },
    liberer() {
      groupe.traverse((o) => { if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose(); });
      materiaux.forEach((m) => { (m as THREE.MeshBasicMaterial).map?.dispose(); m.dispose(); });
    },
  };
}

/** Dés physiques d'une valeur : un d100 se lance avec deux d10 (dizaines + unités ; 100 = « 00 » et « 0 »). */
export function desPhysiques(faces: number, valeur: number): { faces: number; variante?: 'dizaines' | 'unites'; etiquette: string }[] {
  if (faces === 100) {
    const v = valeur % 100;
    return [
      { faces: 100, variante: 'dizaines', etiquette: `${Math.floor(v / 10)}0` },
      { faces: 100, variante: 'unites', etiquette: String(v % 10) },
    ];
  }
  if (![4, 6, 8, 10, 12, 20].includes(faces)) return [{ faces: 20, etiquette: String(Math.min(20, valeur)) }];
  return [{ faces, etiquette: String(valeur) }];
}
