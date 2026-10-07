// Description précise d'un sort lancé : texte narratif + valeurs de jeu (mètres, tours, dégâts indicatifs).
import type { Analyse } from './analyse';
import type { Sceau } from './types';
import { SIGNE } from '../data/signes';
const SIGNE_NOM: Record<string, string> = Object.fromEntries(Object.values(SIGNE).map((x) => [x.id, x.nom]));
const SIGNE_NOM_INV: Record<string, string> = Object.fromEntries(Object.values(SIGNE).map((x) => [x.id, x.nomInverse]));

export type Particule = 'flamme' | 'givre' | 'goutte' | 'poussiere' | 'roche' | 'vent' | 'brume' | 'lueur' | 'ombre' | 'eclat';

export interface Element {
  matiere: string;     // « feu »
  de: string;          // « de flammes »
  le: string;          // « le feu »
  impact: string;      // ce que fait la matière au contact
  degats: string | null;
  etat: string | null; // condition infligée si pas de dégâts
  soin?: boolean;
  particule: Particule;
  sombre?: boolean;    // rendu 3D en mélange normal (ombre)
}

const E = (matiere: string, de: string, le: string, impact: string, particule: Particule, degats: string | null, etat: string | null, extra: Partial<Element> = {}): Element =>
  ({ matiere, de, le, impact, particule, degats, etat, ...extra });

export const ELEMENTS: Record<string, Element> = {
  braise: E('feu', 'de flammes', 'le feu', 'Ce qu’il touche brûle ; le bois sec, la paille et le tissu prennent feu.', 'flamme', 'feu', null),
  'braise~': E('glace', 'de givre', 'le froid', 'Ce qu’il touche gèle : l’eau se fige, le sol devient glissant, les membres s’engourdissent.', 'givre', 'froid', 'Ralenti par le froid'),
  source: E('eau', 'd’eau', 'l’eau', 'L’eau frappe, renverse et trempe ; elle éteint les flammes ordinaires.', 'goutte', 'contondant (eau)', 'Renversé, trempé'),
  'source~': E('sécheresse', 'd’air brûlant et sec', 'l’air sec', 'Les liquides s’évaporent, la boue durcit, les plantes se fanent ; les créatures ont la gorge en feu.', 'poussiere', null, 'Assoiffé (épuisement)'),
  socle: E('pierre', 'de pierre et de sable', 'la pierre', 'Pierres et sable frappent comme des coups de masse ; le sol se soulève ou se creuse.', 'roche', 'contondant (pierre)', null),
  'socle~': E('poussière', 'de poussière', 'la poussière', 'La pierre et la terre touchées s’effritent : murs fissurés, statues réduites en poudre.', 'poussiere', 'érosion (objets et constructions)', 'Aveuglé par la poussière'),
  souffle: E('vent', 'de vent', 'le vent', 'Une rafale pousse, renverse et disperse ce qui est léger ; les flèches sont déviées.', 'vent', null, 'Repoussé, peut tomber à terre'),
  'souffle~': E('calme', 'd’air immobile', 'le calme', 'L’air s’immobilise : plus de vent, plus de son ; les flammes s’étouffent.', 'brume', null, 'Assourdi, souffle court'),
  lueur: E('lumière', 'de lumière', 'la lumière', 'Une lumière vive éclaire tout, révèle ce qui se cache dans l’ombre et éblouit.', 'lueur', null, 'Ébloui'),
  'lueur~': E('ombre', 'd’ombre', 'l’ombre', 'Une obscurité épaisse avale la lumière : torches et lanternes n’éclairent plus.', 'ombre', null, 'Aveuglé dans la zone', { sombre: true }),
  memoire: E('mémoire', 'de mémoire', 'la mémoire des choses', 'Les objets touchés retrouvent leur état d’avant : cassures recollées, taches effacées, nourriture fraîche.', 'eclat', null, 'Objet restauré'),
  'memoire~': E('usure', 'd’usure', 'l’usure', 'Les objets touchés vieillissent d’un coup : le bois pourrit, le métal rouille, les cordes cèdent.', 'poussiere', 'usure (objets)', null),
  regard: E('regard', 'de vision', 'le regard', 'Le lanceur voit à travers les obstacles minces et repère ce qui est caché ou invisible.', 'lueur', null, 'Révélé'),
  'regard~': E('voile', 'de voile', 'le voile', 'Ce qui est touché devient invisible tant qu’il reste immobile, et flou quand il bouge.', 'brume', null, 'Invisible'),
  lien: E('lien', 'de liens', 'le lien', 'Les objets touchés se collent entre eux ou au sol ; portes et coffres se scellent.', 'eclat', null, 'Entravé, collé'),
  'lien~': E('rupture', 'de rupture', 'la rupture', 'Ce qui est attaché se détache : nœuds, verrous, charnières et chaînes s’ouvrent.', 'eclat', null, 'Libéré, ouvert'),
  mouvement: E('mouvement', 'de mouvement', 'le mouvement', 'Les objets inertes touchés s’animent et obéissent à des ordres simples.', 'eclat', null, 'Objet animé'),
  'mouvement~': E('arrêt', 'd’arrêt', 'l’arrêt', 'Les mécanismes et objets en mouvement s’immobilisent : roues, pièges, horloges.', 'givre', null, 'Figé (objets)'),
  seve: E('sève', 'de sève', 'la sève', 'Le vivant touché guérit et pousse : plaies refermées, plantes en pleine croissance.', 'lueur', null, null, { soin: true }),
  'seve~': E('flétrissure', 'de flétrissure', 'la flétrissure', 'Le vivant touché s’affaiblit et dépérit.', 'ombre', 'nécrotique', 'Affaibli', { sombre: true }),
  chair: E('chair', 'de chair', 'la chair', 'Le corps touché change de forme ou de taille.', 'eclat', null, 'Transformé'),
  'chair~': E('figement', 'de pierre', 'le figement', 'Le corps touché se raidit puis se change peu à peu en pierre.', 'roche', null, 'Pétrifié'),
  esprit: E('esprit', 'd’esprit', 'l’esprit', 'Un souvenir précis est effacé ou modifié chez la cible.', 'lueur', null, 'Mémoire altérée'),
  'esprit~': E('réminiscence', 'de réminiscence', 'la réminiscence', 'Un souvenir effacé ressurgit d’un coup chez la cible.', 'lueur', null, 'Souvenir retrouvé'),
};

