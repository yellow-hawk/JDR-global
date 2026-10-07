// Moteur de lecture : transforme un sceau (Cœur, Rameaux, Nœuds, cerne) en fiche de sort.
import { SIGNE, nomSigne, type Rang } from '../data/signes';
import type { Placement, Sceau } from './types';
import { titreSort } from './noms';

export type TypeDirection = 'aucune' | 'radiale' | 'cote' | 'axe';

export interface Forme { id: string; inv: boolean; nom: string; effet: string; nombre: number }

export interface Analyse {
  actif: boolean;
  pret: boolean; // tout est là sauf la fermeture de la cerne
  coeur: { nom: string; effet: string; matiere: string; couleur: string; categorie: string } | null;
  formes: Forme[];
  direction: { type: TypeDirection; angle: number; label: string };
  puissance: number;
  puissanceLabel: string;
  stabilite: number;
  stabiliteLabel: string;
  duree: string;
  dureeSecondes: number; // pour l'animation
  portee: string;
  cible: string;
  declencheur: string;
  rythme: string | null;
  rang: Rang;
  difficulte: number;
  interdit: boolean;
  alertes: string[];
  resume: string;
  nomSuggere: string;
  /** techniques avancées */
  technique: { couronne: boolean; fendu: boolean; greffe: null | { mode: 'renfort' | 'annulation' | 'combinaison'; analyse: Analyse } };
}

const MATIERE: Record<string, [string, string]> = {
  braise: ['feu', 'glace'], source: ['eau', 'sécheresse'], socle: ['pierre', 'poussière'],
  souffle: ['vent', 'calme'], lueur: ['lumière', 'ombre'], memoire: ['mémoire', 'usure'],
  regard: ['regard', 'voile'], lien: ['lien', 'rupture'], mouvement: ['mouvement', 'arrêt'],
  seve: ['sève', 'flétrissure'], chair: ['chair', 'figement'], esprit: ['esprit', 'réminiscence'],
};


const COMPAS = ['le haut', 'le haut-droite', 'la droite', 'le bas-droite', 'le bas', 'le bas-gauche', 'la gauche', 'le haut-gauche'];
const AXES = ['haut ↔ bas', 'diagonale haut-droite ↔ bas-gauche', 'gauche ↔ droite', 'diagonale haut-gauche ↔ bas-droite'];

const norm = (a: number) => ((a % 360) + 360) % 360;
const ecart = (a: number, b: number) => { const d = Math.abs(norm(a) - norm(b)); return Math.min(d, 360 - d); };
const rad = (a: number) => (a * Math.PI) / 180;

/** Symétrie par réflexion : part des Rameaux qui ont un jumeau miroir (même signe, même sens). 0..1 */
export function symetrie(rameaux: Placement[]): number {
  const n = rameaux.length;
  if (n <= 1) return 1;
  const axes: number[] = [];
  const angles = rameaux.map((r) => norm(r.angle)).sort((a, b) => a - b);
  angles.forEach((a, i) => {
    const b = angles[(i + 1) % n] + (i + 1 === n ? 360 : 0);
    axes.push(a, (a + b) / 2);
  });
  let meilleur = 0;
  for (const axe of axes) {
    let ok = 0;
    for (const r of rameaux) {
      const miroir = 2 * axe - r.angle;
      if (rameaux.some((o) => o.id === r.id && o.inv === r.inv && ecart(o.angle, miroir) <= 12)) ok++;
    }
    meilleur = Math.max(meilleur, ok / n);
  }
  return meilleur;
}

export function direction(rameaux: Placement[]): Analyse['direction'] {
  const n = rameaux.length;
  if (n === 0) return { type: 'aucune', angle: 0, label: 'sur place, au-dessus du sceau' };
  let x = 0, y = 0, x2 = 0, y2 = 0;
  for (const r of rameaux) {
    x += Math.sin(rad(r.angle)); y += Math.cos(rad(r.angle));
    x2 += Math.sin(rad(2 * r.angle)); y2 += Math.cos(rad(2 * r.angle));
  }
  const m = Math.hypot(x, y) / n;
  if (m >= 0.3) {
    const a = norm((Math.atan2(x, y) * 180) / Math.PI);
    return { type: 'cote', angle: a, label: `vers ${COMPAS[Math.round(a / 45) % 8]} de la feuille` };
  }
  if (n >= 2 && Math.hypot(x2, y2) / n > 0.8) {
    const a = norm((Math.atan2(x2, y2) * 180) / Math.PI / 2);
    return { type: 'axe', angle: a, label: `dans les deux sens, axe ${AXES[Math.round(a / 45) % 4]}` };
  }
  return { type: 'radiale', angle: 0, label: 'en s’élevant au-dessus du sceau' };
}

const compte = (ps: Placement[], id: string, inv?: boolean) =>
  ps.filter((p) => p.id === id && (inv === undefined || p.inv === inv)).length;

const libellePuissance = (p: number) => (p <= 2 ? 'Faible' : p <= 5 ? 'Moyenne' : p <= 8 ? 'Forte' : 'Écrasante');

