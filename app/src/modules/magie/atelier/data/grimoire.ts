// Grimoire de base : sorts d'exemple classés par usage.
// Chaque sort respecte la grammaire (symétrie, rang, Nœuds cohérents) ; à modifier librement.
import type { Placement, Sceau, SortEnregistre, Taille } from '../engine/types';

export const CATEGORIES = ['Attaque', 'Défense', 'Contrôle', 'Déplacement', 'Utilitaire', 'Piège', 'Perception', 'Rituel', 'Techniques', 'Interdit'] as const;
export type Categorie = (typeof CATEGORIES)[number];

const norm = (a: number) => ((a % 360) + 360) % 360;
/** n exemplaires répartis tout autour */
export const autour = (id: string, n: number, depart = 0, inv = false): Placement[] =>
  Array.from({ length: n }, (_, k) => ({ id, angle: norm(depart + (k * 360) / n), inv }));
/** exemplaires aux angles donnés */
export const aux = (id: string, angles: number[], inv = false): Placement[] => angles.map((a) => ({ id, angle: norm(a), inv }));
const N = (id: string, angle: number, inv = false): Placement => ({ id, angle: norm(angle), inv });

function sort(
  id: string, nom: string, categorie: Categorie, notes: string,
  coeur: string, cInv: boolean, rameaux: Placement[], noeuds: Placement[] = [], taille: Taille = 2, entaille: number | null = null, extra: Partial<Sceau> = {},
): SortEnregistre {
  const sceau: Sceau = { coeur: { id: coeur, inv: cInv }, rameaux, noeuds, taille, entaille, ...extra };
  return { id, nom, notes, categorie, sceau, cree: 0, exemple: true };
}

