// Notation d'un tracé par rapport à un sceau modèle (défis et leçons).
import { SIGNE } from '../data/signes';
import { analyser } from './analyse';
import type { Placement, Sceau } from './types';

export interface Notation {
  score: number;          // 0..100
  mention: 'Parfait' | 'Réussi' | 'Passable' | 'Raté';
  details: { label: string; points: number; max: number; note: string }[];
}

const ecart = (a: number, b: number) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return Math.min(d, 360 - d); };

/** Associe les placements lus aux placements attendus, en autorisant une rotation d'ensemble du sceau. */
function apparier(attendus: Placement[], lus: Placement[], tol = 25): { trouves: number; enTrop: number; manquants: string[] } {
  if (!attendus.length) return { trouves: 0, enTrop: lus.length, manquants: [] };
  const decalages = new Set<number>([0]);
  for (const a of attendus) for (const l of lus) if (a.id === l.id && a.inv === l.inv) decalages.add(Math.round(l.angle - a.angle));
  let meilleur = { trouves: -1, enTrop: 0, manquants: [] as string[] };
  for (const dec of decalages) {
    const libres = [...lus];
    let trouves = 0;
    const manquants: string[] = [];
    for (const a of attendus) {
      const i = libres.findIndex((l) => l.id === a.id && l.inv === a.inv && ecart(l.angle, a.angle + dec) <= tol);
      if (i >= 0) { trouves++; libres.splice(i, 1); } else manquants.push(a.inv ? SIGNE[a.id].nomInverse : SIGNE[a.id].nom);
    }
    if (trouves > meilleur.trouves) meilleur = { trouves, enTrop: libres.length, manquants };
  }
  return meilleur;
}

export function noter(modele: Sceau, lu: Sceau): Notation {
  const details: Notation['details'] = [];
  // Cœur
  const okC = !!lu.coeur && !!modele.coeur && lu.coeur.id === modele.coeur.id && lu.coeur.inv === modele.coeur.inv;
  details.push({ label: 'Cœur', points: okC ? 25 : 0, max: 25, note: okC ? 'Juste' : lu.coeur ? `Attendu : ${modele.coeur ? (modele.coeur.inv ? SIGNE[modele.coeur.id].nomInverse : SIGNE[modele.coeur.id].nom) : '—'}` : 'Absent' });
  // Rameaux (couronne comprise)
  const rA = [...modele.rameaux, ...(modele.couronne?.rameaux ?? [])], rL = [...lu.rameaux, ...(lu.couronne?.rameaux ?? [])];
  const r = apparier(rA, rL);
  const pr = rA.length ? Math.max(0, Math.round(35 * (r.trouves - r.enTrop * 0.5) / rA.length)) : (rL.length ? 20 : 35);
  details.push({ label: 'Rameaux', points: pr, max: 35, note: `${r.trouves}/${rA.length} bien placés${r.enTrop ? `, ${r.enTrop} en trop` : ''}${r.manquants.length ? ` · manquants : ${[...new Set(r.manquants)].join(', ')}` : ''}` });
  // Nœuds
  const nA = [...modele.noeuds, ...(modele.couronne?.noeuds ?? [])], nL = [...lu.noeuds, ...(lu.couronne?.noeuds ?? [])];
  const n = apparier(nA, nL, 35);
  const pn = nA.length ? Math.max(0, Math.round(15 * (n.trouves - n.enTrop * 0.5) / nA.length)) : (nL.length ? 8 : 15);
  details.push({ label: 'Nœuds', points: pn, max: 15, note: nA.length ? `${n.trouves}/${nA.length}${n.manquants.length ? ` · manquants : ${[...new Set(n.manquants)].join(', ')}` : ''}` : nL.length ? 'Aucun attendu' : 'Juste' });
  // Cerne
  const etat = (s: Sceau) => (s.fendu ? 'fendu' : s.entaille !== null ? 'entaille' : 'fermée') + (s.couronne ? '+double' : '');
  const okE = etat(modele) === etat(lu);
  details.push({ label: 'Cerne', points: okE ? 5 : 0, max: 5, note: okE ? 'Juste' : `Attendu : ${etat(modele)}` });
  // Qualité du tracé
  const a = analyser(lu);
  const q = Math.round(20 * (a.stabilite / 100) * (lu.trace ? (0.5 + lu.trace.nettete / 2) : 1));
  details.push({ label: 'Qualité', points: q, max: 20, note: `Stabilité ${a.stabilite} %${lu.trace ? `, netteté ${Math.round(lu.trace.nettete * 100)} %` : ''}` });

  const score = Math.max(0, Math.min(100, details.reduce((s, d) => s + d.points, 0)));
  const mention = score >= 90 ? 'Parfait' : score >= 75 ? 'Réussi' : score >= 50 ? 'Passable' : 'Raté';
  return { score, mention, details };
}

/** Temps en texte : 1 min 05,3 s */
export function formatTemps(ms: number): string {
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  const r = (s - m * 60).toFixed(1).replace('.', ',');
  return m ? `${m} min ${r.padStart(4, '0')} s` : `${r} s`;
}
