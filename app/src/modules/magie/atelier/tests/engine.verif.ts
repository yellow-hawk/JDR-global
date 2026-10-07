// Tests du moteur : on « dessine » des sceaux à la main (tracés bruités) et on vérifie la lecture.
// Lancer : npm test
import { placeStrokes, polar, type Stroke } from '../engine/geometry';
import { lireTrace } from '../engine/freehand';
import { analyser } from '../engine/analyse';
import { reconnaitre } from '../engine/recognizer';
import { COEURS, NOEUDS, RAMEAUX } from '../data/signes';
import type { Sceau } from '../engine/types';
import { decrire } from '../engine/effets';
import { GRIMOIRE_DE_BASE } from '../data/grimoire';
import { generer } from '../engine/generateur';

let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 0.8;

/** bruit de main : décalage lent + tremblement + petite déformation */
function main(strokes: Stroke[], amp: number): Stroke[] {
  return strokes.map((s) => {
    let ox = gauss() * amp, oy = gauss() * amp;
    return s.map((p) => { ox += gauss() * amp * 0.15; oy += gauss() * amp * 0.15; return { x: p.x + ox + gauss() * amp * 0.3, y: p.y + oy + gauss() * amp * 0.3 }; });
  });
}

function dessiner(s: Sceau, cx: number, cy: number, R: number, amp: number, avecCerne = true): Stroke[] {
  const out: Stroke[] = [];
  if (s.coeur) out.push(...main(placeStrokes(s.coeur.id, 'coeur', 0, s.coeur.inv, cx, cy, R), amp));
  for (const r of s.rameaux) out.push(...main(placeStrokes(r.id, 'rameau', r.angle, r.inv, cx, cy, R), amp));
  for (const n of s.noeuds) out.push(...main(placeStrokes(n.id, 'noeud', n.angle, n.inv, cx, cy, R), amp));
  if (avecCerne) {
    const ring: Stroke = [];
    const gap = s.entaille;
    for (let a = 0; a <= 360; a += 2) {
      if (gap !== null && Math.abs(((a - gap + 540) % 360) - 180) < 12) continue;
      ring.push(polar(cx, cy, R, a + (gap !== null ? 0 : 0)));
    }
    if (gap !== null) { // recoller les deux bouts dans l'ordre
      const i = ring.findIndex((_p, k) => k > 0 && Math.hypot(ring[k].x - ring[k - 1].x, ring[k].y - ring[k - 1].y) > 10);
      if (i > 0) ring.push(...ring.splice(0, i));
    }
    out.push(...main([ring], amp));
  }
  return out;
}

let fails = 0, total = 0;
const check = (cond: boolean, msg: string) => { total++; if (!cond) { fails++; console.log('  ✗', msg); } };

// ---- 1. Reconnaissance isolée de chaque signe, à plusieurs niveaux de bruit
for (const amp of [1.5, 3, 5]) {
  let ok = 0, n = 0;
  const scoresOk: number[] = [];
  for (const fam of [['coeur', COEURS], ['rameau', RAMEAUX], ['noeud', NOEUDS]] as const) {
    for (const sg of fam[1]) for (const inv of fam[0] === 'rameau' ? [false, true] : [false]) {
      for (let k = 0; k < 4; k++) {
        const s: Sceau = { coeur: { id: 'source', inv: false }, rameaux: [], noeuds: [], taille: 2, entaille: null };
        const angle = Math.round(rnd() * 360);
        if (fam[0] === 'coeur') s.coeur = { id: sg.id, inv: false };
        if (fam[0] === 'rameau') s.rameaux = [{ id: sg.id, angle, inv }];
        if (fam[0] === 'noeud') s.noeuds = [{ id: sg.id, angle, inv: k % 2 === 1 }];
        const L = lireTrace(dessiner(s, 300, 300, 200, amp), 600);
        const got = fam[0] === 'coeur' ? L.sceau.coeur : fam[0] === 'rameau' ? L.sceau.rameaux[0] : L.sceau.noeuds[0];
        const want = fam[0] === 'coeur' ? s.coeur : fam[0] === 'rameau' ? s.rameaux[0] : s.noeuds[0];
        n++;
        if (got && want && got.id === want.id && got.inv === want.inv) { ok++; scoresOk.push(got.score ?? 0); }
        else if (amp <= 3) {
          const g = L.groupes.find((x) => x.kind === fam[0]);
          console.log(`  ✗ bruit ${amp} ${fam[0]} ${sg.id}${want?.inv ? '~' : ''} → ${g ? g.label + ' ' + g.score.toFixed(2) + (g.ok ? '' : ' (refusé)') : 'rien'}`);
        }
      }
    }
  }
  const moy = scoresOk.reduce((a, b) => a + b, 0) / scoresOk.length;
  console.log(`Bruit ${amp}px : ${ok}/${n} reconnus (${Math.round((100 * ok) / n)} %), score moyen ${moy.toFixed(2)}, min ${Math.min(...scoresOk).toFixed(2)}`);
  if (amp <= 3) check(ok / n >= 0.9, `taux de reconnaissance à ${amp}px trop faible`);
}

// ---- 2. Sceaux complets
const lance: Sceau = { coeur: { id: 'source', inv: false }, rameaux: [-30, 0, 30].map((a) => ({ id: 'jet', angle: a, inv: false })), noeuds: [{ id: 'visee', angle: 0, inv: false }], taille: 2, entaille: null };
const garde: Sceau = { coeur: { id: 'braise', inv: true }, rameaux: [0, 90, 180, 270].map((a) => ({ id: 'rempart', angle: a, inv: false })), noeuds: [{ id: 'halo', angle: 45, inv: true }, { id: 'sablier', angle: 225, inv: false }], taille: 2, entaille: null };
const piege: Sceau = { coeur: { id: 'socle', inv: false }, rameaux: [45, 135, 225, 315].map((a) => ({ id: 'appel', angle: a, inv: false })), noeuds: [{ id: 'guet', angle: 0, inv: false }], taille: 2, entaille: 180 };

