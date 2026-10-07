# Projet JDR Global : analyse des 4 outils et propositions de fusion

Version 1, 5 octobre 2026. Document de travail.

> **État au 5 octobre 2026 (soir)** : étapes 0, 1 et 2 réalisées. Les 4 outils sont intégrés dans `app/` avec les ponts principaux (voir `docs/journal-de-bord.md` et `app/CLAUDE.md`). Le reste de ce document est l'analyse de départ.

---

## 1. Ce que j'ai compris des 4 outils

| | Atlas des ciels | Avatar Creator 3D | Atelier de tracé | Table de combat |
|---|---|---|---|---|
| **Rôle** | Générer un univers (ciel, système, monde, peuples, villes, quêtes, PDF) | Créer l'apparence 3D d'un personnage | Lire un sceau dessiné, en déduire et montrer le sort | Jouer un combat tactique sur grille |
| **Pour qui** | MJ (+ vue joueurs des quêtes) | MJ et joueurs | Joueurs (table de tracé) + MJ (mot de passe) | MJ (+ mode joueur) |
| **Pile** | JS classique, 25 scripts globaux, `file://` | Vite 5, React 18 JS, R3F, zustand, leva | Vite 6, React 18 **TS strict**, three 0.169 | 1 fichier HTML, JS classique, canvas 2D |
| **Taille** | ≈ 5 400 lignes, 1,2 Mo | petit code, **assets 17 Mo** (base.glb 12,5 Mo) | ≈ 5 900 lignes + tests | ≈ 1 300 lignes |
| **Maturité** | Très avancé | Phase 4 finie, genre H/F bloqué, en pause depuis juin | v0.6, testé (83 + 9 + 10 tests) | v7, fonctionnel, peu structuré |
| **Format d'échange** | `atlas-des-ciels` v1 (SAVE) | preset `presetVersion` 1 | `Sceau`, `SortEnregistre`, `ProfilPJ` | JSON brut sans champ `format`/`version` |
| **Stockage** | localStorage + IndexedDB (dossier d'export) | localStorage | localStorage + sessionStorage | localStorage `jdr7` |
| **Séparation MJ / joueurs** | Oui, stricte (rien de secret dans le DOM) | Non | Oui (mot de passe) | Oui (masquage, brouillard) |

**Points communs utiles** : tout en français, tout dans le navigateur sans serveur, chaque outil a déjà un format JSON exportable, trois outils sur quatre séparent déjà MJ et joueurs, et Avatar et Atelier utilisent la **même version de three (0.169)** et React 18.

**Points de friction** : deux mondes techniques (scripts globaux vs React/Vite), une contrainte « double-clic en `file://` » pour l'Atlas qui est incompatible avec l'Avatar (les `.glb` exigent un serveur), et quatre stockages `localStorage` séparés qui ne se voient pas.

---

## 2. Les liens naturels entre les outils

C'est le cœur de la fusion : les outils parlent déjà des mêmes choses, chacun sous un angle.

```
                 ┌──────────────── ATLAS ────────────────┐
                 │ monde · peuples · villes · lieux · PNJ │
                 │ quêtes · calendrier                    │
                 └───┬──────────────┬─────────────────┬───┘
       PNJ de quête  │   plan de ville / lieu (fond)  │ peuple → palette d'apparence
                     ▼              ▼                 ▼
   ┌──── PERSONNAGE ────┐   ┌──── COMBAT ────┐   ┌──── AVATAR ────┐
   │ identité, stats,   │──▶│ token, stats,  │◀──│ vignette =     │
   │ apparence, magie   │   │ sorts, carte   │   │ image du token │
   └─────────┬──────────┘   └───────▲────────┘   └────────────────┘
             │ signes connus,       │ sort traduit (forme, rayon, dégâts)
             ▼ grimoire             │
          ┌──────────── ATELIER DE TRACÉ ────────────┐
          │ sceau → analyse → valeurs (portée m,      │
          │ zone, durée, puissance)                    │
          └────────────────────────────────────────────┘
```

| Lien | De → vers | Ce que ça donne en partie |
|---|---|---|
| **Personnage unique** | Avatar + Atelier + Combat | Un PJ = son apparence (preset), sa magie (signes connus, grimoire), ses stats de combat. Aujourd'hui c'est trois fiches séparées. |
| **Sort tracé → sort de combat** | Atelier → Combat | L'analyse donne déjà portée en mètres, zone, durée, puissance, cible. On la traduit en gabarit de combat (cercle, cône, ligne…, 1 case = 1,5 m). Le joueur trace, le sort apparaît sur la grille. |
| **PNJ généré → token** | Atlas → Combat | Les PNJ et antagonistes des quêtes deviennent des tokens prêts à jouer. |
| **Peuple → apparence** | Atlas → Avatar | Chaque peuple a une palette (peau, cheveux, yeux) : un PNJ reçoit un avatar cohérent avec son peuple, tiré de façon déterministe. |
| **Vignette → token** | Avatar → Combat | Les tokens deviennent des portraits au lieu de pastilles de couleur. |
| **Lieu → carte tactique** | Atlas → Combat | Un plan de ville ou un lieu légendaire sert de fond de carte, à la bonne échelle. |
| **Danger d'un lieu → rencontre** | Atlas → Combat | Le niveau de danger d'un POI propose une rencontre (gabarit de rencontre de la table de combat). |
| **Tradition magique d'un peuple** | Atlas → Atelier | Croyances d'un peuple → signes qu'il connaît, Cœurs scellés tabous ou tolérés. |

---

## 3. Pistes d'amélioration par outil

Classées par priorité : **[F]** utile pour la fusion, **[J]** utile en jeu, **[T]** dette technique.

### 3.1 Atlas des ciels

1. **[F] Module pont `23-pont.js`** (déjà prévu dans ta doc, § 8.2 B) : piloter l'Atlas depuis l'extérieur (`ouvrir`, `sauver`, `quêtes`, `PNJ`, `image d'un lieu`).
2. **[F] Export structuré des PNJ et des lieux** : aujourd'hui les PNJ sont du texte et des cartes images. Il faut un JSON (nom, peuple, rôle, genre, traits) que la fiche personnage et le combat peuvent lire.
3. **[J] Modifier tout le contenu généré**, pas seulement les noms d'étoiles : renommer un PNJ, corriger une quête, changer un dirigeant. Généraliser `E` à toutes les entités (`E['npc:3'] = {…}`).
4. **[J] Carte tactique d'un lieu** : exporter une portion de plan de ville ou un lieu à l'échelle de la grille de combat (1 case = 1,5 m).
5. **[J] Journal de campagne relié au calendrier** : dater les séances et les événements avec le calendrier du monde.
6. **[T] Charger le catalogue d'étoiles (580 Ko) seulement en mode Terre.**

### 3.2 Avatar Creator 3D

1. **[T] Débloquer le genre H/F** : c'est le chantier en cours, il bloque la suite.
2. **[F] Remplacer leva par une interface maison** branchée sur le store : supprime les désynchronisations et permet d'avoir le même style que le reste de la suite.
3. **[F] Petite API** `chargerPerso(preset)`, `presetCourant()`, `surChangement(cb)` (déjà recommandée dans ta doc § 10).
4. **[F] Avatar aléatoire déterministe** à partir d'une graine + une palette de peuple, pour habiller les PNJ de l'Atlas sans travail manuel.
5. **[J] Portrait de token** : rendu rond, cadré visage, en plus de la vignette 3/4.
6. **[J] Vêtements et armures** : c'est le manque le plus visible pour du JDR. Demande le mode `skinned` (attaché au squelette), donc du travail Blender.
7. **[T] Alléger les assets** : `base.glb` fait 12,5 Mo et la queue de cheval 4 Mo. Compression Draco ou meshopt : gain probable de 70 à 90 %.
8. Les poses (phase 6) passent après les vêtements pour un usage JDR.

### 3.3 Atelier de tracé

1. **[F] Traduction sort → gabarit de combat** : fonction pure `versCombat(analyse, valeurs)` → `{forme, rayon en cases, portée, origine, concentration, effet}`. Le moteur est déjà en TS pur, c'est le lien le plus facile à créer.
2. **[F] Abstraction du stockage** : les fonctions `charger…`/`sauver…` sont déjà isolées, il suffit de les faire pointer vers le stockage commun.
3. **[F] Mot de passe MJ remplacé par le rôle global** de la suite (MJ / joueur).
4. **[J] Coût du sort** : une ressource (fatigue, encre, points) liée à la puissance et au rang, pour que la magie ait un prix en combat.
5. **[J] Puissance → dégâts** : une table puissance 1–12 → formule de dés (à caler sur le système de règles, voir question 3).
6. **[T] Nœuds à 94 %** de reconnaissance : le calibrage compense, à garder en tête.

### 3.4 Table de combat

C'est l'outil le plus utile en séance et le moins structuré.

1. **[T] Restructurer le code** : 1 300 lignes très compactes dans un état global `S`, sans tests (sauf l'hexagonal). Le moteur de grille (hex, BFS, ligne de vue) mérite d'être extrait en TS pur testé, sur le modèle de l'Atelier.
2. **[T] Ajouter `format` et `version`** au fichier de sauvegarde, et séparer les données de campagne (Richard, Kahlan, Garde D'Haran…) du code.
3. **[J] Écran joueurs séparé** : une deuxième fenêtre (télé, second écran) qui affiche la carte en vue joueurs, synchronisée en direct avec l'écran MJ (`BroadcastChannel`, aucun serveur). Gros gain à la table.
4. **[F] Tokens en portraits** (vignettes Avatar) et **sorts tracés** (Atelier).
5. **[F] Fond de carte** depuis un lieu de l'Atlas, à l'échelle.
6. **[T] Mettre à jour le guide** (v6 alors que l'outil est en v7).

---

## 4. Solutions pour fusionner

### 4.1 Trois options

| | A. Portail + iframes | B. Application unique progressive (recommandée) | C. Réécriture complète |
|---|---|---|---|
| **Principe** | Une page d'accueil qui ouvre chaque outil dans une iframe ; échanges par `postMessage` et fichiers JSON | Une coquille Vite + React + TS. Atelier et Avatar y entrent comme modules React. Atlas et Combat démarrent en iframe, puis le Combat est porté en module. | Tout réécrire dans une seule pile |
| **Coût** | Faible | Moyen, étalé | Très élevé |
| **Risque** | Très faible | Faible (chaque étape tourne) | Fort : on casse ce qui marche |
| **Expérience** | Quatre outils côte à côte, look hétérogène | Une seule application, un seul personnage, un seul stockage | Idéale, mais dans longtemps |
| **Limite** | Données encore cloisonnées | Atlas reste en iframe (5 400 lignes globales, trop coûteux à porter pour peu de gain) | — |

### 4.2 Recommandation : option B, en 5 étapes

**Étape 0. Le contrat de données commun** (avant tout code d'interface).
Un format `jdr-global` v1 qui **enveloppe** les formats existants sans les changer :

```jsonc
{
  "format": "jdr-global", "version": 1,
  "campagne": { "id", "nom", "creeLe", "majLe" },
  "univers":   [ /* entrées atlas-des-ciels v1, telles quelles */ ],
  "personnages": [{
    "id", "nom", "joueur", "type": "pj|pnj|allie|ennemi",
    "peuple": { "univers": "id", "cle": "k3" },     // lien vers l'Atlas
    "apparence": { /* preset Avatar presetVersion 1 */ },
    "magie":     { /* ProfilPJ de l'Atelier : rang, signes, grimoire, calibrage */ },
    "combat":    { "pv", "ca", "vitesse", "carac": {…}, "degats", "vision" },
    "notes"
  }],
  "grimoire":   [ /* SortEnregistre de l'Atelier (grimoire MJ) */ ],
  "rencontres": [ /* gabarits de la table de combat */ ],
  "seances":    [ { "date", "dateMonde", "resume", "liens": [...] } ]
}
```

Règle d'or reprise de l'Avatar : **chargement tolérant** partout (un champ inconnu ou manquant est ignoré proprement), pour faire évoluer le format sans casser les campagnes.

**Étape 1. La coquille.** Vite + React 18 + TypeScript (comme l'Atelier, la base la plus propre). Navigation : *Monde · Personnages · Magie · Combat · Campagne*. Rôle MJ / joueur global. Stockage commun dans IndexedDB + export/import d'un fichier campagne.

**Étape 2. Intégrer sans réécrire.**
- Atelier : copié en module (`modules/atelier/`), CSS préfixé, stockage branché sur le commun.
- Avatar : copié en module, leva remplacé, assets compressés.
- Atlas : iframe + `23-pont.js`.
- Combat : iframe + petit pont, en attendant l'étape 4.

**Étape 3. Les ponts** (dans l'ordre de valeur en séance) : sort tracé → combat ; vignette → token ; PNJ de l'Atlas → personnage ; peuple → avatar aléatoire ; lieu → fond de carte.

**Étape 4. Porter la Table de combat** en module TS : moteur de grille testé, puis interface. On en profite pour l'écran joueurs séparé.

### 4.3 La question du lancement

Aujourd'hui l'Atlas et le Combat s'ouvrent par double-clic, l'Atelier existe en fichier unique, mais l'Avatar exige un serveur (fichiers `.glb`). Une application unifiée ne pourra pas tenir dans un seul fichier HTML avec 17 Mo d'assets 3D. Deux voies :
- **En ligne** sur GitHub Pages (tu le fais déjà pour d'autres projets) : ouvrable partout, y compris sur la tablette d'un joueur.
- **En local** avec un lanceur (`lancer.bat` qui démarre un petit serveur et ouvre le navigateur).

Les deux peuvent coexister. La réponse dépend de ta façon de jouer (question 2).

---

## 5. Organisation proposée du dossier `projet JDR Global`

```
projet JDR Global/
├─ 00 - Analyse et propositions.md     ce document
├─ docs/
│  ├─ outils/                          les documents de base des 4 outils (référence, ne pas modifier)
│  ├─ format-jdr-global.md             le contrat de données
│  └─ journal-de-bord.md               décisions et avancement
└─ app/                                l'application (voir app/CLAUDE.md et app/LISEZMOI.md)
   ├─ src/noyau/ · src/interface/ · src/modules/<module>/
   ├─ public/atlas/ · public/combat/ · public/avatar/   outils d'origine et modèles 3D
   ├─ dist/                            version construite (lancer.bat)
   └─ lancer.bat · serveur.ps1
```

Les copies du code des outils d'origine vivent dans les modules (`modules/magie/atelier/`, `modules/avatar/createur/`, `public/atlas/`, `public/combat/`) ; il n'y a donc pas de dossier `sources/` séparé.

Je ne modifierai jamais les dossiers d'origine (`générateur de ciel`, `avatar`, `atelier de tracage`) : je travaille sur des copies dans `sources/` et `app/`.

### 5.1 Découpage en modules pour économiser les tokens

Objectif : pour modifier une fonction, je lis **un fichier de carte + la fiche du module concerné + les 1 ou 2 fichiers à changer**, jamais le dossier entier.

**Trois niveaux de lecture :**

| Niveau | Fichier | Taille cible | Quand je le lis |
|---|---|---|---|
| 1. Carte du projet | `CLAUDE.md` à la racine de `app/` | ≤ 150 lignes | À chaque session : règles, liste des modules en une ligne chacun, où trouver quoi |
| 2. Fiche de module | `MODULE.md` dans chaque module | ≤ 80 lignes | Seulement pour le module touché : rôle, API publique, fichiers et leur rôle, dépendances |
| 3. Code | les fichiers eux-mêmes | ≤ 300 lignes par fichier | Seulement ceux à modifier |

**Arborescence de `app/src` :**

```
src/
├─ noyau/                  socle partagé, aucune interface
│  ├─ contrat/             types du format jdr-global (campagne, personnage, carte, sort…) + migrations de version
│  ├─ stockage/            IndexedDB, import/export campagne
│  ├─ bus/                 événements entre modules + synchro écran joueurs (BroadcastChannel)
│  ├─ hasard/              graines déterministes (rngFor, mulberry32)
│  └─ regles/              interface « système de règles »
│     └─ dnd5e/            implémentation D&D 5e (remplaçable)
├─ interface/              coquille : navigation, rôle MJ/joueur, thème, composants communs
└─ modules/
   ├─ monde/               pont vers l'Atlas (iframe) + import de ses données
   ├─ cartes/              import, échelle, emboîtement, repères, calques
   │  ├─ import/  ├─ echelle/  ├─ navigation/  └─ types.json   (liste ouverte des types de carte)
   ├─ personnages/         fiche unique (identité, stats, apparence, magie)
   ├─ avatar/              créateur 3D
   ├─ magie/               Atelier de tracé
   │  ├─ moteur/  ├─ trace/  ├─ vue3d/  └─ grimoire/
   ├─ combat/              table de combat
   │  ├─ grille/  ├─ jetons/  ├─ sorts/  ├─ terrain/  └─ vision/
   └─ campagne/            quêtes, séances, journal
```

**Règles de construction :**

1. **Un module ne lit jamais l'intérieur d'un autre.** Il passe par l'`index.ts` public de l'autre module, ou par le bus d'événements. Je peux donc modifier l'intérieur d'un module sans relire les autres.
2. **Les modules ne partagent que le contrat** (`noyau/contrat`). C'est le seul fichier commun à connaître.
3. **Moteur séparé de l'interface** dans chaque module (comme l'Atelier aujourd'hui) : la logique est testable sans navigateur.
4. **Tests par module** : je lance seulement les tests du module touché pour vérifier.
5. **Fiche à jour** : toute modification de l'API publique d'un module met à jour son `MODULE.md` dans la même étape.
6. **Journal de bord** (`docs/journal-de-bord.md`) : une ligne par étape terminée, pour reprendre une session sans tout relire.

---

## 6. Décisions (5 octobre 2026)

| Sujet | Décision | Conséquence |
|---|---|---|
| Lancement | **En ligne (GitHub Pages) et en local (lanceur)** | Build statique unique, base relative ; `lancer.bat` + petit serveur local. |
| À la table | **Écran MJ + écran partagé** (télé / second écran) | Fenêtre « vue joueurs » synchronisée par `BroadcastChannel`, aucun serveur. Toute sortie respecte la règle MJ / joueurs de l'Atlas. |
| Règles | **D&D 5e pour l'instant, modifiable plus tard** | Les règles deviennent un module interchangeable (`regles/dnd5e.ts`) : caractéristiques, CA, jets, traduction puissance → dégâts. Le reste du code ne connaît pas la 5e en dur (même principe data-driven que l'Avatar). |
| Priorité | **Contrat de données + coquille**, puis pont sort tracé → combat | Étapes 0, 1, puis premier pont de l'étape 3. |
| Avatar genre H/F | **Pas prioritaire** | L'Avatar est intégré tel quel ; le genre reviendra plus tard. |
| Générateur d'Aethermonde | **Non repris** (trop ancien) | Un nouveau générateur de cartes (donjons, intérieurs, cartes de bataille), moderne, sera conçu plus tard comme module de la suite. |
| Cartes personnelles | **Importer ses propres cartes** : monde, pays, ville, et d'autres types plus tard | Une entité `carte` dans le contrat de données (voir § 6.1), indépendante de l'Atlas. |

### 6.1 Les cartes dans le contrat de données

Une carte est un objet de la campagne, qu'elle vienne de l'Atlas, d'un import ou d'un futur générateur. Les types sont une **liste ouverte** déclarée en données (comme les espèces de l'Avatar) : on en ajoute un sans toucher au code.

```jsonc
"cartes": [{
  "id": "c-7f3a", "nom": "Royaume d'Orden",
  "type": "monde | pays | ville | lieu | donjon | bataille | …",   // liste extensible
  "source": { "kind": "import | atlas | generateur", "ref": "…" },  // ref = clé Atlas si générée
  "image": "fichier stocké dans la campagne (PNG, JPG, WebP)",
  "echelle": { "metresParPixel": 12.5 },                          // calée par 2 clics + une distance connue
  "parent": { "carte": "c-0001", "zone": [x, y, l, h] },          // où elle se situe sur la carte au-dessus
  "reperes": [ { "id", "nom", "x", "y", "lien": "carte|personnage|quete|rencontre", "mj": true } ],
  "calques": { "mj": [ … ], "joueurs": [ … ] },                    // notes MJ jamais envoyées à l'écran joueurs
  "grille": { "type": "carree|hex", "taille": 40, "decalage": [0, 0] }   // pour l'utiliser en combat
}]
```

Ce que ça permet :
- **Naviguer de carte en carte** : monde → pays → ville → lieu, en cliquant sur la zone d'une carte enfant.
- **Mélanger les sources** : un monde importé peut contenir une ville générée par l'Atlas, et l'inverse.
- **Envoyer n'importe quelle carte à la Table de combat** avec la bonne échelle (1 case = 1,5 m) et la grille calée.
- **Montrer une carte à l'écran joueurs** sans les repères et calques MJ.

| Univers | **Plutôt A** : l'Atlas invente d'autres mondes ; la campagne faite main s'intègre à part entière | Un univers peut être **généré** ou **fait main**. Un monde fait main s'affiche dans les mêmes vues que l'Atlas (sa carte du monde enroulée sur le globe, etc.). |
| Format des cartes | **Images (PNG, JPG, WebP)**, PDF possible. Cartes faites sur Inkarnate desktop (format de projet fermé : on importe les exports). | Chaque carte peut avoir **deux images : version MJ et version joueurs**. |

## 7. Questions encore ouvertes

Aucune pour l'instant. Le contrat de données est rédigé dans `docs/format-jdr-global.md`.