export interface Valeurs {
  portee: number;   // m
  zone: number;     // rayon en m
  diam: number;     // cm
  hauteur: number;  // m
  charge: number;   // kg
  recul: number;    // m
  epaisseur: number;// cm
  mult: number;
}

export function valeurs(s: Sceau, a: Analyse): Valeurs {
  const has = (id: string, inv: boolean) => s.noeuds.some((n) => n.id === id && n.inv === inv);
  const nVis = s.noeuds.filter((n) => n.id === 'visee' && !n.inv).length;
  let portee = [0, 4, 6, 8][s.taille] * Math.pow(2, nVis);
  if (has('visee', true)) portee = 0;
  const zone = has('halo', false) || has('halo', true) ? s.taille * 3 : s.taille * 1.5;
  const P = a.puissance;
  const nAmp = s.rameaux.filter((r) => r.id === 'ampleur').length;
  return {
    portee: Math.min(portee, 64), zone, diam: 10 * P, hauteur: Math.round((1 + P * 0.4) * 10) / 10,
    charge: 20 * P, recul: Math.max(1, Math.round(P / 2)), epaisseur: 5 * P, mult: 1 + Math.max(1, nAmp),
  };
}

const maj = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** nombre à la française (virgule décimale) */
const fr = (x: number) => String(Math.round(x * 10) / 10).replace('.', ',');

