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

## Création (`creation/`)

`+ PJ / + PNJ / + Ennemi` ouvrent le panneau `Creation.tsx` : **Aléatoire** (`Aleatoire.tsx` : sorte, nombre, rôle, niveau, classe, peuple, genre, méthode ; lot jusqu'à 20), **Assistant pas à pas** (`Assistant.tsx` : origine, caractéristiques standard / achat de points / 4d6, compétences, personnalité, résumé), **Fiche vierge**. `logique.ts` (pur, testé) : `genererLot` (PJ : `R.creation.aleatoire` ; PNJ : + générateur de PNJ pour rôle, manières, motivation, secret), `personnageDepuisChoix`, `apparencePour` (tenue selon la classe ou le rôle via `apparenceAuto`, puis arme et armure de l'inventaire), `assetsDeLInventaire`. Portraits (jetons) rendus ensuite par `FabriqueDePortraits`.

API publique : `definition`, `SORTES`, `libelleSorte`, `campJoueurs`, `sceneJoueurs`.

## Relations

`relations.ts` + `relations.json` (pur, testé) : `ajouterRelation`, `retirerRelation`, `relationsDe` (dans les deux sens, libellé inverse), `RELATIONS`, `sorteRelation`. `PanneauRelations.tsx` sur la fiche (ajout, suppression, relation secrète). Données : `personnage.relations`.
