// Générateur de sorts : compose un sceau cohérent (symétrique, Nœuds adaptés à l'intention) avec une part de hasard.
import { COEURS, SIGNE, type Rang } from '../data/signes';
import { analyser } from './analyse';
import type { Placement, Sceau, Taille } from './types';

export const INTENTIONS = ['Hasard', 'Attaque', 'Défense', 'Contrôle', 'Déplacement', 'Utilitaire', 'Piège'] as const;
export type Intention = (typeof INTENTIONS)[number];

export interface OptionsGenerateur {
  intention: Intention;
  rangMax: Rang;
  coeur: string; // id, 'hasard' ou 'hasard-element'
  scelles: boolean;
}

type F = [string, boolean]; // [rameau, inversé]
const FORMES: Record<Exclude<Intention, 'Hasard'>, F[]> = {
  Attaque: [['jet', false], ['dard', false], ['pluie', false], ['gerbe', false], ['figure', false], ['tourbillon', false], ['appel', true]],
  Défense: [['rempart', false], ['dard', true], ['figure', true], ['plume', true], ['tourbillon', true]],
  Contrôle: [['appel', false], ['appel', true], ['etau', false], ['tisse', false], ['plume', true], ['tourbillon', false], ['etau', true]],
  Déplacement: [['plume', false], ['jet', false], ['tisse', false]],
  Utilitaire: [['etau', true], ['gerbe', false], ['plume', false], ['ampleur', false], ['ampleur', true], ['tisse', true], ['jet', false], ['appel', false]],
  Piège: [['gerbe', false], ['appel', false], ['etau', false], ['pluie', true], ['plume', true]],
};
type NN = [string, boolean, number]; // [nœud, inversé, probabilité]
const NOEUDS_INT: Record<Exclude<Intention, 'Hasard'>, NN[]> = {
  Attaque: [['visee', false, 0.6], ['sablier', true, 0.2], ['douce', true, 0.15], ['echo', false, 0.2]],
  Défense: [['sablier', false, 0.6], ['halo', true, 0.4], ['fenetre', false, 0.15]],
  Contrôle: [['halo', false, 0.5], ['sablier', false, 0.4], ['echo', false, 0.2], ['fenetre', true, 0.2]],
  Déplacement: [['fenetre', false, 0.7], ['sablier', false, 0.5], ['sablier', true, 0.2]],
  Utilitaire: [['fenetre', false, 0.6], ['sablier', false, 0.5], ['douce', false, 0.4], ['mot', false, 0.15]],
  Piège: [['guet', false, 0.9], ['fenetre', true, 0.3], ['echo', false, 0.2]],
};

const EPITHETES = ['du Veilleur', 'de l’Aube', 'des Brumes', 'du Héron', 'de la Forge', 'des Anciens', 'du Passeur', 'de Minuit', 'des Moissons', 'du Silence', 'de l’Écluse', 'du Colporteur', 'des Lisières', 'de la Tour', 'du Gué'];

export function generer(o: OptionsGenerateur, rnd: () => number = Math.random): { sceau: Sceau; nom: string; intention: Intention } {
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const intention: Exclude<Intention, 'Hasard'> = o.intention === 'Hasard' ? pick(INTENTIONS.slice(1) as Exclude<Intention, 'Hasard'>[]) : o.intention;

  // Cœur
  let coeurs = COEURS.filter((c) => c.rang <= o.rangMax && (o.scelles || c.categorie !== 'scelle'));
  if (o.coeur === 'hasard-element') coeurs = coeurs.filter((c) => c.categorie === 'element');
  const cId = o.coeur.startsWith('hasard') ? pick(coeurs).id : o.coeur;
  const coeur = { id: cId, inv: rnd() < 0.3 };

  // Formes
  const pool = FORMES[intention].filter(([id]) => SIGNE[id].rang <= o.rangMax);
  const [fId, fInv] = pick(pool.length ? pool : [['jet', false] as F]);
  const n = 1 + Math.floor(rnd() * 4);
  let rameaux: Placement[];
  const depart = Math.round(rnd() * 8) * 45;
  const groupe = intention === 'Attaque' || (intention === 'Déplacement' && fId === 'jet' && rnd() < 0.3) ? rnd() < 0.75 : rnd() < 0.2;
  if (groupe) {
    const ecart = 25;
    rameaux = Array.from({ length: n }, (_, k) => ({ id: fId, inv: fInv, angle: (depart + (k - (n - 1) / 2) * ecart + 360) % 360 }));
  } else {
    const m = Math.max(2, n);
    rameaux = Array.from({ length: m }, (_, k) => ({ id: fId, inv: fInv, angle: (depart + (k * 360) / m) % 360 }));
  }
  // forme secondaire, placée en miroir pour garder la symétrie
  if (o.rangMax >= 2 && rnd() < 0.35 && !groupe) {
    const autres = pool.filter(([id, inv]) => !(id === fId && inv === fInv));
    if (autres.length) {
      const [sId, sInv] = pick(autres);
      const m = rameaux.length;
      const pas = 360 / m;
      rameaux = rameaux.concat(rameaux.length === 2
        ? [{ id: sId, inv: sInv, angle: (depart + 90) % 360 }, { id: sId, inv: sInv, angle: (depart + 270) % 360 }]
        : Array.from({ length: m }, (_, k) => ({ id: sId, inv: sInv, angle: (depart + pas / 2 + k * pas) % 360 })));
    }
  }

  // Nœuds : posés dans les intervalles libres de la cerne
  const libres = (a: number) => rameaux.every((r) => Math.min(Math.abs(r.angle - a) % 360, 360 - (Math.abs(r.angle - a) % 360)) > 12);
  const noeuds: Placement[] = [];
  const angleLibre = () => {
    for (let t = 0; t < 24; t++) { const a = Math.round(rnd() * 24) * 15 % 360; if (libres(a) && noeuds.every((x) => Math.abs(x.angle - a) > 20)) return a; }
    return (depart + 180) % 360;
  };
  for (const [id, inv, p] of NOEUDS_INT[intention]) {
    if (SIGNE[id].rang > o.rangMax || rnd() > p) continue;
    if (noeuds.some((x) => x.id === id)) continue;
    const a = id === 'visee' && groupe ? depart : angleLibre();
    noeuds.push({ id, inv, angle: a });
  }
  const taille = (1 + Math.floor(rnd() * 3)) as Taille;
  const entaille = intention === 'Piège' && rnd() < 0.6 ? (depart + 180) % 360 : null;
  const sceau: Sceau = { coeur, rameaux, noeuds, taille, entaille };

  const a = analyser(sceau);
  const nom = `${a.nomSuggere} ${pick(EPITHETES)}`;
  return { sceau, nom, intention };
}