/** Phrase d'effet pour une forme (Rameau) appliquée à un élément */
function phraseForme(id: string, inv: boolean, n: number, el: Element, v: Valeurs, a: Analyse): string {
  const dirType = a.direction.type;
  const dir = dirType === 'cote' ? a.direction.label : dirType === 'axe' ? a.direction.label : 'vers le ciel, au-dessus du sceau';
  const loin = v.portee === 0 ? 'au contact du sceau' : `sur ${v.portee} m`;
  const ici = dirType === 'cote' && v.portee > 0 ? `à ${Math.round(v.portee / 2)} m du sceau, ${a.direction.label}` : 'autour du sceau';
  switch (id + (inv ? '~' : '')) {
    case 'jet': return `Un faisceau ${el.de} d’environ ${v.diam} cm de large jaillit ${dir} ${loin}, en continu tant que le sort dure.`;
    case 'jet~': return `Le sceau aspire ${el.le} dans un rayon de ${Math.max(2, v.portee)} m et l’engloutit en une colonne tournoyante.`;
    case 'pluie': return `Une averse ${el.de} s’abat sur une zone de ${fr(v.zone)} m de rayon, ${ici}.`;
    case 'pluie~': return `${maj(el.le)} jaillit du sol en geysers sur ${fr(v.zone)} m de rayon, ${ici} : ce qui s’y trouve est projeté jusqu’à ${fr(v.hauteur)} m de haut.`;
    case 'gerbe': return dirType === 'cote'
      ? `${maj(el.le)} déborde du sceau et se répand en éventail ${a.direction.label}, jusqu’à ${Math.max(2, v.portee)} m.`
      : `${maj(el.le)} déborde du sceau et se répand dans toutes les directions, jusqu’à ${Math.max(2, v.portee)} m.`;
    case 'gerbe~': return `Tout ce qui est fait ${el.de} à moins de ${Math.max(3, v.portee)} m converge vers le sceau et s’y rassemble.`;
    case 'plume': return `Ce qui est posé sur le sceau (jusqu’à ${v.charge} kg) s’élève doucement à ${fr(v.hauteur)} m et flotte, porté par ${el.le}.`;
    case 'plume~': return `Tout ce qui se trouve à moins de ${fr(v.zone)} m du sceau devient lourd et se plaque au sol : avancer demande un effort, sauter est impossible.`;
    case 'appel': return `Le sceau attire à lui tout ce qui est fait ${el.de} à moins de ${Math.max(3, v.portee)} m ; une créature prise dans le flux est tirée de ${v.recul} m par tour.`;
    case 'appel~': return `Une poussée ${el.de} chasse tout ce qui entoure le sceau jusqu’à ${Math.max(3, v.portee)} m ; une créature touchée recule de ${v.recul} m.`;
    case 'dard': return `${n > 1 ? `${n} projectiles` : 'Un projectile'} ${el.de} ${n > 1 ? 'partent' : 'part'} ${dir} à chaque battement de cœur, portée ${Math.max(4, v.portee * 2)} m.`;
    case 'dard~': return `Un écran ${el.de} se dresse ${dirType === 'cote' ? a.direction.label : 'tout autour du sceau'} : flèches, pierres et projectiles sont stoppés ou déviés.`;
    case 'etau': return `${maj(el.le)} se concentre en un noyau de ${Math.max(5, Math.round(v.diam / 3))} cm au-dessus du sceau et se compacte : ce qui était fluide devient dur et dense.`;
    case 'etau~': return `${maj(el.le)} s’étale en une brume légère sur ${fr(v.zone * 2)} m de rayon : l’effet est plus doux mais couvre toute la zone.`;
    case 'rempart': return dirType === 'radiale' || dirType === 'aucune'
      ? `Un dôme ${el.de} de ${fr(v.zone)} m de rayon se referme autour du sceau ; ses parois font ${v.epaisseur} cm d’épaisseur.`
      : `Un mur ${el.de} de ${fr(v.hauteur)} m de haut et ${v.epaisseur} cm d’épaisseur s’élève ${a.direction.label}, à ${Math.max(1, Math.round(v.portee / 2))} m du sceau.`;
    case 'rempart~': return `Un passage de ${v.diam} cm s’ouvre ${dir} à travers toute matière ${el.de} : mur, bloc ou paroi.`;
    case 'tourbillon': return `${maj(el.le)} tourne en vortex de ${fr(v.zone)} m de rayon et ${fr(v.hauteur)} m de haut ; ce qui est léger est aspiré et ballotté.`;
    case 'tourbillon~': return `Tout mouvement ${el.de} dans un rayon de ${fr(v.zone * 2)} m ralentit puis s’arrête : vagues, flammes et rafales s’apaisent.`;
    case 'figure': return `${maj(el.le)} prend la forme d’une créature (oiseau, chien, serpent…) de la taille d’un ${a.puissance >= 8 ? 'cheval' : a.puissance >= 4 ? 'loup' : 'chat'} ; elle agit ${dirType === 'cote' ? a.direction.label : 'autour du lanceur'} et obéit à des ordres simples.`;
    case 'figure~': return `Toute forme ou tout sort ${el.de} à moins de ${Math.max(4, v.portee)} m se défait : la magie de cet élément est dissipée.`;
    case 'tisse': return `${maj(el.le)} se tresse en rubans souples et solides, jusqu’à ${Math.max(3, v.portee)} m de long, qui peuvent lier, tirer ou servir de corde.`;
    case 'tisse~': return `Ce que touche le sceau devient rigide et cassant : un coup sec suffit à le briser.`;
    case 'ampleur': return `L’effet ou l’objet visé grandit : taille ×${v.mult}.`;
    case 'ampleur~': return `L’effet ou l’objet visé rétrécit : taille ÷${v.mult}.`;
  }
  return '';
}

