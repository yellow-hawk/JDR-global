// Banc d'essai « dessins réalistes » : tailles, positions, rotations et déformations variables,
// cerne irrégulière. Mesure le taux de lecture correcte, signe par signe.
// Lancer : npx tsx tests/realiste.test.ts
import { glyphStrokes, gerceStroke, rotate, type Pt, type Stroke } from '../engine/geometry';
import { lireTrace } from '../engine/freehand';
import { COEURS, NOEUDS, RAMEAUX } from '../data/signes';

let seed = Number(process.env.SEED ?? 7);
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const between = (a: number, b: number) => a + rnd() * (b - a);
const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 0.8;

/** déforme un glyphe local 0..100 : affine + tremblement lent + tremblement fin */
function main(strokes: Stroke[], force: number): Stroke[] {
  const sx = between(1 - 0.2 * force, 1 + 0.2 * force), sh = between(-0.15, 0.15) * force;
  return strokes.map((s) => {
    let ox = gauss() * 3 * force, oy = gauss() * 3 * force;
    return s.map((p) => {
      ox += gauss() * 0.6 * force; oy += gauss() * 0.6 * force;
      const x = 50 + (p.x - 50) * sx + (p.y - 50) * sh, y = p.y;
      return { x: x + ox + gauss() * 0.8 * force, y: y + oy + gauss() * 0.8 * force };
    });
  });
}

/** place un glyphe local (haut = extérieur) à l'angle donné, à la distance d du centre, taille t (px) */
function placer(strokes: Stroke[], c: Pt, angle: number, d: number, t: number, rotLocal: number, pivotY = 50): Stroke[] {
  const a = (angle * Math.PI) / 180;
  const anchor = { x: c.x + d * Math.sin(a), y: c.y - d * Math.cos(a) };
  return strokes.map((s) => s.map((p) => {
    const q = rotate({ x: ((p.x - 50) * t) / 100, y: ((p.y - pivotY) * t) / 100 }, angle + rotLocal);
    return { x: anchor.x + q.x, y: anchor.y + q.y };
  }));
}

function cerne(c: Pt, R: number, gap: number | null): Stroke {
  const blob = Number(process.env.BLOB ?? 1); const p1 = between(0, 6.28), p2 = between(0, 6.28), a1 = between(0.03, 0.08) * blob, a2 = between(0.02, 0.05) * blob;
  const pts: Pt[] = [];
  const start = gap === null ? between(0, 360) : gap + 12, end = gap === null ? start + 360 + between(0, 15) : gap + 348;
  for (let a = start; a <= end; a += 3) {
    const t = (a * Math.PI) / 180;
    const r = R * (1 + a1 * Math.sin(2 * t + p1) + a2 * Math.sin(3 * t + p2)) + gauss() * 1.5;
    pts.push({ x: c.x + r * Math.sin(t), y: c.y - r * Math.cos(t) });
  }
  return pts;
}

const force = Number(process.env.FORCE ?? 1);
const stats = new Map<string, [number, number]>();
const note = (k: string, ok: boolean) => { const s = stats.get(k) ?? [0, 0]; s[1]++; if (ok) s[0]++; stats.set(k, s); };
const erreurs = new Map<string, number>();

const ESSAIS = Number(process.env.ESSAIS ?? 6);
for (let essai = 0; essai < ESSAIS; essai++) {
  // un sceau de test par Rameau / orientation : Cœur au hasard + 4 exemplaires + 2 Nœuds
  for (const r of RAMEAUX) for (const inv of [false, true]) {
    const c = { x: 300 + between(-20, 20), y: 300 + between(-20, 20) };
    const R = between(190, 260);
    const coeur = COEURS[Math.floor(rnd() * (process.env.TOUS_COEURS ? COEURS.length : 5))];
    const cInv = rnd() < 0.3;
    const strokes: Stroke[] = [];
    let cs = main(glyphStrokes(coeur.id), force);
    if (cInv) cs = [...cs, ...main(gerceStroke(), force * 0.5)];
    strokes.push(...placer(cs, c, 0, 0, R * between(0.45, 0.75), between(-10, 10)));
    const n = 2 + Math.floor(rnd() * 3);
    const off = between(0, 360);
    const angles = Array.from({ length: n }, (_, k) => off + (k * 360) / n);
    for (const a of angles) strokes.push(...placer(main(glyphStrokes(r.id), force), c, a, R * between(0.5, 0.74), R * between(0.3, 0.5), (inv ? 180 : 0) + between(-18, 18)));
    const nd = NOEUDS[Math.floor(rnd() * NOEUDS.length)];
    const ndInv = rnd() < 0.5;
    const an = off + 180 / n;
    strokes.push(...placer(main(glyphStrokes(nd.id), force), c, an, R, R * between(0.28, 0.42), (ndInv ? 180 : 0) + between(-12, 12), 60));
    strokes.push(cerne(c, R, null));

    const L = lireTrace(strokes, 600);
    const s = L.sceau;
    const okC = !!s.coeur && s.coeur.id === coeur.id && s.coeur.inv === cInv;
    note('coeur', okC);
    if (!okC) { const k = `coeur ${coeur.id}${cInv ? '~' : ''} lu ${s.coeur ? s.coeur.id + (s.coeur.inv ? '~' : '') : 'rien'} ${L.groupes.filter((g) => g.kind === 'coeur').map((g) => g.label + g.score.toFixed(2)).join(',')}`; erreurs.set(k, (erreurs.get(k) ?? 0) + 1); }
    const bons = angles.filter((a) => s.rameaux.some((x) => x.id === r.id && x.inv === inv && Math.abs(((x.angle - a + 540) % 360) - 180) < 20)).length;
    note(`rameau ${r.id}${inv ? '~' : ''}`, bons === n);
    note('rameaux (tous)', bons === n);
    for (const x of s.rameaux) if (!(x.id === r.id && x.inv === inv)) erreurs.set(`${r.id}${inv ? '~' : ''} lu ${x.id}${x.inv ? '~' : ''}`, (erreurs.get(`${r.id}${inv ? '~' : ''} lu ${x.id}${x.inv ? '~' : ''}`) ?? 0) + 1);
    const okN = s.noeuds.some((x) => x.id === nd.id && x.inv === ndInv);
    note(`noeud ${nd.id}`, okN); note('noeuds (tous)', okN);
    if (!okN) { const k = `noeud ${nd.id}${ndInv ? '~' : ''} lu ${s.noeuds.map((x) => x.id + (x.inv ? '~' : '')).join(',') || 'rien'} / r:${s.rameaux.filter((x) => x.id !== r.id).map((x) => x.id).join(',')} / ${L.groupes.filter((g) => !g.ok).map((g) => g.label + g.score.toFixed(2)).join(',')}`; erreurs.set(k, (erreurs.get(k) ?? 0) + 1); }
    note('fausses lectures', s.rameaux.length + s.noeuds.length <= n + 1);
    note('cerne', L.cerne && s.entaille === null);
  }
}

const lignes = [...stats.entries()].sort((a, b) => a[0].localeCompare(b[0]));
for (const [k, [ok, n]] of lignes) console.log(`${k.padEnd(22)} ${String(Math.round((100 * ok) / n)).padStart(3)} %  (${ok}/${n})`);
console.log('\nConfusions fréquentes :');
[...erreurs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, v]) => console.log(`  ${k} ×${v}`));
