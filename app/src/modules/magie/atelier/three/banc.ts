// Disposition du banc d'essai : quels corps externes, et où, selon le sort.
import * as THREE from 'three';
import type { Analyse } from '../engine/analyse';
import type { Valeurs } from '../engine/effets';
import type { Sceau } from '../engine/types';
import { creerCible, libererCible, majCible, type Cible, type Fx, type TypeCible } from './cibles';

export type ChoixCibles = 'auto' | 'mannequins' | 'objets' | 'nature' | 'aucune';

export interface Banc {
  cibles: Cible[];
  support: Cible | null;   // objet posé sur le sceau (Fenêtre, Plume, Ampleur…)
  protege: Cible | null;   // mannequin au centre (sorts de défense)
  intrus: Cible | null;    // mannequin qui s'approche (Guet)
  departs: THREE.Vector3[];
  update(dt: number, t: number): void;
  dispose(): void;
}

const horiz = (deg: number) => new THREE.Vector3(Math.sin((deg * Math.PI) / 180), 0, -Math.cos((deg * Math.PI) / 180));
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export function construireBanc(scene: THREE.Scene, sceau: Sceau | null, A: Analyse | null, V: Valeurs | null, Rw: number, choix: ChoixCibles, fx: Fx): Banc {
  const cibles: Cible[] = [];
  const poser = (type: TypeCible, p: THREE.Vector3, rotY = Math.random() * 6.28) => {
    const c = creerCible(type);
    c.g.position.copy(p); c.corps.rotation.y = rotY;
    scene.add(c.g); cibles.push(c);
    return c;
  };
  const noeud = (id: string, inv: boolean) => !!sceau?.noeuds.some((n) => n.id === id && n.inv === inv);
  const formes = new Set((A?.formes ?? []).map((f) => f.id + (f.inv ? '~' : '')));
  const coeur = sceau?.coeur?.id ?? '';

  // types à poser
  let types: TypeCible[];
  switch (choix) {
    case 'mannequins': types = ['mannequin', 'mannequin', 'mannequin', 'mannequin', 'mannequin']; break;
    case 'objets': types = ['caisse', 'tonneau', 'caisse', 'coffre', 'pilier', 'tourniquet']; break;
    case 'nature': types = ['arbre', 'arbre', 'flaque', 'brasero', 'arbre', 'flaque']; break;
    case 'aucune': types = []; break;
    default: {
      types = ['mannequin', 'caisse', 'tonneau', 'arbre', 'brasero', 'flaque', 'pilier', 'mannequin'];
      if (coeur === 'lien') types.push('coffre');
      if (coeur === 'mouvement') types.push('tourniquet');
      if (coeur === 'regard' || coeur === 'lueur') types.push('gemme');
      if (formes.has('rempart~')) types.unshift('pilier');
    }
  }

  // positions
  const W = clamp(V?.portee || 4, 2.6, 7.5);
  const dirType = A?.direction.type ?? 'radiale';
  const angle = A?.direction.angle ?? 0;
  const places: THREE.Vector3[] = [];
  if (dirType === 'cote') {
    // en éventail devant le sceau : les premiers sont dans l'axe
    const plan: [number, number][] = [[0, 0.62], [14, 0.95], [-16, 0.8], [30, 0.6], [-32, 0.55], [-8, 1.08], [42, 0.9], [-45, 0.95], [22, 1.15], [-26, 1.2]];
    for (const [da, df] of plan) places.push(horiz(angle + da).multiplyScalar(Math.max(Rw + 1.2, W * df)));
  } else if (dirType === 'axe') {
    const plan: [number, number][] = [[0, 0.7], [180, 0.7], [16, 1.05], [196, 1.05], [-20, 0.95], [160, 0.95], [90, 0.6], [270, 0.6], [35, 0.6], [215, 0.6]];
    for (const [da, df] of plan) places.push(horiz(angle + da).multiplyScalar(Math.max(Rw + 1.2, W * df)));
  } else {
    const n = Math.max(types.length, 6);
    for (let i = 0; i < n; i++) places.push(horiz((i * 360) / n + 20).multiplyScalar(Rw + 1.3 + (i % 2) * 1.1));
  }
  types.forEach((t, i) => { if (places[i]) poser(t, places[i]); });

  // objet sur le sceau
  let support: Cible | null = null;
  const avecSupport = noeud('fenetre', false) || ['plume', 'plume~', 'ampleur', 'ampleur~', 'tisse~', 'etau'].some((k) => formes.has(k))
    || (['memoire', 'mouvement', 'lien'].includes(coeur) && !formes.size);
  const defense = ['rempart', 'dard~', 'figure~'].some((k) => formes.has(k)) || noeud('halo', true);
  let protege: Cible | null = null;
  if (avecSupport) support = poser(coeur === 'lien' && sceau?.coeur?.inv ? 'coffre' : coeur === 'mouvement' && sceau?.coeur?.inv ? 'tourniquet' : 'caisse', new THREE.Vector3(0, 0, 0), 0.3);
  else if (defense && dirType !== 'cote') protege = poser('mannequin', new THREE.Vector3(0, 0, 0), 0);
  if (support && coeur === 'memoire' && !sceau?.coeur?.inv) support.e.degats = 1.6; // une caisse cassée à réparer

  // intrus pour Guet
  let intrus: Cible | null = null;
  if (noeud('guet', false) || noeud('guet', true)) {
    const a = dirType === 'cote' ? angle + 70 : 135;
    const de = horiz(a).multiplyScalar(9), vers = horiz(a).multiplyScalar(Rw * 0.8);
    intrus = poser('mannequin', de, 0);
    intrus.marche = { de, vers, t: 0, duree: 2.6 };
  }

  const departs = cibles.map((c) => (c === intrus && intrus?.marche ? intrus.marche.vers.clone() : c.g.position.clone()));
  return {
    cibles, support, protege, intrus, departs,
    update(dt, t) { for (const c of cibles) majCible(c, dt, t, fx); },
    dispose() { for (const c of cibles) { scene.remove(c.g); libererCible(c); } cibles.length = 0; },
  };
}
