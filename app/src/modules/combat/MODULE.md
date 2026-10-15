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

## Dés

L'onglet Dés utilise le plateau partagé (`interface/des`) : le jeton choisi est le lanceur, le jet va au journal de la table et roule en 3D sur l'écran joueurs.

## Rencontres générées et images des jetons

- `rencontres.ts` + `rencontres.json` (pur, testé) : `composerRencontre` (milieu, difficulté, niveaux des PJ → budget d'XP `R.progression.difficulte`, chef dont la puissance laisse la moitié du budget aux troupes, créatures fortes plus probables), `nommer` (humanoïdes → « Garn, bandit » + description du générateur de PNJ, créatures numérotées), `difficulteAtteinte`. Exporté : `composerRencontre`, `nommerAdversaires` (batailles de l'Atlas).
- `interface/GenererRencontre.tsx` (colonne campagne) : chef = vrai PNJ « ennemi » (fiche, avatar, portrait posé sur son jeton), PJ placés, table vidée (annulable).
- Icônes : `Jeton.icone` (emoji) ; absente = d'après le nom (`iconeDe`, motifs `donnees.json` → `icones`). `interface/ImageJeton.tsx` : image importée (recadrée), icône, retrait, « même image pour tous les … » (`nomDeBase`) ; aussi sur les modèles de la bibliothèque (🖼).
- Écran joueurs : la diffusion de la table a la source `combat` et s'arrête dès qu'une autre source prend l'écran.

## Vision et lancement

- `moteur/vision.ts` : `porteeVue(jeton, lumiere)` (vive 40 cases ; pénombre 12 ou vision dans le noir ; obscurité : vision dans le noir, sinon torche 8), `casesVisibles` (rayons projetés, arrêtés par le premier mur, qui est vu), `vueDesPj` (mémorisé), `revelerParLaVue` (ce qui est révélé le reste).
- Vue joueurs (`rendu/visibilite.ts`, `dessin.ts`) : noir sur l'inexploré, ombre sur l'exploré hors de vue, bords adoucis ; les adversaires ne sont montrés qu'en vue directe des PJ ; le camp des joueurs toujours visible.
- `logique.preparerLancement` + `interface/lancement.ts` : PJ absents posés à l'entrée (`EtatTable.entree`, cases de départ des cartes générées), brouillard et vue des PJ activés sur une carte ; lumière déduite du lieu (souterrain : obscurité). Réglage « Lumière du lieu » dans l'onglet Affichage.

## Tour des joueurs (écran joueurs)

La diffusion envoie la vue `table` (scène `module`, source `combat`) : image de la table + caméra + grille, round, PJ actif, dernier évènement, effet 3D d'un sceau, `options` du tour.
- `tour.ts` (pur, testé) : `VueTable`, `OptionsTour` (cases atteignables, armes de la fiche `attaquesDuJeton` / `porteeArme`, cibles visibles, sorts connus, tracé), `DemandeTour`, `idTour`, `optionsTour`, `refus` (bon joueur : lien du PJ actif, ou tablette s'il n'a pas de lien ; une action par tour ; portée ; sort connu), `attaqueAvecArme`.
- `joueurs/Tour.tsx` : carte zoomable (`interface/Zoomable` : un appui vise, un glissé déplace la vue), actions du PJ actif (se déplacer, attaquer, sort, tracer un sceau avec `VueTrace` de la Magie, finir le tour), effet 3D pour tous (`VueEffet`).
- `interface/useTourJoueurs.ts` (MJ) : construit la vue, reçoit les demandes (`ecouterJoueurs` + jeton → personnage par `joueurs.persoDuJeton`), joue l'action (Ctrl+Z), lit le sceau (`magie.lireTracePartage`) → sort de la table (`lanceurs` = le PJ) à viser. `interface/SuiviTrace.tsx` : le tracé en direct chez le MJ. Réglages dans la colonne campagne (`modules.combat.tourJoueurs`, `dureeTrace`).

## Actions des joueurs demandées par le MJ (écran joueurs)

`actions.ts` (pur, testé) : `DemandeAction` (image + caméra + grille + action `sort` | `deplacement`), `ReponseAction`, `caseVisee`, `zoneVisee`, `casesDeZone`, `versImage`. `joueurs/Action.tsx` (vue `action` : toucher ou survoler la carte, aperçu, Valider / Annuler). `interface/ActionsJoueurs.tsx` (détail du jeton, MJ : viser un sort, se déplacer, tracer un sceau via `PanneauTrace` de la Magie), `interface/useActionsJoueurs.ts` (envoie l'image et la caméra `imageEtCamera`, aperçu en direct `ui.viseeJoueurs`, joue l'action à la validation puis rediffuse la table).

## Règles liées (fiche → table → jets)

- `moteur/conditions.ts` (pur, testé) : `peutAgir`, `vitesseEffective` / `resteMouvement`, `modeAttaque` (avantage / désavantage et raisons), `d20Mode`, `sauvegarde` (bonus de la fiche, échec automatique), `ddSorts` ; états d'un tour (`EXPIRE_DEBUT_TOUR`) et consommés par l'attaque (`CONSOMME_ATTAQUE`).
- `moteur/regles.ts` : initiative avec le bonus de la fiche ; attaque en deux d20 si avantage, critique automatique au contact d'une cible paralysée, attaque supplémentaire (`profil.attaquesParAction`), attaque sournoise, rage, passifs (`sang-chaud`, `chasseur-geants`), proie marquée ; sorts avec sauvegarde (moitié, pas d'état) ou attaque de sort.
- `moteur/actionsCombat.ts` (pur, testé) : catalogue `ACTIONS_COMBAT` (coût action / bonus / gratuit, cible, portée, utilisations par combat, effets) et `jouerAction`, `empechement`.
- `capacites.ts` (pur, testé) : `capacitesCombat(p, R)` (profil de combat, actions débloquées par la classe, les talents `action` et les dons, valeurs calculées pour le jeton), `synchroniserJeton` (appelé au début du tour d'un PJ).
- Tour du joueur : bouton « Actions » (cibles alliées / ennemies entourées), état Bonus et attaques restantes, sorts et sceaux seulement si le personnage sait faire de la magie. MJ : `interface/ActionsMj.tsx` dans le détail du jeton.
- Sorts : `gabarit()` donne `sauvegarde` / `attaque` ; zone = dés × 0,75, 8d6 au plus. `equilibre.test.ts` : bornes des sorts de base, actions et fiche.