const OFFENSIF = new Set(['jet', 'pluie', 'gerbe', 'dard', 'tourbillon', 'figure', 'rempart', 'pluie~', 'appel~']);

/** Détails narratifs par élément : sensations, effets sur les créatures, les objets, le décor */
interface Detail { sens: string; creatures: string; objets: string; decor: string; court: string; persiste: boolean }
const D = (court: string, sens: string, creatures: string, objets: string, decor: string, persiste = true): Detail => ({ court, sens, creatures, objets, decor, persiste });
const AUCUN_C = 'Aucun effet direct sur les êtres vivants.', AUCUN_O = 'Aucun effet sur les objets.', AUCUN_D = 'Aucun effet sur le décor.';
export const DETAILS: Record<string, Detail> = {
  braise: D('Tout ce qui est touché prend feu.', 'Une chaleur sèche monte du sceau ; l’air tremble et sent la résine brûlée.', 'Brûlures ; les vêtements peuvent prendre feu et continuer de brûler tant qu’on ne les éteint pas.', 'Bois, paille, tissu et papier s’enflamment ; le métal chauffe au contact prolongé.', 'Les herbes sèches s’embrasent, l’eau fume, la glace fond.'),
  'braise~': D('Tout ce qui est touché gèle.', 'Le souffle se change en buée ; le sol se couvre de cristaux qui crissent sous les pas.', 'Engourdies et ralenties ; une exposition longue les prend dans une gangue de glace.', 'Se couvrent de givre ; le métal devient cassant, les liquides gèlent.', 'Flaques et ruisseaux gèlent en surface, le sol devient glissant, les feux s’éteignent.'),
  source: D('Tout ce qui est touché est trempé, et renversé s’il est léger.', 'Un grondement d’eau vive ; des embruns froids fouettent le visage.', 'Trempées, repoussées, elles peuvent tomber ; respirer dans le jet est difficile.', 'Mouillés, renversés s’ils sont légers ; poudre, encre et parchemins sont gâchés.', 'Les feux s’éteignent, le sol devient boueux, les flaques grossissent.'),
  'source~': D('Tout ce qui est touché se dessèche.', 'L’air devient brûlant et sec ; les lèvres se fendillent.', 'Soif intense et fatigue ; les créatures d’eau souffrent beaucoup.', 'Le bois se fend, le cuir craquelle, les liquides s’évaporent.', 'Plantes fanées, boue durcie, flaques évaporées.'),
  socle: D('Tout ce qui est touché est frappé comme par une masse.', 'Le sol vibre sous les pieds ; odeur de pierre éclatée.', 'Coups violents ; elles peuvent être renversées ou ensevelies sous le sable.', 'Caisses et tonneaux éclatent, les vitres se brisent.', 'Le sol se soulève ou se creuse, des blocs de roche surgissent.'),
  'socle~': D('La pierre et la terre touchées s’effritent.', 'Un crissement de sable ; la pierre se fendille avec un bruit sec.', 'Toux et yeux brûlés ; aveuglées tant qu’elles restent dans le nuage.', 'Pierre, brique et céramique s’effritent.', 'Murs fissurés, statues réduites en poudre, chemins effacés.'),
  souffle: D('Tout ce qui est touché est repoussé, parfois renversé.', 'Les vêtements claquent ; poussière et feuilles se soulèvent en tourbillons.', 'Repoussées, elles peuvent tomber ; les petites créatures sont emportées.', 'Les objets légers volent, les portes claquent, les flèches sont déviées.', 'Les feux sont attisés ou soufflés, la fumée se disperse.', false),
  'souffle~': D('Les sons et les flammes s’étouffent.', 'Un silence total tombe : on n’entend plus que son propre cœur.', 'Assourdies, souffle court ; impossible de crier ou d’incanter à voix haute.', 'Cloches et instruments ne sonnent plus.', 'Les flammes s’étouffent, l’eau devient lisse comme un miroir.', false),
  lueur: D('Tout ce qui est touché est ébloui, et ce qui était caché apparaît.', 'Une clarté blanche, sans chaleur, efface toutes les ombres.', 'Éblouies ; les créatures de l’ombre fuient ou sont affaiblies.', 'Ce qui était caché ou invisible se révèle.', 'La zone est éclairée comme en plein jour.', false),
  'lueur~': D('Tout est plongé dans le noir.', 'Le froid de la nuit tombe d’un coup ; les lumières vacillent puis meurent.', 'Aveuglées dans la zone, sauf celles qui voient dans le noir.', 'Lanternes et torches n’éclairent presque plus.', 'La zone devient d’un noir d’encre, même en plein jour.', false),
  memoire: D('Les objets touchés retrouvent leur état d’avant.', 'Une odeur de neuf ; les fêlures se referment avec un léger tintement.', AUCUN_C, 'Réparés, nettoyés, rendus à leur état d’avant (jusqu’à une journée en arrière).', 'Les traces récentes s’effacent : pas, taches, rayures.'),
  'memoire~': D('Les objets touchés vieillissent d’un coup.', 'Odeur de rouille et de bois humide ; les choses craquent.', AUCUN_C, 'Vieillissent de plusieurs années : rouille, pourriture, cordes qui cèdent.', 'Planchers vermoulus, ponts fragilisés.'),
  regard: D('Ce qui était caché est révélé.', 'Un picotement derrière les yeux ; la vue se fait perçante.', 'Les créatures invisibles ou cachées sont repérées.', 'Le lanceur voit à travers les parois minces et les coffres.', 'Pièges, passages secrets et traces deviennent visibles.', false),
  'regard~': D('Tout ce qui est touché devient invisible.', 'Les contours se brouillent comme derrière une vitre embuée.', 'Invisibles tant qu’elles restent immobiles, floues quand elles bougent.', 'Disparaissent à la vue mais restent palpables.', 'Une zone entière peut être masquée aux regards.', false),
  lien: D('Tout ce qui est touché est collé et entravé.', 'Un fil invisible se tend ; les objets semblent soudés.', 'Collées au sol ou entre elles ; il faut une grande force pour se libérer.', 'Se soudent : portes, coffres et couvercles ne s’ouvrent plus.', 'Les pierres d’un mur se soudent, un pont branlant tient bon.', false),
  'lien~': D('Attaches, nœuds et verrous se défont.', 'Un claquement sec, comme une corde qui casse.', 'Liens, menottes et filets qui les retiennent se défont.', 'Verrous, nœuds, charnières et chaînes s’ouvrent.', 'Les assemblages se défont : barrières, échafaudages.'),
  mouvement: D('Les objets touchés s’animent.', 'Un frémissement court dans les objets, comme s’ils retenaient leur souffle.', AUCUN_C, 'S’animent et obéissent à des ordres simples : porter, frapper, garder.', 'Les mécanismes à l’arrêt se remettent en marche.', false),
  'mouvement~': D('Les mécanismes touchés se figent.', 'Tout se fige ; même le balancier de l’horloge s’immobilise.', AUCUN_C, 'Les objets en mouvement s’immobilisent net.', 'Roues, moulins, pièges et horloges s’arrêtent.', false),
  seve: D('Le vivant touché guérit et pousse.', 'Odeur d’herbe coupée ; une douce chaleur verte.', 'Les plaies se referment, la fatigue s’efface.', 'Le bois vivant reverdit ; le bois mort reste mort.', 'Les plantes poussent et fleurissent en quelques instants.'),
  'seve~': D('Le vivant touché s’affaiblit.', 'Odeur de feuilles mortes ; la peau se fait grise.', 'Affaiblies, la peau grisaille, les blessures se rouvrent.', 'Les plantes cueillies pourrissent, le cuir se dessèche.', 'Herbe et feuillage jaunissent et tombent.'),
  chair: D('Les corps touchés se déforment.', 'La chair frémit et ondule sous la peau.', 'Le corps change de taille ou de forme : membres, traits du visage.', AUCUN_O, AUCUN_D),
  'chair~': D('Les corps touchés se changent en pierre.', 'Les membres s’alourdissent ; la peau prend le grain de la pierre.', 'Se raidissent, puis se changent peu à peu en pierre.', AUCUN_O, AUCUN_D),
  esprit: D('La personne visée oublie un souvenir précis.', 'Un vertige, comme un mot sur le bout de la langue.', 'Un souvenir précis disparaît ou change.', AUCUN_O, AUCUN_D),
  'esprit~': D('Un souvenir oublié revient à la personne visée.', 'Une image surgit, nette, oubliée depuis longtemps.', 'Un souvenir effacé revient d’un coup.', AUCUN_O, AUCUN_D),
};