for (const [nom, s] of [['Lance d’eau', lance], ['Garde de givre', garde], ['Piège de sable', piege]] as const) {
  let bons = 0;
  for (let k = 0; k < 6; k++) {
    const L = lireTrace(dessiner(s, 320, 300, 210, 2.5), 640);
    const r = L.sceau;
    const same = r.coeur?.id === s.coeur?.id && r.coeur?.inv === s.coeur?.inv && r.rameaux.length === s.rameaux.length &&
      r.noeuds.length === s.noeuds.length && (r.entaille === null) === (s.entaille === null) &&
      s.rameaux.every((x) => r.rameaux.some((y) => y.id === x.id && y.inv === x.inv && Math.abs(((y.angle - x.angle + 540) % 360) - 180) < 10));
    if (same) bons++;
    else if (k === 0) console.log('  lu :', JSON.stringify({ c: r.coeur, r: r.rameaux.map((x) => x.id + (x.inv ? '~' : '') + '@' + x.angle), n: r.noeuds.map((x) => x.id + (x.inv ? '~' : '') + '@' + x.angle), e: r.entaille }));
  }
  console.log(`${nom} : ${bons}/6 lectures exactes`);
  check(bons >= 5, `${nom} mal lu`);
  const A = analyser(s);
  console.log(`   → ${A.nomSuggere} · ${A.resume} Puissance ${A.puissance} (${A.puissanceLabel}), stabilité ${A.stabilite} %, rang ${A.rang}, difficulté +${A.difficulte}`);
}

// ---- 3. Règles d'analyse
const one = analyser({ ...lance, rameaux: [{ id: 'jet', angle: 90, inv: false }] });
check(one.direction.type === 'cote' && one.direction.label.includes('droite'), 'direction d’un Rameau à droite');
const radial = analyser({ ...lance, rameaux: [0, 90, 180, 270].map((a) => ({ id: 'jet', angle: a, inv: false })) });
check(radial.direction.type === 'radiale', 'répartition radiale');
const axe = analyser({ ...lance, rameaux: [90, 270].map((a) => ({ id: 'jet', angle: a, inv: false })) });
check(axe.direction.type === 'axe', 'symétrie bilatérale');
const asym = analyser({ ...lance, rameaux: [{ id: 'jet', angle: 0, inv: false }, { id: 'dard', angle: 100, inv: false }, { id: 'plume', angle: 200, inv: false }] });
check(asym.stabilite < 70, 'asymétrie pénalisée');
check(analyser(piege).actif === false && analyser(piege).pret, 'entaille = sort préparé');
check(analyser({ ...lance, coeur: { id: 'chair', inv: false } }).interdit, 'Cœur scellé interdit');

// reconnaissance : un rameau tête-bêche doit être lu inversé
const t = reconnaitre(placeStrokes('dard', 'rameau', 0, true, 0, 0, 200).map((s) => s), 'rameau');
check(!!t && t.id === 'dard' && t.inv, 'Dard retourné lu comme Parade');

// ---- 4. Verrou MJ et descriptions
for (const [nom, s] of [['Lance', lance], ['Garde', garde], ['Piège', piege]] as const) {
  const d = decrire(s, analyser(s));
  console.log(`\n${nom} : ${d.accroche}\n  ${d.formes.join('\n  ')}\n  ${d.impact}\n  ${d.reglages.join(' | ')}\n  ${d.stats.map((x) => x.label + ' ' + x.valeur).join(' · ')}`);
  check(d.formes.every((x) => x.length > 20), `description de ${nom}`);
}
// toutes les combinaisons Cœur × Rameau produisent une phrase
for (const c of COEURS) for (const inv of [false, true]) for (const r of RAMEAUX) for (const ri of [false, true]) {
  const s: Sceau = { coeur: { id: c.id, inv }, rameaux: [{ id: r.id, angle: 0, inv: ri }], noeuds: [], taille: 2, entaille: null };
  const d = decrire(s, analyser(s));
  if (!d.formes[0] || d.formes[0].includes('undefined')) check(false, `phrase manquante ${c.id}${inv ? '~' : ''} × ${r.id}${ri ? '~' : ''}`);
}

// ---- 5. Grimoire de base et générateur
for (const g of GRIMOIRE_DE_BASE) {
  const a = analyser(g.sceau);
  check(a.stabilite >= 80 && !a.alertes.some((x) => x.includes('contredisent')), `sort de base ${g.nom} instable`);
}
let rateGen = 0;
for (let i = 0; i < 300; i++) {
  const r = (1 + (i % 3)) as 1 | 2 | 3;
  const g = generer({ intention: 'Hasard', rangMax: r, coeur: 'hasard', scelles: i % 2 === 0 });
  const a = analyser(g.sceau);
  if (a.rang > r || a.stabilite < 75 || JSON.stringify(decrire(g.sceau, a)).includes('undefined')) rateGen++;
}
check(rateGen === 0, `générateur : ${rateGen} sorts incohérents`);
console.log(`Grimoire de base : ${GRIMOIRE_DE_BASE.length} sorts · générateur : 300 sorts testés`);

console.log(`\n${total - fails}/${total} vérifications réussies`);
if (fails) process.exit(1);
