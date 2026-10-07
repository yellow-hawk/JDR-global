# Module Combat

État : **prêt (réécrit)**. La Table de combat est en TypeScript, en trois sous-modules. Plus de cadre (iframe) ni de `public/combat/`.
Sauvegarde de la v7 intégrée : `../versions/2026-10-06 combat-v7-integre/`.

## Sous-modules

| Dossier | Rôle | Règle |
|---|---|---|
| `moteur/` | Règles et état de la table, **pur** (ni React ni navigateur), testé (`moteur.test.ts`). | Fonctions `(etat, …) → nouvel état`, jamais de mutation. `rng` injectable. |
| `rendu/` | Dessin sur canevas 2D à partir d'un état + caméra + aperçus. | Ne modifie jamais l'état. Seules les particules sont mutables. |
| `interface/` | Composants React et souris. | Toute modification passe par `ctl.faire(f)` (historique). |

### moteur/

| Fichier | Contenu |
|---|---|
| `types.ts` | `EtatTable` (version 1), `Jeton`, `Zone`, `Gabarit` (sort), `TypeTerrain`, `Modele`, `cle()`. |
| `donnees.json` | États (conditions), terrains, 9 sorts de base, bibliothèque. Données, pas de code. |
| `grille.ts` | Carrée ou hexagonale (pointe en haut, axiale) : `centre`, `cellule`, `distance`, `voisins`, `coinsHex`. |
| `formes.ts` | `pointDansZone`, `celluleDansZone`, `jetonsDansZone`, `terrainsSur`. Cône 90°, ligne de 1,2 case de large. |
| `deplacement.ts` | `porteeDeplacement` (parcours pondéré, terrains, cases occupées), `chemin`. |
| `vision.ts` | `casesVisibles` (rayons, murs), `revelerParLaVue` (brouillard). |
| `etat.ts` | `nouvelEtat`, jetons (ajouter, modifier, PV, états, dupliquer), zones, brouillard, bibliothèque, sorts, journal. |
| `regles.ts` | `debuterCombat`, `tourSuivant`, `finirCombat`, `deplacer`, `attaquer` (d20 + mod contre CA, critique = dés doublés), `zoneDeSort`, `lancerSort` (antimagie, portée, concentration). |
| `srd.ts` · `compat.ts` · `historique.ts` | Bloc de stats collé → modèle ; ancien état v7 → `EtatTable` (`lireEtat`) ; annuler / rétablir (50 étapes). |

### rendu/

`camera.ts` (monde ↔ écran, zoom au curseur, `cadrer`), `visibilite.ts` (ce que voient les joueurs, `bornes`), `peintre.ts` (outils communs),
`zones.ts`, `jetons.ts`, `apercus.ts` (portée + chemin, mesure, polygone, attaque, sort visé, pinceau), `particules.ts`,
`dessin.ts` (`dessinerScene`), `imageJoueurs.ts` (toute la carte en 1920×1080, vue joueurs).

### interface/

`types.ts` (`Ui`, `Controleur`), `useTable.ts` (historique, réglages, vue des PJ qui révèle le brouillard), `souris.ts` (outils), `interactions.ts` (pur, testé),
`Table.tsx` (canevas, clavier Échap / Entrée / Suppr), `BarreOutils.tsx`, `Panneaux.tsx` (Initiative, Detail, Jetons, Sorts + ModaleSort, Des, Journal, Affichage),
`Campagne.tsx` (personnages → jetons, carte de fond, sorts de l'Atelier, rencontres, diffusion), `images.ts` (portraits, carte de fond MJ / joueurs), `sons.ts`.

## Fichiers du module

| Fichier | Rôle |
|---|---|
| `Page.tsx` | Assemble les trois colonnes ; sauvegarde auto dans `modules.combat.table` ; Ctrl+Z / Ctrl+Y ; diffusion vers l'écran joueurs ; `prendreCible('combat')` charge une rencontre. |
| `logique.ts` | Pur, testé : `tableDepuisPlan` (carte de bataille générée → table prête : fond calé, murs en terrains, PJ et adversaires placés), `jetonDepuisPersonnage`, `gabarit(SortAnalyse, R)`, `enregistrerRencontre`, `etatDeRencontre`, `reporterDansFiches`, `tableEnCours`, `avecTableEnCours`. |
| `sorts.ts` | `sortsDeLaCampagne(c)` : grimoire du MJ (base incluse) + grimoires des PJ, lus avec le moteur de Magie. |

Packs d'univers (`moteur/packs.ts`, `interface/Packs.tsx`) : créatures, sorts et états d'un univers dans un fichier JSON (`public/packs/`, ex. L'Épée de vérité) ; installés dans `modules.combat.packs`, appliqués aux nouvelles tables. La bibliothèque et les sorts de base sont génériques.
Grimoire de la table : tous les sorts de la campagne, synchronisés automatiquement (`sorts.ts` → `gabaritsDeLaCampagne`), avec leurs lanceurs (`Gabarit.lanceurs`) ; l'onglet Sorts montre d'abord ceux du lanceur choisi.
Diffusion : automatique vers l'écran joueurs au chargement d'une rencontre ou au lancement de l'initiative (`modules.combat.diffusionAuto`).

API publique (`index.ts`) : `definition`, `packsDeLaCampagne`, `tableDepuisPlan`, `BIBLIOTHEQUE_DE_BASE`, `gabarit`, `jetonDepuisPersonnage`, `METRES_PAR_CASE`, `lireEtat`, `nouvelEtat`, type `EtatTable`.
Rencontre : `jetons` liés aux fiches, `terrain`, `table` = `EtatTable` (les anciennes tables v7 sont converties au chargement).
Aperçu joueurs : même table en lecture seule, vue joueurs (stats ennemies, jetons cachés, ennemis invisibles et brouillard masqués).