export const GRIMOIRE_DE_BASE: SortEnregistre[] = [
  // ---- Attaque
  sort('ex-lance', 'Lance d’eau', 'Attaque', 'Trois Jets groupés : la colonne part vers le haut de la feuille. Classique des duels d’apprentis.', 'source', false, aux('jet', [-30, 0, 30]), [N('visee', 0)]),
  sort('ex-trait', 'Trait de braise', 'Attaque', 'Un seul projectile, rapide et précis. Se trace en quelques secondes.', 'braise', false, aux('dard', [0]), [N('visee', 0)], 1),
  sort('ex-salve', 'Salve ardente', 'Attaque', 'Trois projectiles de flammes à chaque battement de cœur.', 'braise', false, aux('dard', [-30, 0, 30])),
  sort('ex-grele', 'Grêle de givre', 'Attaque', 'Averse de glace sur une zone à distance. Idéale contre un groupe.', 'braise', true, aux('pluie', [-20, 20]), [N('visee', 0)]),
  sort('ex-gerbe-feu', 'Gerbe de flammes', 'Attaque', 'Éventail de feu devant le lanceur ; dangereux en intérieur.', 'braise', false, aux('gerbe', [-25, 25])),
  sort('ex-eboulis', 'Éboulis', 'Attaque', 'Fait pleuvoir pierres et sable à distance.', 'socle', false, aux('pluie', [-30, 0, 30]), [N('visee', 0)], 3),
  sort('ex-poing', 'Poing de pierre', 'Attaque', 'Deux éclats de pierre tirés à bout portant, avec Repli : courte portée, gros impact.', 'socle', false, aux('dard', [-20, 20]), [N('visee', 0, true)]),
  sort('ex-rafale', 'Rafale', 'Attaque', 'Pousse violemment tout ce qui est devant. Renverse les petites créatures.', 'souffle', false, aux('jet', [-20, 20]), [N('visee', 0)]),
  sort('ex-eclair', 'Éclat aveuglant', 'Attaque', 'Flash instantané dans toutes les directions. Fulgurance : très bref, très fort.', 'lueur', false, autour('gerbe', 4), [N('sablier', 45, true)]),
  sort('ex-oiseau-feu', 'Oiseaux de feu', 'Attaque', 'Deux créatures de flammes partent de part et d’autre du lanceur. Rang Maître.', 'braise', false, aux('figure', [90, 270]), [N('sablier', 0)], 3),
  sort('ex-serpent', 'Serpent des eaux', 'Attaque', 'Une créature d’eau qui file vers l’avant et obéit à des ordres simples.', 'source', false, aux('figure', [0]), [N('sablier', 180)]),
  sort('ex-tornade', 'Tornade', 'Attaque', 'Vortex attisé : puissant mais instable. Ne pas lancer près des alliés.', 'souffle', false, autour('tourbillon', 4), [N('douce', 45, true)], 3),

  // ---- Défense
  sort('ex-garde', 'Garde de givre', 'Défense', 'Dôme de glace qui épargne le lanceur grâce au Refuge.', 'braise', true, autour('rempart', 4), [N('halo', 45, true), N('sablier', 225)]),
  sort('ex-mur', 'Mur de pierre', 'Défense', 'Muraille dressée devant le lanceur. Tient une scène.', 'socle', false, aux('rempart', [-20, 20]), [N('sablier', 180)]),
  sort('ex-bouclier-vent', 'Bouclier de vent', 'Défense', 'Écran d’air qui dévie flèches et pierres venant de face.', 'souffle', false, aux('dard', [-20, 20], true)),
  sort('ex-dome-lumiere', 'Dôme de lumière', 'Défense', 'Abri lumineux qui tient les créatures de l’ombre à distance.', 'lueur', false, autour('rempart', 4), [N('sablier', 45)], 3),
  sort('ex-rideau', 'Rideau d’eau', 'Défense', 'Mur d’eau : arrête les flammes et ralentit ceux qui le traversent.', 'source', false, aux('rempart', [-15, 15])),
  sort('ex-extinction', 'Extinction', 'Défense', 'Contre-sort : défait toute magie de feu proche.', 'braise', false, aux('figure', [0, 180], true), [N('halo', 90)]),
  sort('ex-enclume', 'Pieds d’enclume', 'Défense', 'Ancre le lanceur au sol : impossible à repousser ou à soulever.', 'socle', false, autour('plume', 4, 0, true), [N('fenetre', 0)]),

  // ---- Contrôle
  sort('ex-piege', 'Piège de sable', 'Piège', 'Tracé sous un tapis, entaille à fermer au dernier moment.', 'socle', false, autour('appel', 4, 45), [N('guet', 0)], 2, 180),
  sort('ex-etau-glace', 'Étau de glace', 'Contrôle', 'Gèle sur place quiconque touche le sceau (Seuil).', 'braise', true, autour('etau', 4), [N('fenetre', 45, true)]),
  sort('ex-sol-glissant', 'Flaque traîtresse', 'Contrôle', 'Répand une eau tiède et glissante autour du sceau.', 'source', false, aux('gerbe', [90, 270]), [N('halo', 0), N('douce', 180)]),
  sort('ex-vent-contraire', 'Vent contraire', 'Contrôle', 'Repousse tout ce qui approche, dans toutes les directions.', 'souffle', false, autour('appel', 4, 0, true), [N('halo', 45)]),
  sort('ex-rets', 'Rets de lumière', 'Contrôle', 'Rubans de lumière qui lient et entravent. Rang Maître.', 'lueur', false, autour('tisse', 3), [], 3),
  sort('ex-silence', 'Silence', 'Contrôle', 'Plus un son dans la zone : utile pour une infiltration ou contre un lanceur qui parle.', 'souffle', true, autour('gerbe', 4), [N('halo', 45), N('sablier', 225)]),
  sort('ex-nuit', 'Nuit tombée', 'Contrôle', 'Obscurité épaisse sur toute la zone pendant une scène.', 'lueur', true, autour('gerbe', 4), [N('halo', 45), N('sablier', 225)]),

  // ---- Déplacement
  sort('ex-sylphe', 'Chaussures de plume', 'Déplacement', 'Tracé sous des semelles : marcher quelques pouces au-dessus du sol.', 'souffle', false, aux('plume', [90, 270]), [N('fenetre', 0), N('sablier', 180)], 1),
  sort('ex-plateforme', 'Plateforme d’eau', 'Déplacement', 'Disque d’eau qui porte une personne au-dessus d’un ravin.', 'source', false, autour('plume', 4), [N('fenetre', 45)]),
  sort('ex-bond', 'Bond', 'Déplacement', 'Projette vers le haut ce qui se tient sur le sceau, en un instant.', 'souffle', false, autour('jet', 4), [N('sablier', 45, true)]),
  sort('ex-corde', 'Corde de vent', 'Déplacement', 'Deux rubans d’air solides, pour franchir un gouffre ou hisser une charge.', 'souffle', false, aux('tisse', [0, 180]), [N('visee', 0)], 3),

  // ---- Utilitaire
  sort('ex-lanterne', 'Lanterne flottante', 'Utilitaire', 'Tracée sur une pierre : elle s’élève et éclaire.', 'lueur', false, aux('plume', [90, 270]), [N('sablier', 0), N('fenetre', 180)], 1),
  sort('ex-brise', 'Brise du marchand', 'Utilitaire', 'Ventilateur d’échoppe.', 'souffle', false, aux('tourbillon', [0, 180]), [N('douce', 90), N('halo', 270)], 1),
  sort('ex-atre', 'Âtre de voyage', 'Utilitaire', 'Feu doux qui chauffe un campement pendant une heure, sans bois.', 'braise', false, autour('jet', 4), [N('douce', 45), N('sablier', 135), N('sablier', 315)]),
  sort('ex-fontaine', 'Fontaine', 'Utilitaire', 'Eau potable qui jaillit doucement du sceau.', 'source', false, autour('jet', 4), [N('douce', 45), N('sablier', 225)]),
  sort('ex-sechoir', 'Séchoir', 'Utilitaire', 'Air sec et tournoyant : sèche le linge et les vivres.', 'source', true, aux('tourbillon', [0, 180]), [N('douce', 90)]),
  sort('ex-verrou', 'Verrou de lien', 'Utilitaire', 'Scelle un coffre ou une porte ; s’ouvre sur un mot convenu.', 'lien', false, aux('etau', [90, 270]), [N('fenetre', 0), N('mot', 180, true)]),
  sort('ex-crochet', 'Crochet', 'Utilitaire', 'Ouvre une serrure à distance.', 'lien', true, aux('dard', [0]), [N('visee', 0)]),
  sort('ex-conserve', 'Garde-manger', 'Utilitaire', 'Garde la nourriture fraîche une journée entière.', 'memoire', false, autour('etau', 4), [N('fenetre', 45), N('sablier', 135), N('sablier', 225), N('sablier', 315)]),
  sort('ex-reparation', 'Raccommodage', 'Utilitaire', 'Rassemble les morceaux d’un objet brisé et le répare.', 'memoire', false, aux('appel', [90, 270]), [N('fenetre', 0)]),
  sort('ex-balai', 'Balai de l’atelier', 'Utilitaire', 'Anime un balai qui nettoie tout seul.', 'mouvement', false, aux('tourbillon', [0, 180]), [N('fenetre', 90), N('sablier', 270)]),
  sort('ex-tissage', 'Assouplissement', 'Utilitaire', 'Rend souple une barre de métal ou une planche le temps de la travailler.', 'socle', false, aux('tisse', [90, 270]), [N('fenetre', 0)], 3),

  // ---- Perception / discrétion
  sort('ex-oeil', 'Œil lointain', 'Perception', 'Le lanceur voit loin dans la direction du sceau.', 'regard', false, aux('jet', [0]), [N('visee', -10), N('visee', 10)]),
  sort('ex-revelation', 'Révélation', 'Perception', 'Rend visible ce qui est caché ou invisible autour du sceau.', 'regard', false, autour('gerbe', 4), [N('halo', 45)]),
  sort('ex-cape', 'Cape de voile', 'Perception', 'Tracé dans la doublure d’une cape : rend son porteur invisible tant qu’il reste immobile.', 'regard', true, autour('gerbe', 4), [N('fenetre', 45), N('sablier', 225)]),
  sort('ex-arret', 'Grippe-rouage', 'Perception', 'Bloque les mécanismes qui passent devant : désamorce les pièges.', 'mouvement', true, autour('appel', 4), [N('guet', 45)]),

  // ---- Pièges
  sort('ex-mine', 'Mine de braise', 'Piège', 'Explose en gerbe de flammes au passage. Entaille : armé au dernier moment.', 'braise', false, autour('gerbe', 4), [N('guet', 45)], 2, 225),
  sort('ex-gel-seuil', 'Gel du seuil', 'Piège', 'Celui qui marche dessus est plaqué au sol et gelé.', 'braise', true, autour('plume', 4, 0, true), [N('guet', 45), N('fenetre', 225, true)]),
  sort('ex-alarme', 'Alarme lumineuse', 'Piège', 'Trois éclairs au passage d’un intrus : prévient tout le camp.', 'lueur', false, autour('jet', 4), [N('guet', 45), N('echo', 135), N('echo', 315)]),
  sort('ex-tapis', 'Tapis traître', 'Piège', 'Repousse violemment celui qui marche dessus.', 'source', false, aux('appel', [90, 270], true), [N('guet', 0)]),

  // ---- Rituels (Maître)
  sort('ex-grand-tourbillon', 'Grand tourbillon', 'Rituel', 'Vortex géant, attisé et pulsé. Demande un grand sceau tracé à plusieurs.', 'souffle', false, [...autour('tourbillon', 4), ...aux('ampleur', [45, 225])], [N('douce', 135, true), N('echo', 315)], 3),
  sort('ex-deluge', 'Déluge', 'Rituel', 'Pluie torrentielle sur une large zone pendant une heure.', 'source', false, autour('pluie', 6), [N('halo', 30), N('sablier', 150), N('sablier', 270)], 3),
  sort('ex-meteore', 'Météore', 'Rituel', 'Un bloc de pierre agrandi, projeté en un instant.', 'socle', false, [...aux('dard', [0]), ...aux('ampleur', [-30, 30])], [N('sablier', 180, true), N('visee', 0)], 3),

  // ---- Techniques avancées : double cerne, sceau fendu, greffe
  sort('ex-tornade-ardente', 'Tornade ardente', 'Techniques', 'Double cerne : trois Jets de feu au centre, deux Tourbillons dans la couronne. La colonne de flammes tournoie.', 'braise', false, aux('jet', [-25, 0, 25]), [], 2, null, { couronne: { rameaux: aux('tourbillon', [90, 270]), noeuds: [] } }),
  sort('ex-forteresse', 'Forteresse', 'Techniques', 'Double cerne : un dôme de pierre, doublé d’une couronne de Parades qui arrêtent les projectiles.', 'socle', false, autour('rempart', 4), [], 2, null, { couronne: { rameaux: autour('dard', 4, 45, true), noeuds: [N('sablier', 0)] } }),
  sort('ex-colonne-geyser', 'Geyser compact', 'Techniques', 'Double cerne : une colonne d’eau que la couronne d’Étaux rend dure comme un pilier.', 'source', false, autour('jet', 4), [], 2, null, { couronne: { rameaux: autour('etau', 4, 45), noeuds: [] } }),
  sort('ex-porte-scellee', 'Porte scellée', 'Techniques', 'Sceau fendu tracé sur les deux battants d’une porte : tant qu’elle est fermée, les battants sont soudés.', 'lien', false, aux('etau', [0, 180]), [N('fenetre', 90)], 2, null, { fendu: { axe: 90 } }),
  sort('ex-dalle', 'Dalle lumineuse', 'Techniques', 'Sceau fendu sur deux dalles : il s’allume quand quelqu’un marche dessus et les rapproche.', 'lueur', false, autour('jet', 4), [], 1, null, { fendu: { axe: 0 } }),
  sort('ex-machoire', 'Mâchoire de feu', 'Techniques', 'Sceau fendu en piège à loup : quand les deux mâchoires se referment, le feu jaillit.', 'braise', false, autour('gerbe', 4), [N('fenetre', 45, true)], 2, null, { fendu: { axe: 90 } }),
  sort('ex-lances-jumelles', 'Lances jumelles', 'Techniques', 'Greffe de deux sceaux identiques : les puissances s’additionnent.', 'source', false, aux('jet', [-20, 20]), [N('visee', 0)], 1, null, { greffe: { coeur: { id: 'source', inv: false }, rameaux: aux('jet', [-20, 20]), noeuds: [N('visee', 0)], taille: 1, entaille: null } }),
  sort('ex-vapeur', 'Nuée de vapeur', 'Techniques', 'Greffe d’un sceau de feu et d’un sceau d’eau : jets brûlants et nuage de vapeur.', 'braise', false, aux('jet', [0, 180]), [], 1, null, { greffe: { coeur: { id: 'source', inv: false }, rameaux: aux('jet', [0, 180]), noeuds: [], taille: 1, entaille: null } }),
  sort('ex-neutralisation', 'Neutralisation', 'Techniques', 'Greffe d’un sort et de son inverse : ils s’annulent. Sert à désamorcer un sceau ennemi en traçant son reflet.', 'braise', false, autour('gerbe', 4), [], 1, null, { greffe: { coeur: { id: 'braise', inv: true }, rameaux: autour('gerbe', 4), noeuds: [], taille: 1, entaille: null } }),

  // ---- Interdits (MJ)
  sort('ex-main-seve', 'Main de sève', 'Interdit', 'Soigne celui qui touche le sceau. Interdit : agit sur le vivant.', 'seve', false, aux('appel', [90, 270]), [N('fenetre', 0, true)]),
  sort('ex-fletrissure', 'Souffle flétri', 'Interdit', 'Affaiblit les êtres vivants à distance.', 'seve', true, aux('pluie', [-30, 0, 30]), [N('visee', 0)]),
  sort('ex-petrification', 'Pétrification', 'Interdit', 'Change lentement en pierre celui qui touche le sceau.', 'chair', true, autour('etau', 4), [N('fenetre', 45, true), N('sablier', 135), N('sablier', 225), N('sablier', 315)], 3),
  sort('ex-oubli', 'Oubli', 'Interdit', 'Efface un souvenir chez la personne visée, au mot convenu.', 'esprit', false, aux('jet', [0]), [N('visee', 0), N('mot', 180)]),
  sort('ex-metamorphose', 'Métamorphose', 'Interdit', 'Rétrécit le corps de celui qui touche le sceau.', 'chair', false, autour('ampleur', 4, 0, true), [N('fenetre', 45, true)], 3),
];
