// Leçons de l'atelier : chaque leçon apprend un signe (ou une technique) en faisant reproduire un sceau modèle.
// Réussir la leçon (score ≥ 70) ajoute le signe au carnet du personnage.
import type { Rang } from './signes';
import type { Placement, Sceau } from '../engine/types';

export interface Lecon {
  id: string;
  titre: string;
  apprend: string | null;  // id du signe appris (null = technique)
  rang: Rang;
  consigne: string;
  modele: Sceau;
}

const autour = (id: string, n: number, d = 0, inv = false): Placement[] => Array.from({ length: n }, (_, k) => ({ id, angle: (d + (k * 360) / n) % 360, inv }));
const aux = (id: string, a: number[], inv = false): Placement[] => a.map((x) => ({ id, angle: (x + 360) % 360, inv }));
const S = (coeur: string, cInv: boolean, rameaux: Placement[], noeuds: Placement[] = [], extra: Partial<Sceau> = {}): Sceau => ({ coeur: { id: coeur, inv: cInv }, rameaux, noeuds, taille: 2, entaille: null, ...extra });
const L = (id: string, titre: string, apprend: string | null, rang: Rang, consigne: string, modele: Sceau): Lecon => ({ id, titre, apprend, rang, consigne, modele });

export const LECONS: Lecon[] = [
  // ---- Apprenti
  L('l-base', 'Premier sceau', null, 1, 'Tracez un Cœur de Braise, deux Jets opposés, puis fermez la cerne d’un seul trait.', S('braise', false, aux('jet', [90, 270]))),
  L('l-gerce', 'La gerce', null, 1, 'Barrez le Cœur d’un trait en diagonale pour l’inverser : la Braise devient Givre.', S('braise', true, aux('gerbe', [0, 180]))),
  L('l-pluie', 'Pluie', 'pluie', 1, 'Trois Pluies groupées vers le haut : l’averse tombe à distance.', S('source', false, aux('pluie', [-30, 0, 30]))),
  L('l-appel', 'Appel', 'appel', 1, 'Quatre Appels tout autour du Cœur de Socle.', S('socle', false, autour('appel', 4, 45))),
  L('l-sablier', 'Sablier', 'sablier', 1, 'Un Sablier posé à l’extérieur de la cerne prolonge le sort.', S('lueur', false, aux('plume', [90, 270]), [{ id: 'sablier', angle: 0, inv: false }])),
  L('l-retourne', 'Rameau retourné', null, 1, 'Un Rameau dont la pointe regarde le Cœur est inversé : ici, des Plumes deviennent des Ancres.', S('socle', false, autour('plume', 4, 0, true))),
  // ---- Compagnon
  L('l-dard', 'Dard', 'dard', 2, 'Trois Dards groupés vers le haut, et une Visée sur la cerne.', S('braise', false, aux('dard', [-25, 0, 25]), [{ id: 'visee', angle: 0, inv: false }])),
  L('l-rempart', 'Rempart', 'rempart', 2, 'Quatre Remparts en croix pour un dôme.', S('braise', true, autour('rempart', 4))),
  L('l-etau', 'Étau', 'etau', 2, 'Quatre Étaux autour d’un Cœur de Source : l’eau se compacte.', S('source', false, autour('etau', 4))),
  L('l-tourbillon', 'Tourbillon', 'tourbillon', 2, 'Deux Tourbillons opposés autour du Souffle.', S('souffle', false, aux('tourbillon', [0, 180]))),
  L('l-visee', 'Visée', 'visee', 2, 'Un Jet et deux Visées pour une très longue portée.', S('lueur', false, aux('jet', [0]), [{ id: 'visee', angle: -12, inv: false }, { id: 'visee', angle: 12, inv: false }])),
  L('l-douce', 'Braise-douce', 'douce', 2, 'Une Braise-douce atténue le sort : un feu de camp sans danger.', S('braise', false, autour('jet', 4), [{ id: 'douce', angle: 45, inv: false }])),
  L('l-echo', 'Écho', 'echo', 2, 'Deux Échos font pulser le sort.', S('lueur', false, autour('gerbe', 4), [{ id: 'echo', angle: 45, inv: false }, { id: 'echo', angle: 225, inv: false }])),
  L('l-nouveau-coeur', 'Cœur de Mémoire', 'memoire', 2, 'Un Cœur de nature : la Mémoire répare les objets posés sur le sceau.', S('memoire', false, aux('appel', [90, 270]), [{ id: 'fenetre', angle: 0, inv: false }])),
  L('l-regard', 'Cœur de Regard', 'regard', 2, 'Le Regard révèle ce qui est caché, droit devant.', S('regard', false, aux('jet', [0]), [{ id: 'visee', angle: 0, inv: false }])),
  L('l-lien', 'Cœur de Lien', 'lien', 2, 'Le Lien soude ce qui touche le sceau.', S('lien', false, aux('etau', [90, 270]), [{ id: 'fenetre', angle: 0, inv: true }])),
  L('l-fendu', 'Sceau fendu', null, 2, 'Tracez la cerne en deux moitiés séparées (trous à gauche et à droite) : le sort attend qu’on les rejoigne.', S('source', false, aux('plume', [0, 180]), [], { fendu: { axe: 90 } })),
  // ---- Maître
  L('l-figure', 'Figure', 'figure', 3, 'Une Figure donne au feu la forme d’une créature.', S('braise', false, aux('figure', [0]), [{ id: 'sablier', angle: 180, inv: false }])),
  L('l-tisse', 'Tisse', 'tisse', 3, 'Trois Tisses autour de la Lueur : des rubans de lumière.', S('lueur', false, autour('tisse', 3))),
  L('l-ampleur', 'Ampleur', 'ampleur', 3, 'Deux Ampleurs opposées agrandissent ce qui est posé sur le sceau.', S('socle', false, aux('ampleur', [90, 270]), [{ id: 'fenetre', angle: 0, inv: false }])),
  L('l-guet', 'Guet', 'guet', 3, 'Un Guet transforme le sceau en piège.', S('socle', false, autour('appel', 4, 45), [{ id: 'guet', angle: 0, inv: false }])),
  L('l-mot', 'Mot', 'mot', 3, 'Un Mot : le sort attend la parole convenue.', S('lien', false, aux('etau', [90, 270]), [{ id: 'mot', angle: 0, inv: false }])),
  L('l-mouvement', 'Cœur de Mouvement', 'mouvement', 3, 'Le Mouvement anime l’objet posé sur le sceau.', S('mouvement', false, aux('tourbillon', [0, 180]), [{ id: 'fenetre', angle: 90, inv: false }])),
  L('l-double', 'Double cerne', null, 3, 'Tracez une seconde cerne autour de la première, et deux Tourbillons entre les deux.', S('braise', false, aux('jet', [-25, 0, 25]), [], { couronne: { rameaux: aux('tourbillon', [90, 270]), noeuds: [] } })),
  L('l-greffe', 'Greffe', null, 3, 'Tracez deux sceaux identiques côte à côte et reliez leurs cernes d’un trait.', S('braise', false, autour('jet', 4), [], { taille: 1, greffe: S('braise', false, autour('jet', 4), [], { taille: 1 }) })),
];
