// Régénère app/src/modules/avatar/createur/data/species.json (rôles de morph, couleurs, emplacements)
// à partir du manifeste des assets optimisés et de blender/avatar.json. Vérifie que chaque morph existe.
//   cd blender && npm run species
const fs = require('fs');
const path = require('path');
const RACINE = path.join(__dirname, '..', '..');
const DATA = path.join(RACINE, 'app/src/modules/avatar/createur/data/species.json');
const MAN = path.join(RACINE, 'app/public/avatar/assets/species/human/manifeste.json');
const s = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const h = s.species[0];
const man = JSON.parse(fs.readFileSync(MAN, 'utf8'));

const bi = (neg, pos) => ({ neg, pos });
const r = (id, label, category, t, o = {}) => ({ id, label, category, targets: [t], min: o.min ?? -1, max: o.max ?? 1, default: 0 });
const paire = (id, label, category, l, rr, o = {}) => ({ id, label, category, targets: [l, rr], pair: { left: l, right: rr }, min: o.min ?? -1, max: o.max ?? 1, default: 0 });
const lr = (b, n, p) => [bi('l-' + b + n, 'l-' + b + p), bi('r-' + b + n, 'r-' + b + p)];
const ip = (b) => bi(b + '-decr', b + '-incr');
const L = { min: -2, max: 2 }; // rôles d'origine : plage conservée pour les presets existants

const M = [
  r('genre', 'Genre (masculin ↔ féminin)', 'silhouette', bi('macro-masculin', 'macro-feminin')),
  r('age', 'Âge (jeune ↔ âgé)', 'silhouette', bi('macro-age-jeune', 'macro-age-vieux')),
  r('muscle', 'Musculature', 'silhouette', bi('macro-muscle-moins', 'macro-muscle-plus')),
  r('poids', 'Corpulence', 'silhouette', bi('macro-poids-moins', 'macro-poids-plus')),
  r('stature', 'Stature', 'silhouette', bi('macro-taille-moins', 'macro-taille-plus')),
  r('poitrine_volume', 'Poitrine (volume)', 'silhouette', bi('macro-poitrine-moins', 'macro-poitrine-plus')),
  r('head_width', 'Largeur du visage', 'visage', ip('head-fat')),
  r('skull_shape', 'Forme du crâne', 'visage', bi('head-angle-in', 'head-angle-out'), L),
  r('head_height', 'Hauteur de la tête', 'visage', ip('head-scale-vert')),
  r('forehead', 'Front (hauteur)', 'visage', ip('forehead-scale-vert')),
  r('brow_height', 'Sourcils (hauteur)', 'visage', bi('eyebrows-trans-down', 'eyebrows-trans-up')),
  r('brow_angle', 'Sourcils (angle)', 'visage', bi('eyebrows-angle-down', 'eyebrows-angle-up')),
  paire('eye_size', 'Yeux (taille)', 'visage', ...lr('eye-scale', '-decr', '-incr')),
  paire('eye_corners', 'Coin des yeux', 'visage', ...lr('eye-corner1', '-down', '-up'), L),
  paire('eye_spacing', 'Écart des yeux', 'visage', ...lr('eye-trans', '-in', '-out')),
  r('nose_depth', 'Nez (profondeur)', 'visage', ip('nose-scale-depth'), L),
  r('nose_width', 'Nez (largeur)', 'visage', ip('nose-scale-horiz')),
  r('nose_length', 'Nez (longueur)', 'visage', ip('nose-scale-vert')),
  r('nose_hump', 'Nez (bosse)', 'visage', ip('nose-hump')),
  r('nose_tip', 'Pointe du nez', 'visage', bi('nose-point-down', 'nose-point-up')),
  r('mouth_width', 'Bouche (largeur)', 'visage', ip('mouth-scale-horiz'), L),
  r('lip_lower', 'Lèvre inférieure', 'visage', ip('mouth-lowerlip-volume')),
  r('lip_upper', 'Lèvre supérieure', 'visage', ip('mouth-upperlip-volume')),
  r('mouth_corners', 'Coins de la bouche', 'visage', bi('mouth-angles-down', 'mouth-angles-up')),
  paire('cheeks', 'Joues', 'visage', ...lr('cheek-volume', '-decr', '-incr'), L),
  paire('cheekbones', 'Pommettes', 'visage', ...lr('cheek-bones', '-decr', '-incr')),
  r('chin_height', 'Menton (hauteur)', 'visage', ip('chin-height'), L),
  r('chin_prominent', 'Menton (saillant)', 'visage', ip('chin-prominent')),
  r('jaw_width', 'Mâchoire (largeur)', 'visage', ip('chin-width')),
  paire('ear_size', 'Oreilles (taille)', 'visage', ...lr('ear-scale', '-decr', '-incr')),
  paire('ear_pointed', 'Oreilles pointues', 'visage', 'l-ear-shape-pointed', 'r-ear-shape-pointed', { min: 0, max: 1 }),
  r('neck', 'Cou', 'corps', ip('measure-neck-circ')),
  r('shoulders', 'Épaules', 'corps', ip('measure-shoulder-dist')),
  r('chest_breadth', 'Carrure (buste)', 'corps', ip('measure-frontchest-dist'), L),
  r('waist', 'Tour de taille', 'corps', ip('measure-waist-circ')),
  r('arm_circumference', 'Bras (circonférence)', 'corps', ip('measure-upperarm-circ'), L),
  r('belly', 'Ventre', 'corps', ip('stomach-pregnant'), L),
  r('hips_width', 'Hanches (largeur)', 'corps', ip('hip-scale-horiz'), L),
  r('buttocks', 'Fessiers', 'corps', ip('buttocks-volume')),
  r('legs_height', 'Jambes (hauteur)', 'corps', ip('measure-upperleg-height'), L),
  r('breast_position', 'Poitrine (position)', 'corps', bi('breast-trans-down', 'breast-trans-up'), L),
];