export function analyser(s: Sceau): Analyse {
  const alertes: string[] = [];
  const C = s.couronne ?? null;
  const N = C ? [...s.noeuds, ...C.noeuds] : s.noeuds;
  const has = (id: string, inv: boolean) => compte(N, id, inv) > 0;

  // ---- Cœur
  let coeur: Analyse['coeur'] = null;
  if (s.coeur) {
    const sg = SIGNE[s.coeur.id];
    coeur = {
      nom: nomSigne(s.coeur.id, s.coeur.inv),
      effet: s.coeur.inv ? sg.effetInverse : sg.effet,
      matiere: MATIERE[s.coeur.id][s.coeur.inv ? 1 : 0],
      couleur: sg.couleurs![s.coeur.inv ? 1 : 0],
      categorie: sg.categorie!,
    };
  } else alertes.push('Aucun Cœur : le sceau n’a pas d’élément et ne produira rien.');
  const interdit = !!s.coeur && SIGNE[s.coeur.id].categorie === 'scelle';
  if (interdit) alertes.push('Cœur scellé : magie interdite. Elle agit sur le vivant.');

  // ---- Formes
  const map = new Map<string, Forme>();
  for (const r of C ? [...s.rameaux, ...C.rameaux] : s.rameaux) {
    const k = r.id + (r.inv ? '~' : '');
    const f = map.get(k) ?? { id: r.id, inv: r.inv, nom: nomSigne(r.id, r.inv), effet: r.inv ? SIGNE[r.id].effetInverse : SIGNE[r.id].effet, nombre: 0 };
    f.nombre++;
    map.set(k, f);
  }
  const formes = [...map.values()].sort((a, b) => b.nombre - a.nombre);
  for (const f of formes) {
    if (formes.some((g) => g.id === f.id && g.inv !== f.inv) && !f.inv)
      alertes.push(`${f.nom} et ${nomSigne(f.id, true)} sont tous deux tracés : leurs effets s’annulent en partie.`);
  }
  const dir = direction(s.rameaux);

  // ---- Puissance
  const principal = formes[0]?.nombre ?? 1;
  let puissance = Math.min(principal, 4) * s.taille;
  if (has('visee', true)) puissance += 1;
  if (has('sablier', true)) puissance += 2;
  if (has('douce', true)) puissance += 2;
  if (has('douce', false)) puissance = Math.max(1, puissance - 2);
  if (has('echo', true)) puissance += 1;
  if (C && C.rameaux.length) puissance += 2;
  puissance = Math.max(1, Math.min(12, puissance));

  // ---- Stabilité
  let stab = 100;
  const sym = symetrie(s.rameaux);
  stab -= (1 - sym) * 45;
  if (sym < 0.99 && s.rameaux.length > 1) alertes.push('Rameaux asymétriques : le sort risque de dériver ou de se retourner.');
  if (formes.length > 2) { stab -= (formes.length - 2) * 15; alertes.push('Plus de deux formes différentes : le sceau devient difficile à tenir.'); }
  if (has('douce', true)) stab -= 20;
  for (const [a, b, label] of [['sablier', 'sablier', 'Sablier et Fulgurance'], ['visee', 'visee', 'Visée et Repli'], ['fenetre', 'fenetre', 'Fenêtre et Seuil'], ['douce', 'douce', 'Braise-douce et Attise']] as const) {
    if (has(a, false) && has(b, true)) { stab -= 10; alertes.push(`${label} se contredisent.`); }
  }
  if (C) {
    stab -= (1 - symetrie(C.rameaux)) * 25;
    if (C.rameaux.length + C.noeuds.length === 0) alertes.push('Double cerne vide : tracez des signes entre les deux anneaux.');
  }
  if (s.trace) {
    stab -= (1 - s.trace.nettete) * 30;
    stab -= (1 - s.trace.rondeur) * 25;
    stab -= s.trace.illisibles * 10;
    if (s.trace.illisibles) alertes.push(`${s.trace.illisibles} tracé(s) illisible(s) : ils perturbent le sceau.`);
    if (s.trace.rondeur < 0.7) alertes.push('Cerne irrégulière : le sort fuit.');
  }
  const stabilite = Math.round(Math.max(0, Math.min(100, stab)));
  const stabiliteLabel = stabilite >= 85 ? 'Stable' : stabilite >= 60 ? 'Correct' : stabilite >= 35 ? 'Instable' : 'Dangereux';

  // ---- Durée
  const nSab = compte(N, 'sablier', false);
  let palier = nSab; // 0: quelques tours, 1: scène, 2: heure, 3: journée
  if (s.trace && s.trace.nettete < 0.6) palier = Math.max(-1, palier - 1);
  let duree = ['Quelques instants', 'Quelques tours (environ 1 minute)', 'Une scène (environ 10 minutes)', 'Une heure', 'Une journée'][Math.min(4, palier + 1)];
  let dureeSecondes = [2.5, 4, 6, 8, 10][Math.min(4, palier + 1)];
  if (has('sablier', true)) { duree = 'Instantané'; dureeSecondes = 1.6; }

  // ---- Portée, cible, déclencheur, rythme
  const nVis = compte(N, 'visee', false);
  let portee = ['Courte (quelques mètres)', 'Moyenne (une vingtaine de mètres)', 'Longue (une centaine de mètres)', 'Très longue (à vue)'][Math.min(3, nVis)];
  if (has('visee', true)) portee = 'Contact : l’effet reste collé au sceau';
  let cible = 'L’effet se manifeste depuis le sceau';
  if (has('fenetre', false)) cible = 'Le support du sceau (l’objet sur lequel il est tracé)';
  if (has('fenetre', true)) cible = 'Ce qui touche ou approche le sceau';
  if (has('halo', false)) cible = `Toute une zone autour du sceau (rayon d’environ ${s.taille * 3} m)`;
  if (has('halo', true)) cible = `Une zone autour du sceau (rayon d’environ ${s.taille * 3} m), en épargnant le centre`;
  const decl: string[] = [];
  if (has('guet', false)) decl.push('au passage de quelqu’un');
  if (has('guet', true)) decl.push('actif seulement quand personne n’est là');
  if (has('mot', false)) decl.push('sur un mot convenu');
  if (has('mot', true)) decl.push('se coupe sur un mot convenu');
  const declencheur = decl.length ? decl.join(', ') : 'À la fermeture de la cerne';
  const nEcho = compte(N, 'echo', false);
  const rythme = nEcho ? `Pulsations (${nEcho + 1} fois)` : has('echo', true) ? 'Charge puis libère tout d’un coup' : null;

  // ---- Rang et difficulté
  const tous = [...s.rameaux, ...s.noeuds, ...(C ? [...C.rameaux, ...C.noeuds] : [])];
  let rang = Math.max(s.coeur ? SIGNE[s.coeur.id].rang : 1, ...tous.map((p) => SIGNE[p.id].rang)) as Rang;
  if (C || s.greffe) rang = 3; else if (s.fendu && rang < 2) rang = 2;
  let difficulte = rang - 1 + Math.max(0, tous.length - 4) + (C ? 1 : 0) + (s.greffe ? 1 : 0);

  // ---- Cerne
  const pret = !!s.coeur && !s.sansCerne;
  if (s.sansCerne) alertes.unshift('Pas de cerne : tracez l’anneau autour du sceau.');
  else if (s.fendu) alertes.unshift('Sceau fendu : il ne s’éveille que lorsque ses deux moitiés se rejoignent.');
  else if (s.entaille !== null) alertes.unshift('Cerne ouverte (entaille) : sort préparé. Fermez-la pour l’activer.');
  const actif = pret && s.entaille === null && !s.fendu;

  // ---- Greffe : deux sceaux reliés
  let greffe: Analyse['technique']['greffe'] = null;
  if (s.greffe) {
    const ag = analyser(s.greffe);
    const memeCoeur = !!s.coeur && !!s.greffe.coeur && s.coeur.id === s.greffe.coeur.id;
    const inverse = memeCoeur && s.coeur!.inv !== s.greffe.coeur!.inv;
    const memesFormes = memeCoeur && !inverse && ag.formes.map((f) => f.id + f.inv).sort().join() === formes.map((f) => f.id + f.inv).sort().join();
    const mode = inverse ? 'annulation' : memesFormes ? 'renfort' : 'combinaison';
    greffe = { mode, analyse: ag };
    if (mode === 'renfort') { puissance = Math.min(16, puissance + Math.ceil(ag.puissance * 0.75) + 1); alertes.push('Greffe de sceaux identiques : les puissances s’additionnent.'); }
    else if (mode === 'annulation') { puissance = Math.max(0, puissance - ag.puissance); alertes.push('Greffe d’un sort et de son inverse : ils s’annulent.'); }
    rang = Math.max(rang, ag.rang) as Rang;
    difficulte += ag.difficulte;
  }

  // ---- Résumé
  const matiere = coeur?.matiere ?? '…';
  const formeTxt = formes.length ? formes.map((f) => `${f.nom}${f.nombre > 1 ? ` ×${f.nombre}` : ''}`).join(' + ') : 'sans forme';
  const resume = coeur
    ? `${coeur.nom} (${matiere}) · ${formeTxt}. L’effet part ${dir.label}.`
    : 'Tracez ou placez un Cœur au centre pour donner un élément au sceau.';
  const nomSuggere = coeur ? titreSort(s, formes, dir.type === 'radiale' || dir.type === 'aucune') : 'Sceau sans nom';

  return {
    actif, pret, coeur, formes, direction: dir, puissance, puissanceLabel: libellePuissance(puissance), stabilite: greffe && greffe.mode === 'combinaison' ? Math.max(0, stabilite - 10) : stabilite, stabiliteLabel,
    duree, dureeSecondes, portee, cible, declencheur, rythme, rang, difficulte, interdit, alertes, resume, nomSuggere,
    technique: { couronne: !!C, fendu: !!s.fendu, greffe },
  };
}
