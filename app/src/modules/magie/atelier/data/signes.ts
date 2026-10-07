// Catalogue des signes de l'Atelier de tracé (alphabet v0.1).
// Les données d'effet en jeu (portée, durée…) sont calculées par le moteur à partir de ces fiches.

export type Famille = 'coeur' | 'rameau' | 'noeud';
export type Rang = 1 | 2 | 3;
export type CategorieCoeur = 'element' | 'nature' | 'scelle';

export interface Signe {
  id: string;
  famille: Famille;
  nom: string;
  effet: string;
  nomInverse: string;
  effetInverse: string;
  /** Rang de difficulté (Rameaux et Nœuds). Les Cœurs : 1 élémentaire, 2 nature, 3 scellé. */
  rang: Rang;
  categorie?: CategorieCoeur;
  /** Famille de réglage d'un Nœud */
  reglage?: 'cible' | 'portee' | 'duree' | 'intensite' | 'rythme' | 'declencheur';
  /** Couleurs de l'animation [endroit, inversé] */
  couleurs?: [string, string];
}

const C = (
  id: string, nom: string, effet: string, nomInverse: string, effetInverse: string,
  categorie: CategorieCoeur, couleurs: [string, string],
): Signe => ({
  id, famille: 'coeur', nom, effet, nomInverse, effetInverse, categorie, couleurs,
  rang: categorie === 'element' ? 1 : categorie === 'nature' ? 2 : 3,
});
const R = (id: string, nom: string, effet: string, nomInverse: string, effetInverse: string, rang: Rang): Signe =>
  ({ id, famille: 'rameau', nom, effet, nomInverse, effetInverse, rang });
const N = (
  id: string, nom: string, effet: string, nomInverse: string, effetInverse: string, rang: Rang,
  reglage: NonNullable<Signe['reglage']>,
): Signe => ({ id, famille: 'noeud', nom, effet, nomInverse, effetInverse, rang, reglage });

export const COEURS: Signe[] = [
  C('braise', 'Braise', 'Feu, chaleur, combustion.', 'Givre', 'Froid, gel, glace.', 'element', ['#ff7a2f', '#9fd8ff']),
  C('source', 'Source', 'Eau et liquides.', 'Aride', 'Assèche, évapore.', 'element', ['#3d8bff', '#d9b77a']),
  C('socle', 'Socle', 'Terre, pierre, sable.', 'Poussière', 'Effrite, érode, réduit en poudre.', 'element', ['#a5793f', '#b9ada0']),
  C('souffle', 'Souffle', 'Air, vent.', 'Calme', 'Air immobile, vide, silence.', 'element', ['#bfefff', '#8090a8']),
  C('lueur', 'Lueur', 'Lumière, clarté.', 'Pénombre', 'Ombre, obscurité.', 'element', ['#ffe680', '#5b3f8c']),
  C('memoire', 'Mémoire', 'Ramène un objet à son état précédent : répare, conserve.', 'Usure', 'Accélère le vieillissement d’un objet.', 'nature', ['#f2c45a', '#8a6a4a']),
  C('regard', 'Regard', 'Voir de loin, à travers, révéler le caché.', 'Voile', 'Rend invisible, camoufle.', 'nature', ['#4fd1c5', '#6d7a99']),
  C('lien', 'Lien', 'Attache, colle, scelle deux objets.', 'Rupture', 'Sépare, détache, ouvre les verrous.', 'nature', ['#ff8fc7', '#c2c2c2']),
  C('mouvement', 'Mouvement', 'Anime un objet inerte, comme une marionnette.', 'Arrêt', 'Fige un objet ou un mécanisme.', 'nature', ['#7be08a', '#9aa3b5']),
  C('seve', 'Sève', 'Soigne, fait croître le vivant.', 'Flétrissure', 'Affaiblit, fait dépérir.', 'scelle', ['#5fd068', '#7a6a3a']),
  C('chair', 'Chair', 'Transforme un corps : forme, taille.', 'Figement', 'Pétrifie.', 'scelle', ['#e0565b', '#9a9a9a']),
  C('esprit', 'Esprit', 'Efface ou modifie un souvenir.', 'Réminiscence', 'Fait resurgir un souvenir effacé.', 'scelle', ['#b48cff', '#ffd9a0']),
];

