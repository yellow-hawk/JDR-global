// Tests des techniques avancées : double cerne, sceau fendu, greffe.
import { placeStrokes, polar, type Stroke } from '../engine/geometry';
import { lireTrace } from '../engine/freehand';
import { analyser } from '../engine/analyse';
import { decrire } from '../engine/effets';

let ok = 0, total = 0;
const check = (c: boolean, m: string) => { total++; if (c) ok++; else console.log('  ✗', m); };
const arc = (cx: number, cy: number, R: number, a0: number, a1: number): Stroke => { const s: Stroke = []; for (let a = a0; a <= a1; a += 3) s.push(polar(cx, cy, R, a)); return s; };
const bruit = (st: Stroke[]) => st.map((s) => s.map((p) => ({ x: p.x + (Math.random() - 0.5) * 2, y: p.y + (Math.random() - 0.5) * 2 })));

// Double cerne : Braise + 3 Jets dedans, 4 Tourbillons dans la couronne
{
  const C = 300, R = 150, R2 = 250;
  const st: Stroke[] = [...placeStrokes('braise', 'coeur', 0, false, C, C, R)];
  for (const a of [-30, 0, 30]) st.push(...placeStrokes('jet', 'rameau', (a + 360) % 360, false, C, C, R));
  for (const a of [45, 135, 225, 315]) st.push(...placeStrokes('tourbillon', 'rameau', a, false, C, C, R, 200));
  st.push(arc(C, C, R, 0, 360), arc(C, C, R2, 0, 360));
  const L = lireTrace(bruit(st), 600);
  check(!!L.sceau.couronne, 'double cerne détectée');
  check(L.sceau.rameaux.filter((r) => r.id === 'jet').length === 3, 'jets intérieurs');
  check((L.sceau.couronne?.rameaux.filter((r) => r.id === 'tourbillon').length ?? 0) >= 3, `tourbillons de couronne (${L.sceau.couronne?.rameaux.map((r) => r.id)})`);
  const A = analyser(L.sceau);
  console.log('Double cerne →', A.nomSuggere, '| rang', A.rang, '| puissance', A.puissance);
  check(A.rang === 3, 'rang Maître');
}
// Sceau fendu : deux demi-cerclessans jonction
{
  const C = 300, R = 210;
  const st: Stroke[] = [...placeStrokes('source', 'coeur', 0, false, C, C, R), ...placeStrokes('plume', 'rameau', 90, false, C, C, R), ...placeStrokes('plume', 'rameau', 270, false, C, C, R)];
  st.push(arc(C, C, R, 12, 168), arc(C, C, R, 192, 348));
  const L = lireTrace(bruit(st), 600);
  check(!!L.sceau.fendu && L.sceau.entaille === null, `fendu détecté (${JSON.stringify(L.sceau.fendu)}, entaille ${L.sceau.entaille})`);
  const A = analyser(L.sceau);
  check(!A.actif && A.pret, 'fendu = préparé, pas actif');
  console.log('Fendu →', A.nomSuggere, '|', decrire(L.sceau, A).declenchement.slice(0, 60));
}
// Greffe : deux sceaux identiques reliés
{
  const mk = (cx: number) => { const R = 110, st: Stroke[] = [...placeStrokes('braise', 'coeur', 0, false, cx, 300, R)]; for (const a of [0, 90, 180, 270]) st.push(...placeStrokes('jet', 'rameau', a, false, cx, 300, R)); st.push(arc(cx, 300, R, 0, 360)); return st; };
  const st = [...mk(150), ...mk(450), [{ x: 262, y: 300 }, { x: 300, y: 300 }, { x: 338, y: 300 }]];
  const L = lireTrace(bruit(st), 600);
  check(!!L.sceau.greffe, 'greffe détectée');
  const A = analyser(L.sceau);
  check(A.technique.greffe?.mode === 'renfort', `renfort (${A.technique.greffe?.mode})`);
  console.log('Greffe →', A.nomSuggere, '| puissance', A.puissance);
  // sans trait : pas de greffe
  const L2 = lireTrace(bruit([...mk(150), ...mk(450)]), 600);
  check(!L2.sceau.greffe, 'deux sceaux sans trait = pas de greffe');
}
console.log(`${ok}/${total} vérifications techniques réussies`);
if (ok !== total) process.exit(1);