const NOM_COEUR: Record<string, [string, string]> = {
  braise: ['Braise', 'Givre'], source: ['Source', 'Aride'], socle: ['Socle', 'Poussière'], souffle: ['Souffle', 'Calme'], lueur: ['Lueur', 'Pénombre'],
  memoire: ['Mémoire', 'Usure'], regard: ['Regard', 'Voile'], lien: ['Lien', 'Rupture'], mouvement: ['Mouvement', 'Arrêt'],
  seve: ['Sève', 'Flétrissure'], chair: ['Chair', 'Figement'], esprit: ['Esprit', 'Réminiscence'],
};

/** Phrase courte de la forme, pour le résumé */
function brefForme(id: string, inv: boolean, el: Element, v: Valeurs, a: Analyse, n = 2): string {
  const radial = a.direction.type === 'radiale' || a.direction.type === 'aucune';
  const dir = radial ? 'vers le ciel' : a.direction.label;
  const L = v.portee ? ` sur ${v.portee} m` : '';
  const Z = `${fr(v.zone)} m de rayon`;
  switch (id + (inv ? '~' : '')) {
    case 'jet': return `un faisceau ${el.de} jaillit ${dir}${L}`;
    case 'jet~': return `le sceau aspire ${el.le} alentour`;
    case 'pluie': return `une averse ${el.de} s’abat sur ${Z}`;
    case 'pluie~': return `${el.le} jaillit du sol en geysers sur ${Z}`;
    case 'gerbe': return radial ? `${el.le} déferle tout autour du sceau` : `${el.le} déferle en éventail ${dir}`;
    case 'gerbe~': return `le sceau rassemble tout ce qui est fait ${el.de}`;
    case 'plume': return 'ce qui est posé sur le sceau s’élève et flotte';
    case 'plume~': return 'tout ce qui entoure le sceau devient lourd et se plaque au sol';
    case 'appel': return 'le sceau attire à lui ce qui l’entoure';
    case 'appel~': return `une onde ${el.de} chasse tout ce qui entoure le sceau`;
    case 'dard': return n > 1 ? `${n} projectiles ${el.de} partent ${dir} à chaque battement de cœur` : `un projectile ${el.de} part ${dir} à chaque battement de cœur`;
    case 'dard~': return `un bouclier ${el.de} arrête les projectiles`;
    case 'etau': return `${el.le} se concentre en un noyau dur au-dessus du sceau`;
    case 'etau~': return `${el.le} s’étale en brume légère sur la zone`;
    case 'rempart': return radial ? `un dôme ${el.de} se referme autour du sceau` : `un mur ${el.de} se dresse ${dir}`;
    case 'rempart~': return `un passage s’ouvre ${dir} à travers toute matière ${el.de}`;
    case 'tourbillon': return `un vortex ${el.de} se forme autour du sceau`;
    case 'tourbillon~': return `tout mouvement ${el.de} s’apaise autour du sceau`;
    case 'figure': return `${el.le} prend la forme d’une créature qui attaque`;
    case 'figure~': return `toute magie ${el.de} proche se défait`;
    case 'tisse': return `des rubans ${el.de} partent ligoter les cibles`;
    case 'tisse~': return 'ce que touche le sceau devient rigide et cassant';
    case 'ampleur': return 'l’objet visé grandit';
    case 'ampleur~': return 'l’objet visé rétrécit';
  }
  return `${el.le} s’éveille au-dessus du sceau`;
}