const corps = new Set(man.corps.morphs);
for (const m of M) for (const t of m.targets) for (const n of (typeof t === 'string' ? [t] : [t.neg, t.pos]))
  if (!corps.has(n)) console.error('MORPH ABSENT DU CORPS :', n);

const LIBELLES = { ponytail: 'Queue de cheval', court1: 'Court 1', court2: 'Court 2', court3: 'Court 3', court4: 'Court 4', long: 'Longs',
  carre1: 'Carré 1', carre2: 'Carré 2', tresse: 'Tresse', afro: 'Afro', default: 'Standard', fins: 'Fins', epais: 'Épais', arques: 'Arqués', longs: 'Longs' };
const SLOTS = [['hair', 'Coiffure', null, 'Aucune'], ['eyebrows', 'Sourcils', 'default', 'Aucun'], ['eyelashes', 'Cils', 'default', 'Aucun']];
const assetsDe = (slot) => man.assets.filter((a) => a.slot === slot);
const materiauxDe = (slot) => assetsDe(slot).map((a) => 'Human.' + a.source);

// le manifeste ne garde pas la source MakeHuman : on la relit dans la config Blender
const conf = JSON.parse(fs.readFileSync(path.join(RACINE, 'blender/avatar.json'), 'utf8'));
for (const a of man.assets) a.source = conf.assets.find((c) => c.slot === a.slot && c.id === a.id)?.source;
const TENUES = [['haut', 'Haut', 'chemise', 'Aucun', '#8a6a4a'], ['bas', 'Bas', 'pantalon', 'Aucun', '#4a4038'], ['pieds', 'Chaussures', 'bottes', 'Aucune', '#3b2a1c'],
  ['armure', 'Armure', null, 'Aucune', '#b8bcc4'], ['ceinture', 'Ceinture', null, 'Aucune', '#5a3a22'], ['cape', 'Cape', null, 'Aucune', '#6b1d1d']];

h._comment_morphTargets = "Rôles de morph. 'targets' : nom de morph (valeur appliquée telle quelle) ou { neg, pos } (bipolaire : valeur < 0 -> cible neg avec |v|, > 0 -> cible pos). 'pair' : cibles gauche/droite pour le mode asymétrie. 'category' : un des morphCategories. Morphs générés par blender/scripts/construire_avatar.py (blender/avatar.json) ; les assets 'skinned' portent les mêmes morphs et suivent le corps.";
h.morphCategories = [{ id: 'silhouette', label: 'Silhouette' }, { id: 'visage', label: 'Visage' }, { id: 'corps', label: 'Corps' }];
h.morphTargets = M;
h._comment_materials = "Rôles de couleur (teinte multiplicative, blanc = texture d'origine). 'forceOpaque' : matériau MPFB en BLEND rendu opaque. 'alphaTest' : découpe nette (cheveux, cils), sans tri de transparence.";
h.materials = [
  ...h.materials.filter((m) => ['skin', 'eyes', 'teeth', 'tongue'].includes(m.id)),
  { id: 'hair', label: 'Cheveux', target: materiauxDe('hair'), property: 'color', type: 'color', default: '#ffffff', alphaTest: 0.5 },
  { id: 'eyebrows', label: 'Sourcils', target: materiauxDe('eyebrows'), property: 'color', type: 'color', default: '#ffffff', alphaTest: 0.4 },
  { id: 'eyelashes', label: 'Cils', target: materiauxDe('eyelashes'), property: 'color', type: 'color', default: '#ffffff', alphaTest: 0.4 },
  ...TENUES.map(([id, label, , , couleur]) => ({ id: 'tenue_' + id, label: label, target: 'Tenue.' + id, property: 'color', type: 'color', default: couleur, side: 'double' })),
];
h._comment_assetSlots = "Emplacements d'assets. attachMode 'skinned' : l'asset est lié au squelette du corps (mêmes noms d'os) et porte les mêmes morphs, il suit donc la morphologie. 'head-bone' (ancien) : asset posé sur l'os 'attachBone'.";
h.assetCategories = [{ id: 'pilosite', label: 'Coiffure et pilosité' }, { id: 'tenue', label: 'Tenue' }];
h.assetSlots = [...SLOTS.map((x) => [...x, 'pilosite']), ...TENUES.map(([id, label, def, aucun]) => [id, label, def, aucun, 'tenue'])].map(([id, label, def, aucun, category]) => ({
  id, label, category, attachMode: 'skinned', default: def,
  options: [{ id: null, label: aucun, file: null }, ...assetsDe(id).map((a) => ({ id: a.id, label: a.label ?? LIBELLES[a.id] ?? a.id, file: 'avatar/assets/species/human/' + a.fichier }))],
}));
fs.writeFileSync(DATA, JSON.stringify(s, null, 2) + '\n');
console.log(M.length, 'rôles ;', h.assetSlots.map((x) => x.id + ':' + x.options.length).join(' '));
