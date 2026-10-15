// API publique du module « Joueurs » (joueurs à distance). Voir MODULE.md.
export { definition } from './definition';
/* Pour la Table de combat : quel personnage joue derrière un lien, et qui a un lien. */
export { distantsDe, persoDuJeton, lienJoueur } from './logique';
/* Pour le mur des écrans : onglet et taille de l'écran de chaque joueur. */
export { suivreEcransJoueurs, type EtatEcran } from './ecrans';