const dureeCourte = (d: string) =>
  d === 'Instantané' ? 'en un instant' : d.startsWith('Quelques instants') ? 'pendant quelques instants' : d.startsWith('Quelques tours') ? 'pendant environ une minute'
    : d.startsWith('Une scène') ? 'pendant une scène (environ 10 minutes)' : d === 'Une heure' ? 'pendant une heure' : d === 'Une journée' ? 'pendant une journée' : '';

export interface Description {
  titre: string;
  composition: string;
  enBref: string;
  declenchement: string;
  accroche: string;
  formes: string[];
  sensation: string;
  impact: string;
  surCibles: { label: string; texte: string }[];
  reglages: string[];
  stats: { label: string; valeur: string }[];
  fin: string;
  contre: string;
  risque: string | null;
  element: Element | null;
}

export function decrire(s: Sceau, a: Analyse): Description {
  if (!s.coeur) return { titre: 'Sceau en cours', composition: '', enBref: 'Le sceau n’a pas de Cœur : rien ne se passe.', declenchement: '', accroche: '', formes: [], sensation: '', impact: '', surCibles: [], reglages: [], stats: [], fin: '', contre: '', risque: null, element: null };
  const cle = s.coeur.id + (s.coeur.inv ? '~' : '');
  const el = ELEMENTS[cle];
  const det = DETAILS[cle];
  const v = valeurs(s, a);
  const has = (id: string, inv: boolean) => s.noeuds.some((n) => n.id === id && n.inv === inv);
  const formes = a.formes.length
    ? a.formes.map((f) => phraseForme(f.id, f.inv, f.nombre, el, v, a))
    : [`${maj(el.le)} s’éveille au-dessus du sceau en une lueur diffuse, sans forme précise.`];
  const reglages: string[] = [];
  if (has('fenetre', false)) reglages.push('Seul l’objet sur lequel le sceau est tracé subit l’effet.');
  if (has('fenetre', true)) reglages.push('L’effet frappe ce qui touche ou approche le sceau, pas son support.');
  if (has('halo', false)) reglages.push(`L’effet couvre toute la zone (${fr(v.zone)} m de rayon).`);
  if (has('halo', true)) reglages.push(`L’effet couvre ${fr(v.zone)} m de rayon mais épargne le centre : le lanceur et ses voisins immédiats sont à l’abri.`);
  if (s.noeuds.some((n) => n.id === 'visee' && !n.inv)) reglages.push(`Visée : la portée est allongée (${v.portee} m).`);
  if (has('visee', true)) reglages.push('Repli : l’effet reste collé au sceau mais frappe plus fort.');
  if (has('sablier', false)) reglages.push(`Sablier : l’effet tient ${a.duree.toLowerCase()}.`);
  if (has('sablier', true)) reglages.push('Fulgurance : tout se joue en un instant, avec une force accrue.');
  if (has('douce', false)) reglages.push(`Braise-douce : l’effet est atténué (${el.matiere} tiède, sans danger réel).`);
  if (has('douce', true)) reglages.push('Attise : l’effet est amplifié mais difficile à contenir.');
  const nEcho = s.noeuds.filter((n) => n.id === 'echo' && !n.inv).length;
  if (nEcho) reglages.push(`Écho : l’effet frappe en ${nEcho + 1} pulsations successives.`);
  if (has('echo', true)) reglages.push('Retenue : le sort se charge quelques instants puis libère tout d’un coup.');
  if (has('guet', false)) reglages.push('Guet : le sort attend, armé, et se déclenche au passage d’une créature.');
  if (has('guet', true)) reglages.push('Veille : le sort reste actif tant que personne n’est là et se coupe en présence de quelqu’un.');
  if (has('mot', false)) reglages.push('Mot : le sort se déclenche quand le lanceur prononce le mot convenu.');
  if (has('mot', true)) reglages.push('Mutisme : le mot convenu coupe le sort.');

  const stats: Description['stats'] = [];
  stats.push({ label: 'Portée', valeur: v.portee === 0 ? 'Contact' : `${v.portee} m` });
  stats.push({ label: 'Zone', valeur: `${fr(v.zone)} m de rayon` });
  stats.push({ label: 'Durée', valeur: a.duree });
  const offensif = a.formes.some((f) => OFFENSIF.has(f.id + (f.inv ? '~' : '')));
  if (el.soin) stats.push({ label: 'Soin indicatif', valeur: `${Math.max(1, Math.round(a.puissance / 2))}d6 PV` });
  else if (el.degats && offensif && !has('douce', false)) stats.push({ label: 'Dégâts indicatifs', valeur: `${Math.max(1, Math.round(a.puissance / 2))}d6 · ${el.degats}` });
  if (el.etat) stats.push({ label: 'État infligé', valeur: el.etat });
  stats.push({ label: 'Résister', valeur: a.puissance <= 2 ? 'Facile' : a.puissance <= 5 ? 'Moyen' : a.puissance <= 8 ? 'Difficile' : 'Très difficile' });

  let risque: string | null = null;
  if (a.stabilite < 35) risque = 'Sceau dangereux : sur un échec, le sort se retourne contre le lanceur (effet inversé, centré sur lui).';
  else if (a.stabilite < 60) risque = 'Sceau instable : sur un échec, l’effet dérive de 45° et ne donne que la moitié de sa puissance.';
  else if (a.stabilite < 85) risque = 'Sceau correct : l’effet vacille un peu, la durée peut être raccourcie d’un cran.';

  const accroche = `${maj(el.le)} répond à l’appel du sceau${a.puissance >= 9 ? ' avec une violence rare' : a.puissance >= 6 ? ' avec force' : a.puissance <= 2 ? ', faiblement' : ''}.`;

  // résumé en une phrase
  const f0 = a.formes[0];
  const bref = brefForme(f0?.id ?? '', !!f0?.inv, el, v, a, f0?.nombre);
  const autres = a.formes.slice(1).map((f) => brefForme(f.id, f.inv, el, v, a, f.nombre));
  const enBref = `${maj(bref)}${autres.length ? ' ; ' + autres.join(' ; ') : ''}, ${dureeCourte(a.duree) || a.duree.toLowerCase()}. ${det.court}`;

  // composition lisible
  const [nC, nI] = NOM_COEUR[s.coeur.id];
  const composition = [`Cœur ${s.coeur.inv ? nI : nC}`, ...a.formes.map((f) => `${f.nom}${f.nombre > 1 ? ' ×' + f.nombre : ''}`), ...s.noeuds.map((n) => {
    const noms: Record<string, [string, string]> = { fenetre: ['Fenêtre', 'Seuil'], halo: ['Halo', 'Refuge'], sablier: ['Sablier', 'Fulgurance'], visee: ['Visée', 'Repli'], douce: ['Braise-douce', 'Attise'], echo: ['Écho', 'Retenue'], guet: ['Guet', 'Veille'], mot: ['Mot', 'Mutisme'] };
    return noms[n.id][n.inv ? 1 : 0];
  }), ...(s.couronne ? ['Double cerne'] : []), ...(s.fendu ? ['Sceau fendu'] : []), ...(s.greffe ? ['Greffe'] : [])].join(' · ');

  // déclenchement
  let declenchement = 'Le sort s’éveille dès que la cerne se referme.';
  if (s.entaille !== null) declenchement = 'Sort préparé : il reste endormi tant que l’entaille de la cerne n’est pas fermée d’un trait.';
  if (has('guet', false)) declenchement = 'Le sort reste tapi dans le sceau, invisible, et s’éveille dès qu’une créature passe à sa portée.';
  if (has('guet', true)) declenchement = 'Le sort agit tant que la zone est vide et se coupe dès que quelqu’un s’y trouve.';
  if (has('mot', false)) declenchement = 'Le sort attend le mot convenu : il s’éveille dès que le lanceur le prononce.';

  if (s.fendu) declenchement = 'Sceau fendu : il est tracé en deux moitiés, par exemple sur les deux battants d’une porte ou sur deux pierres. Il s’éveille dès que les moitiés se rejoignent et s’éteint quand on les sépare.';

  // techniques avancées
  const techniques: string[] = [];
  if (s.couronne && s.couronne.rameaux.length) {
    const noms = [...new Set(s.couronne.rameaux.map((r) => (r.inv ? SIGNE_NOM_INV[r.id] : SIGNE_NOM[r.id])))].join(', ');
    techniques.push(`Double cerne : la couronne (${noms}) se superpose à la forme intérieure ; les deux effets se combinent et la puissance augmente.`);
  }
  if (a.technique.greffe) {
    const g = a.technique.greffe, sg = s.greffe!;
    const dg = decrire(sg, g.analyse);
    if (g.mode === 'renfort') techniques.push(`Greffe : un second sceau identique est relié au premier par un trait. Leurs puissances s’additionnent (puissance totale ${a.puissance}).`);
    else if (g.mode === 'annulation') techniques.push('Greffe : le second sceau est l’inverse du premier. Les deux sorts s’annulent : rien ne se produit, sauf un éclair bref au moment de la fermeture. Utile pour neutraliser un sceau ennemi.');
    else techniques.push(`Greffe : un second sceau, « ${g.analyse.nomSuggere} », est relié au premier. Les deux sorts se déclenchent ensemble. ${dg.enBref}`);
  }
  reglages.unshift(...techniques);

  const surCibles = [
    { label: 'Créatures', texte: det.creatures },
    { label: 'Objets', texte: det.objets },
    { label: 'Décor', texte: det.decor },
  ];
  const fin = det.persiste
    ? `Quand le sort s’achève, ${el.le} retombe ou se dissipe, mais ce qui a été touché le reste : les dégâts et transformations demeurent.`
    : 'Quand le sort s’achève, ses effets cessent avec lui et tout redevient comme avant.';
  const contre = `Un sort de ${s.coeur.inv ? nC : nI} (le même Cœur, inversé) de puissance égale l’annule ; une Dissolution ${el.de} le défait.`;

  return { titre: a.nomSuggere, composition, enBref, declenchement, accroche, formes, sensation: det.sens, impact: el.impact, surCibles, reglages, stats, fin, contre, risque, element: el };
}
