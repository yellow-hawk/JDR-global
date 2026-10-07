// Tests v0.6 : profils de PJ, notation des défis, leçons lisibles, signes inconnus, calibrage.
import { traitsDuSceau, type Stroke } from '../engine/geometry';
import { lireTrace } from '../engine/freehand';
import { noter } from '../engine/defi';
import { modelesPerso } from '../engine/recognizer';
import { nouveauProfil, peutInscrire, verifierSort, signesDuSceau } from '../engine/profils';
import { LECONS } from '../data/lecons';
import { SIGNE } from '../data/signes';
import { GRIMOIRE_DE_BASE } from '../data/grimoire';
import type { Sceau } from '../engine/types';

let ok = 0, total = 0;
const check = (c: boolean, m: string) => { total++; if (c) ok++; else console.log('  ✗', m); };
const bruit = (st: Stroke[], a = 2) => st.map((s) => s.map((p) => ({ x: p.x + (Math.random() - 0.5) * a, y: p.y + (Math.random() - 0.5) * a })));
const dessiner = (s: Sceau): Stroke[] => {
  if (!s.greffe) return traitsDuSceau(s, 300, 300, 212);
  return [...traitsDuSceau(s, 150, 300, 120), ...traitsDuSceau(s.greffe, 450, 300, 120), [{ x: 270, y: 300 }, { x: 300, y: 300 }, { x: 330, y: 300 }]];
};

// Profil
const p = nouveauProfil('Coco', 'Léa');
check(p.signes.length === 10 && p.emplacements === 5 && p.rang === 1, 'profil de départ');
const feu = GRIMOIRE_DE_BASE.find((s) => signesDuSceau(s.sceau).every((i) => p.signes.includes(i)) && !s.sceau.couronne && !s.sceau.greffe && !s.sceau.fendu)!;
check(!!feu && peutInscrire(p, feu.sceau).ok, `sort inscriptible (${feu?.nom})`);
const plein = { ...p, grimoire: Array.from({ length: 5 }, (_, i) => ({ id: 'x' + i, nom: 'x', notes: '', sceau: feu.sceau, cree: 0 })) };
check(!peutInscrire(plein, feu.sceau).ok, 'grimoire plein refusé');
const tech = GRIMOIRE_DE_BASE.find((s) => s.id === 'ex-tornade-ardente')!;
check(verifierSort(p, tech.sceau).technique, 'double cerne trop avancée pour un apprenti');

// Leçons : le modèle tracé proprement doit valider (≥ 70)
let lecOk = 0;
for (const l of LECONS) {
  const L = lireTrace(bruit(dessiner(l.modele)), 600);
  const n = noter(l.modele, L.sceau);
  if (n.score >= 70) lecOk++; else console.log(`  · leçon ${l.id} : ${n.score} (${n.details.map((d) => d.label + ' ' + d.points + '/' + d.max).join(', ')})`);
}
check(lecOk === LECONS.length, `leçons validables ${lecOk}/${LECONS.length}`);

// Notation : tracé vide = raté ; tracé parfait ≥ 90
const m = LECONS[0].modele;
check(noter(m, lireTrace([], 600).sceau).mention === 'Raté', 'vide = raté');
check(noter(m, lireTrace(dessiner(m), 600).sceau).score >= 90, 'propre ≥ 90');

// Signes inconnus : lus mais sans effet
{
  const s: Sceau = { coeur: { id: 'braise', inv: false }, rameaux: [{ id: 'dard', angle: 0, inv: false }, { id: 'jet', angle: 180, inv: false }], noeuds: [], taille: 2, entaille: null };
  const L = lireTrace(bruit(dessiner(s)), 600, 1, { connus: new Set(p.signes) });
  check(L.inconnus.includes('dard'), 'Dard signalé inconnu');
  check(!L.sceau.rameaux.some((r) => r.id === 'dard') && L.sceau.rameaux.some((r) => r.id === 'jet'), 'Dard sans effet, Jet actif');
}

// Calibrage : un « Jet » tracé comme une simple croix est appris
{
  const croix: Stroke[] = [[{ x: 30, y: 30 }, { x: 70, y: 70 }], [{ x: 70, y: 30 }, { x: 30, y: 70 }]];
  const perso = modelesPerso('t', { jet: [croix, croix] }, (id) => SIGNE[id].famille);
  check(perso.rameau.length === 4, 'modèles perso + inversés');
}

console.log(`\n${ok}/${total} tests profils/défis`);
if (ok !== total) process.exit(1);