export const RAMEAUX: Signe[] = [
  R('jet', 'Jet', 'Colonne ou faisceau continu.', 'Puits', 'Aspire l’élément en colonne vers le sceau.', 1),
  R('pluie', 'Pluie', 'L’élément tombe en averse sur une zone.', 'Remontée', 'L’élément s’élève du sol : geyser, vapeur, braises.', 1),
  R('gerbe', 'Gerbe', 'Déborde, se répand dans toutes les directions.', 'Moisson', 'Rassemble l’élément épars vers le sceau.', 1),
  R('plume', 'Plume', 'Fait léviter ce qui est posé sur le sceau.', 'Ancre', 'Alourdit, plaque au sol.', 1),
  R('appel', 'Appel', 'Attire la matière de l’élément.', 'Rejet', 'Repousse.', 1),
  R('dard', 'Dard', 'Projectiles rapides : traits, éclats, boules.', 'Parade', 'Intercepte les projectiles de l’élément.', 2),
  R('etau', 'Étau', 'Concentre en un point, compacte, solidifie.', 'Diffusion', 'Étale en brume, affaiblit, ramollit.', 2),
  R('rempart', 'Rempart', 'Forme un mur, une barrière, un dôme.', 'Brèche', 'Perce un passage dans une matière de l’élément.', 2),
  R('tourbillon', 'Tourbillon', 'Fait tourner l’élément : vortex, toupie.', 'Apaisement', 'Stoppe le mouvement, calme.', 2),
  R('ampleur', 'Ampleur', 'Agrandit l’effet ou l’objet.', 'Réduction', 'Rétrécit.', 3),
  R('figure', 'Figure', 'L’élément prend la forme d’une créature qui agit.', 'Dissolution', 'Défait une forme ou un sort de cet élément.', 3),
  R('tisse', 'Tisse', 'Rend souple : ruban, corde, filet.', 'Trempe', 'Rend rigide et cassant.', 3),
];

export const NOEUDS: Signe[] = [
  N('fenetre', 'Fenêtre', 'Agit sur le support du sceau.', 'Seuil', 'Agit sur ce qui touche ou approche le sceau.', 1, 'cible'),
  N('halo', 'Halo', 'Agit sur toute une zone autour du sceau.', 'Refuge', 'Zone d’effet qui épargne le centre et ses occupants.', 1, 'cible'),
  N('sablier', 'Sablier', 'Prolonge la durée (scène, heure, jour).', 'Fulgurance', 'Instantané mais plus puissant.', 1, 'duree'),
  N('visee', 'Visée', 'Allonge la portée dans sa direction.', 'Repli', 'Portée nulle, effet collé au sceau mais plus intense.', 2, 'portee'),
  N('douce', 'Braise-douce', 'Atténue (feu → chaleur, vent → brise).', 'Attise', 'Amplifie, mais rend le sort instable.', 2, 'intensite'),
  N('echo', 'Écho', 'Se répète par pulsations.', 'Retenue', 'Accumule puis libère tout d’un coup.', 2, 'rythme'),
  N('guet', 'Guet', 'S’active au passage de quelqu’un.', 'Veille', 'Se coupe en présence de quelqu’un, actif sinon.', 3, 'declencheur'),
  N('mot', 'Mot', 'S’active sur un mot convenu.', 'Mutisme', 'Se désactive sur ce mot.', 3, 'declencheur'),
];

export const TOUS: Signe[] = [...COEURS, ...RAMEAUX, ...NOEUDS];
export const SIGNE: Record<string, Signe> = Object.fromEntries(TOUS.map((s) => [s.id, s]));

export const RANGS: Record<Rang, string> = { 1: 'Apprenti', 2: 'Compagnon', 3: 'Maître' };

export const nomSigne = (id: string, inv: boolean) => (inv ? SIGNE[id].nomInverse : SIGNE[id].nom);
export const effetSigne = (id: string, inv: boolean) => (inv ? SIGNE[id].effetInverse : SIGNE[id].effet);
