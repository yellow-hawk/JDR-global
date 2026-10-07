// Tracés des signes, dans une boîte locale 0..100.
// Convention : « haut » (y petit) = vers l'extérieur du sceau.
// Les Nœuds sont dessinés au-dessus d'une cerne située à y = 60.
// Ces tracés servent à la fois au rendu SVG et aux modèles de reconnaissance.

export type Primitive =
  | { d: string } // chemin SVG (M L H V Q T C Z, plus q t relatifs)
  | { circle: [number, number, number]; dash?: boolean }
  | { dot: [number, number, number] };

function spiral(cx: number, cy: number, r0: number, r1: number, turns: number, endA: number): string {
  const p: string[] = [];
  const n = 60;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = endA - 2 * Math.PI * turns * (1 - t);
    const r = r0 + (r1 - r0) * t;
    p.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return 'M' + p.join(' L');
}

function wavyV(x: number, y0: number, y1: number, amp: number, n: number): string {
  let d = `M${x} ${y0}`;
  const h = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    const s = i % 2 ? -1 : 1;
    d += ` Q${x + s * amp} ${y0 + h * (i + 0.5)} ${x} ${y0 + h * (i + 1)}`;
  }
  return d;
}

function crescent(): string {
  // croissant : grand arc extérieur + arc intérieur
  const pt = (cx: number, cy: number, r: number, deg: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  };
  const outer: string[] = [];
  for (let i = 0; i <= 30; i++) outer.push(pt(50, 50, 31, -60 - (i / 30) * 240)); // haut-droite → gauche → bas-droite
  const inner: string[] = [];
  for (let i = 0; i <= 20; i++) inner.push(pt(66, 50, 27, 91 + (i / 20) * 178)); // bas → gauche → haut
  return 'M' + outer.join(' L') + ' L' + inner.join(' L') + ' Z';
}

const rays = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const f = (r: number) => `${(50 + r * Math.cos(a)).toFixed(1)} ${(50 + r * Math.sin(a)).toFixed(1)}`;
  return { d: `M${f(21)} L${f(31)}` };
});

export const GLYPHS: Record<string, Primitive[]> = {
  // ---- Cœurs
  braise: [{ d: 'M50 18 L80 74 L20 74 Z' }, { dot: [50, 56, 5] }],
  source: [34, 50, 66].map((y) => ({ d: `M18 ${y} q8 -10 16 0 t16 0 t16 0 t16 0` })),
  socle: [{ d: 'M32 28 H68 V64 H32 Z' }, { d: 'M18 76 H82' }],
  souffle: [{ d: spiral(50, 50, 3, 30, 2.1, 0) }],
  lueur: [{ circle: [50, 50, 13] }, ...rays],
  memoire: [{ d: 'M50 50 C40 30 16 32 16 50 C16 68 40 70 50 50 C60 30 84 32 84 50 C84 68 60 70 50 50' }],
  regard: [{ d: 'M14 50 Q50 16 86 50 Q50 84 14 50 Z' }, { dot: [50, 50, 8] }],
  lien: [{ circle: [39, 50, 18] }, { circle: [61, 50, 18] }],
  mouvement: [{ d: 'M16 66 L30 38 L44 66 L58 38 L72 66' }, { dot: [84, 50, 5] }],
  seve: [{ d: 'M50 80 L50 34' }, { d: 'M50 60 Q30 58 24 40 Q44 40 50 60' }, { d: 'M50 48 Q70 46 76 28 Q56 28 50 48' }, { d: 'M32 80 H68' }],
  chair: [{ circle: [50, 32, 11] }, { d: 'M26 80 Q26 50 50 50 Q74 50 74 80' }],
  esprit: [{ d: crescent() }, { dot: [72, 50, 5] }],
  // ---- Rameaux
  jet: [{ d: 'M50 84 L50 20' }, { d: 'M33 20 H67' }],
  pluie: [{ d: 'M22 42 Q50 12 78 42' }, { d: 'M36 52 V66' }, { d: 'M50 52 V72' }, { d: 'M64 52 V66' }],
  gerbe: [{ d: 'M50 84 L24 26' }, { d: 'M50 84 L50 18' }, { d: 'M50 84 L76 26' }],
  dard: [{ d: 'M50 86 L50 20' }, { d: 'M33 38 L50 20 L67 38' }],
  plume: [{ d: 'M28 22 Q28 60 50 60 Q72 60 72 22' }, { d: 'M50 60 V86' }],
  appel: [{ d: 'M50 18 V62 Q50 82 34 82 Q22 82 23 68' }],
  etau: [{ d: 'M22 20 L44 40 L22 60' }, { d: 'M78 20 L56 40 L78 60' }, { d: 'M50 50 V86' }],
  ampleur: [{ d: 'M28 42 L50 20 L72 42' }, { d: 'M28 64 L50 42 L72 64' }, { d: 'M50 64 V86' }],
  rempart: [{ d: 'M22 30 H78' }, { d: 'M28 30 V70' }, { d: 'M72 30 V70' }, { d: 'M50 30 V18' }],
  tourbillon: [{ d: spiral(50, 34, 2, 17, 1.7, Math.PI / 2) }, { d: 'M50 51 V86' }],
  figure: [{ d: 'M20 40 Q36 24 50 44 Q64 24 80 40' }, { d: 'M50 44 V70' }, { d: 'M40 80 L50 70 L60 80' }],
  tisse: [{ d: wavyV(50, 86, 26, 14, 5) }, { d: 'M38 22 H62' }],
  // ---- Nœuds (cerne à y = 60)
  fenetre: [{ d: 'M50 18 L67 48 L33 48 Z' }],
  halo: [{ circle: [50, 35, 14], dash: true }, { dot: [50, 35, 4.5] }],
  visee: [{ d: 'M50 54 V26' }, { dot: [50, 20, 5] }],
  sablier: [{ d: 'M36 20 H64 L36 52 H64 Z' }],
  douce: [{ d: 'M34 48 Q50 32 66 48' }, { dot: [50, 24, 4.5] }],
  echo: [{ d: 'M36 36 Q50 22 64 36' }, { d: 'M32 50 Q50 32 68 50' }],
  guet: [{ d: 'M32 32 Q50 48 68 32' }, { d: 'M40 41 L37 50' }, { d: 'M50 44 V53' }, { d: 'M60 41 L63 50' }],
  mot: [{ d: 'M50 18 V54' }, { d: 'M40 28 H60' }, { d: 'M40 40 H60' }],
};

/** Ligne de la gerce (inversion d'un Cœur), en coordonnées locales. */
export const GERCE = 'M12 88 L88 12';
