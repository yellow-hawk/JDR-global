# Module Personnages

Fiche unique d'un personnage (PJ, allié, PNJ, neutre, ennemi). État : **prêt** — fiche détaillée en 7 onglets (09/10).

| Fichier | Rôle |
|---|---|
| `logique.ts` | Pur. `SORTES`, `libelleSorte`, `campJoueurs`, `champsVisibles(p, R, role)`, `avecStatsCalculees(p, R)`, `ONGLETS`, `ongletsVisibles(p, R, role)` (joueurs : identité et combat seulement hors de leur camp), `ajouter`, `modifierPerso`, `supprimer` (libère le portrait), `grouper`, `sceneJoueurs(p, R, portrait)`. |
| `Page.tsx` | Liste groupée + fiche ; portrait (fichier de campagne), « Montrer aux joueurs », suppression. |
| `Fiche.tsx` | En-tête (portrait, nom, sorte, rôle, joueur, résumé calculé), onglets `fiche/` ; toute modification passe par `avecStatsCalculees`. |
| `fiche/` | Un fichier par onglet : `Identite`, `Caracteristiques` (caracs, sauvegardes, compétences ○●◉, valeurs dérivées), `Combat` (champs du système, attaques calculées, santé et résistances), `Progression` (classes, XP, aptitudes), `Magie` (profil de l'Atelier), `Inventaire` (catalogue ou objets libres, équipé, harmonisé, effets, bourse, charge), `Histoire` (relations, journal, bloc MJ). `types.ts` : `PropsOnglet`, `majFiche`. |
| `personnages.css` | Classes `.perso-`. |
| `personnages.test.ts` | Tests de `logique.ts`. |

Règle de visibilité : les joueurs voient toutes les stats des PJ et alliés, seulement les champs `publicEnnemi` des autres.
Fiche : champ « Rôle ou métier » (`personnage.role`), bouton « Stats selon le rôle » (`R.statsPourProfil`), bouton « Arbre généalogique » (module Généalogie).

API publique : `definition`, `SORTES`, `libelleSorte`, `campJoueurs`, `sceneJoueurs`.

## Relations

`relations.ts` + `relations.json` (pur, testé) : `ajouterRelation`, `retirerRelation`, `relationsDe` (dans les deux sens, libellé inverse), `RELATIONS`, `sorteRelation`. `PanneauRelations.tsx` sur la fiche (ajout, suppression, relation secrète). Données : `personnage.relations`.
