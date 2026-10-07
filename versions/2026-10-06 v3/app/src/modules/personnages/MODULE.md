# Module Personnages

Fiche unique d'un personnage (PJ, allié, PNJ, neutre, ennemi). État : **prêt** (identité, portrait, stats, secrets).
Plus tard : apparence (Avatar), magie (Atelier), jeton de combat.

| Fichier | Rôle |
|---|---|
| `logique.ts` | Pur. `SORTES`, `libelleSorte`, `campJoueurs`, `champsVisibles(p, R, role)`, `ajouter`, `modifierPerso`, `supprimer` (libère le portrait), `grouper`, `sceneJoueurs(p, R, portrait)`. |
| `Page.tsx` | Liste groupée + fiche ; portrait (fichier de campagne), « Montrer aux joueurs », suppression. |
| `Fiche.tsx` | Formulaire ; les champs de stats sont générés depuis `SystemeRegles.champs`. Bloc MJ : notes secrètes, `mj.cache`. |
| `personnages.css` | Classes `.perso-`. |
| `personnages.test.ts` | Tests de `logique.ts`. |

Règle de visibilité : les joueurs voient toutes les stats des PJ et alliés, seulement les champs `publicEnnemi` des autres.
Fiche : champ « Rôle ou métier » (`personnage.role`), bouton « Stats selon le rôle » (`R.statsPourProfil`), bouton « Arbre généalogique » (module Généalogie).

API publique : `definition`, `SORTES`, `libelleSorte`, `campJoueurs`, `sceneJoueurs`.
