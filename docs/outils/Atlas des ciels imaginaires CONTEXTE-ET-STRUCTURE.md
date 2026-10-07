# Atlas des ciels imaginaires : contexte et structure du projet

Document de référence pour reprendre, faire évoluer ou intégrer l'outil dans un projet plus grand.
État du code : 2 octobre 2026. Auteur du projet : Joseph Saigne Le Boulc'h. Code écrit avec Claude (Cowork).

---

## 1. Contexte

### 1.1 Ce qu'est l'outil

L'Atlas des ciels imaginaires est un **générateur procédural pour le jeu de rôle**, centré sur le ciel nocturne. À partir d'une simple **graine** (un texte), il génère de façon reproductible :

- un **ciel imaginaire** : étoiles, constellations avec noms et légendes, voie lactée, nébuleuses, planètes visibles, galaxies, phénomènes (étoiles filantes, comète, éclipses, aurores, météo) ;
- un **système stellaire** : étoile, planètes, lunes, ceintures, comètes, étoile compagne ;
- un **monde** (la planète de l'observateur) : relief, climats, biomes, continents, océans, peuples aux frontières naturelles, cités, lieux légendaires et remarquables ;
- des **civilisations** : régime, dirigeant, histoire, coutumes, croyances, calendrier, relations entre peuples ;
- des **cartes** : carte du monde, carte détaillée de chaque pays (villages, routes, fleuves), plans de ville (11 types d'organisation) ;
- une **chronologie** de la planète (géologie, dérive des continents) et des peuples ;
- des **quêtes** : une quête principale, 3 ou 4 secondaires, 6 à 8 annexes, avec personnages, objets, cartes et une séparation stricte entre la vue MJ et la vue joueurs ;
- des **documents de jeu** : carnet de campagne PDF illustré, livrets de quêtes MJ et joueurs, et un export complet en dossier (JPG haute qualité, PDF, JSON).

Il contient aussi un mode **« vrai ciel de la Terre »** : 5 000 étoiles réelles, les 88 constellations, et les positions des planètes, de la Lune et du Soleil à une date et un lieu donnés.

### 1.2 Pour qui et pour quoi

- **Utilisateur** : un maître du jeu (MJ) qui prépare une campagne, et sa table de joueurs.
- **Usage** : générer un univers cohérent, l'explorer à l'écran, puis en tirer des documents prêts à jouer.
- **Principe clé** : tout est déterministe. La même graine et les mêmes réglages redonnent exactement le même univers, ce qui rend le fichier de sauvegarde (quelques Ko) suffisant pour tout reconstruire.

### 1.3 Historique

1. L'outil est né comme une **page unique** publiée en ligne sur claude.ai (artefact), avec des capacités propres à cette plateforme : sauvegardes dans le compte, téléchargements confirmés, légendes écrites par Claude.
2. Il a été rapatrié **en local** (`index.html` tout-en-un de 1,2 Mo), utilisable par double-clic sans installation.
3. Le 1er octobre 2026, le fichier a été **découpé en modules** thématiques, sans changer le comportement.
4. Ajouts ensuite : export complet en dossier, fichier SAVE rechargeable, partie système stellaire (carnet et export), générateur de quêtes MJ / joueurs, nouvelle arborescence de l'export.

---

## 2. Principes techniques

| Principe | Détail |
|---|---|
| **Aucune installation** | Pas de serveur, pas de build, pas de npm. On ouvre `index.html` par double-clic (protocole `file://`). |
| **Scripts classiques, pas de modules ES** | Les modules ES (`type="module"`) et `fetch()` ne fonctionnent pas en `file://` dans Chrome. Chaque fichier `js/*.js` est un `<script src>` classique. |
| **Espace global partagé** | Tous les modules déclarent leurs fonctions et variables au niveau global (environ 520 noms). Ils partagent donc le même état, ce qui les garde synchronisés. Il n'y a ni import ni export. |
| **Ordre de chargement = ordre des `<script>`** | Une fonction peut appeler une fonction d'un module chargé plus tard, à condition que l'appel ait lieu **après** le chargement complet. Le code exécuté immédiatement au chargement ne peut utiliser que ce qui est déjà chargé. `99-demarrage.js` est toujours en dernier. |
| **`"use strict"`** | Présent en tête de chaque module. |
| **Déterminisme** | Tout le hasard passe par `rngFor(clé)` = `mulberry32(hashStr(P.seed + '|' + clé))`. Aucun `Math.random()` dans la génération : il n'est utilisé que pour des effets visuels (scintillement, étoiles de fond d'une vignette). |
| **Cache** | `cached(clé, fn)` mémorise les objets coûteux (système, cartes de pays, plans, civilisations, quêtes) dans `objCache`. Le cache est vidé à chaque `regen()`. |
| **Hors ligne** | Polices et jsPDF sont dans `lib/`. jsPDF a une solution de secours sur cdnjs si le fichier local manque. Seules les légendes écrites par Claude demandent la version en ligne. |
| **Double environnement** | Le code teste `window.claude.use(...)`. En ligne, il utilise la base de données du compte, les téléchargements confirmés et la génération de texte. En local, il bascule sur `localStorage` et les téléchargements normaux du navigateur. |
| **Langue** | Interface, textes générés et noms de fichiers en français. |

---

## 3. Arborescence du dossier

```
générateur de ciel/
├─ index.html                 La seule page à ouvrir : interface (HTML) + liste ordonnée des <script>
├─ css/
│  └─ atlas.css               Tout le style (thème clair/sombre, panneaux, quêtes, fenêtre d'export)
├─ js/                        Le code, en modules thématiques (voir § 4)
│  ├─ 01-outils.js … 22-quetes.js, 99-demarrage.js
│  └─ donnees/
│     ├─ terre-etoiles.js     Catalogue des étoiles réelles (≈ 580 Ko)
│     └─ terre-pays.js        Contours des pays de la Terre (≈ 135 Ko)
├─ lib/
│  ├─ jspdf.umd.min.js        Génération des PDF
│  └─ polices/                Cormorant Garamond (500, 600, normal et italique), Figtree (400, 500, 600)
├─ sauvegardes/               Fichiers .json de ciels (exports « Mes ciels », fichiers SAVE)
├─ exports/                   Carnets, cartes, exports complets
├─ versions/                  Copies de sécurité datées avant chaque modification
│  ├─ index-2026-10-01.html   La version tout-en-un d'origine (référence)
│  └─ 2026-10-01 v2 … v4/     Anciennes versions des fichiers modifiés
└─ LISEZMOI.md                Mode d'emploi pour l'utilisateur
```

`css/`, `js/` et `lib/` doivent rester à côté de `index.html`.

---

## 4. Les modules

Les modules sont numérotés dans l'ordre de chargement. Les familles reprennent celles de la carte « Toile de l'Atlas ».

| Fichier | Famille | Rôle | Fonctions clés |
|---|---|---|---|
| `01-outils.js` | Socle | Constantes (`deg`, `TAU`), `$` (getElementById), hasard déterministe, géométrie 3D, formatage | `hashStr`, `mulberry32`, `rngFor`, `pick`, `shuffle`, `clamp`, `dirOf`, `lonOf`, `latOf`, `fr`, `cap` |
| `02-noms-et-legendes.js` | Socle | Styles de langue (céleste, nordique, ancien, elfique), fabrication de noms, tables de légendes | `STYLES`, `starName`, `constName`, `stem` |
| `03-parametres.js` | Socle | Types de planètes, réglages par défaut, **état global** (`P`, `D`, `view`, `sky`, `E`…) | `GEN_DEF`, `GEN_SPEC`, `DISP_DEF`, `PTYPES`, `periodText`, `lumText` |
| `04-ciel-generation.js` | Ciel | Génère le ciel à partir de `P`, textes des étoiles et constellations, heure de la nuit | `makeSky`, `constText`, `starText`, `applyTime` |
| `05-ciel-rendu.js` | Ciel | Dessin du ciel (projection stéréographique « au sol » ou carte équirectangulaire), boucle d'animation | `draw`, `resize`, `setCam`, `projP`, `projM`, `loop` |
| `06-ciel-interface.js` | Ciel | Clics et gestes, fiche d'une étoile ou constellation, édition des noms, panneaux, commandes de réglage, `regen()` | `select`, `showConst`, `openSheet`, `closeSheets`, `buildControls`, `syncUI`, `regen`, `fillFacts` |
| `07-systemes-stellaires.js` | Exploration | Génération et visualiseur de systèmes (planètes, lunes, ceintures, comètes, galaxies, étoiles voisines) | `makeSystem`, `systemOfSky`, `openViewer`, `drawSystem`, `drawBody`, `drawPlanet`, `factsOf`, `descOf`, `cached` |
| `08-planete.js` | Monde | La planète de l'observateur : relief, climats, peuples, globe et carte, réglages du monde | `makeWorld`, `buildWorld`, `regenWorld`, `openWorld`, `worldKey`, `W_SPEC` |
| `donnees/*.js` | Ciel | Données réelles de la Terre | `EARTH_DATA`, `EARTH_COUNTRIES` |
| `09-vrai-ciel-terre.js` | Ciel | Vrai ciel : catalogue, éphémérides, lieu d'observation, système solaire réel | `makeEarthSky`, `makeEarthWorld`, `realSolarSystem`, `currentJD` |
| `10-monde-astres-peuples.js` | Monde | Soleils et lunes du monde, calendrier, peuples, voyages vers les étoiles, atterrissage, carte 3D, système natal | `makeHomeFrame`, `computeCalendar`, `makePeoples`, `getCN`, `homeSystem`, `worldBody` |
| `11-legendes-claude.js` | Ciel | « Raconter la légende » (version en ligne seulement, bouton masqué en local) | `legendPrompt`, `updateTellBtn` |
| `12-carnet-campagne.js` | Campagne | Carnet de campagne PDF (jsPDF) et livrets de quêtes | `buildCarnet(opts)`, `renderWorldImage`, `pdfT`, `loadScript` |
| `13-civilisations.js` | Monde | Régimes, dirigeants, histoire, coutumes ; menu Monde | `civOf`, `describePeople`, `peopleStats`, `openWorldHub`, `el` |
| `14-vaisseau-et-lieux.js` | Exploration | Vaisseau d'exploration, lieux légendaires et remarquables | `makeWorldPOIs`, `openShip` |
| `15-cartes-de-pays.js` | Monde | Carte détaillée de chaque pays | `makeCountryMap`, `renderCountryImage`, `openCountryMap` |
| `16-phenomenes-recherche.js` | Ciel | Étoiles filantes, comète, éclipses, aurores, météo, recherche | `worldComet`, `cometState`, `eclipsesOfYear`, `searchAll` |
| `17-chronologie.js` | Monde | Histoire géologique et chronologie des civilisations | `geoData`, `civTimeline`, `openChrono` |
| `18-plans-de-ville.js` | Monde | Plans de ville et de village | `makeCityPlan`, `renderCityExport`, `openCityPlan` |
| `19-sauvegardes-exports.js` | Sorties | Mes ciels, import/export JSON, export image, bascule Terre, animation d'atterrissage | `Store`, `snapshot`, `openSaved`, `exportSaves`, `renderMapImage`, `switchMode`, `toast`, `localSave` |
| `20-export-complet.js` | Sorties | Export complet dans un dossier (ou archive .zip) | `exportAll`, `xpPlan`, `renderConstImage`, `xpJpg` |
| `21-systeme-stellaire-images.js` | Exploration | Rendu hors écran du système pour le carnet et l'export, fiche texte | `mainSystem`, `renderSystemView`, `renderBodyView`, `systemSheetText` |
| `22-quetes.js` | Campagne | Générateur de quêtes, panneau Quêtes, cartes de quête, cartes de PNJ et d'objets, section PDF | `makeQuests`, `renderQuests`, `renderQuestMap`, `renderNpcCard`, `renderItemCard`, `questsText`, `carnetQuestSection` |
| `99-demarrage.js` | Sorties | Démarrage | (voir § 6.1) |

La liste complète des fonctions de chaque module est en annexe A. Les dépendances entre modules sont en annexe B.

---

## 5. Modèle de données

### 5.1 État global (défini dans `03-parametres.js`)

| Variable | Contenu |
|---|---|
| `P` | **Paramètres de génération.** La graine et tous les réglages qui définissent l'univers. |
| `D` | **Paramètres d'affichage.** Lieu d'observation, tracés, noms, teinte, phénomènes affichés. |
| `view` | Caméra et temps : `mode` (`'pov'` au sol ou `'map'`), `yaw`, `pitch`, `fov`, `hour`, `gday` (jour de l'année), `year`, `date` (mode Terre). |
| `E` | Modifications de l'utilisateur : noms et légendes renommés (`E['c3'] = {name, desc}`), sauvegardés sous forme de liste `[{k, name, desc}]`. |
| `sky` | Le ciel généré (voir 5.3). |
| `world` | Le monde généré (voir 5.4). |
| `sel`, `selC` | Étoile et constellation sélectionnées (`-1` si aucune). |
| `currentName`, `currentEntry` | Nom et entrée de la sauvegarde ouverte. |
| `dirty` | Demande de redessin du ciel à la prochaine image. |

**`P`, valeurs par défaut (`GEN_DEF`) :**

```js
{ seed:'', count:2600, bright:40, colors:60, milky:60, tilt:35, nebulae:4, planets:4, galaxies:3,
  consts:16, cmin:4, cmax:8, style:'celeste', mode:'gen',            // ciel ; mode 'gen' ou 'earth'
  wocean:65, wconts:4, wrelief:50, wtemp:50, whumid:50, wvar:0,       // monde
  wtilt:23, wyear:365, wmoons:1, wsuns:1, wpeoples:7, wcsize:50,
  qvar:0 }                                                           // variante des quêtes (ajoutée à la volée)
```

**`D`, valeurs par défaut (`DISP_DEF`) :**

```js
{ lines:true, cnames:true, smag:2, grid:false, horizon:true, twinkle:true, tint:'nuit',
  lat:45, lon:0, placed:false, legend:'complet', cnamesLocal:'savant', gplace:null,
  meteors:true, aurora:true, weather:true }
```

### 5.2 Format de sauvegarde (contrat d'échange)

C'est le format le plus stable du projet et le meilleur point d'intégration. Il est utilisé par **Mes ciels → Exporter**, par le **fichier SAVE** de l'export complet et par l'import.

```json
{
  "format": "atlas-des-ciels",
  "version": 1,
  "exportedAt": "2026-10-01T08:38:16.827Z",
  "skies": [
    {
      "id": "cmupa7ugq",
      "name": "Mon univers",
      "createdAt": "2026-10-01T08:38:16.826Z",
      "params":  { "seed": "univers-test", "count": 3500, "…": "… tout P" },
      "display": { "…": "… tout D" },
      "edits":   [ { "k": "c0", "name": "Testastre", "desc": null } ],
      "view":    { "mode": "pov", "yaw": 0, "pitch": 0.49, "fov": 1.57, "hour": 22, "gday": 0, "year": 1, "date": "" }
    }
  ]
}
```

- L'import accepte aussi un tableau d'entrées, ou une entrée seule (`{params…}`).
- Quand le fichier contient un seul ciel, l'import l'ouvre directement.
- En local, les ciels sont gardés dans `localStorage` sous la clé `atlas-ciels:v1` (tableau d'entrées).
- Reconstruire un univers : `P = {...GEN_DEF, ...params}`, `D = {...DISP_DEF, ...display}`, `E = editsFromArr(edits)`, puis `regen()`. C'est ce que fait `openSaved(entry)`.

### 5.3 Le ciel (`sky`)

Produit par `makeSky(P)` ou `makeEarthSky()`. Principaux champs :

- `stars[]` : `{name, desig, mag, t (couleur), col [r,g,b], d [x,y,z] (direction), lon, lat, kind ('star'|'planet'|'sun'|'moon'|'galaxy'|'comet'…), c (constellation), meaning, part, lore}` ;
- `consts[]` : `{name, fig (figure), meaning, story, culture, members[], edges[[a,b]], alpha, d, lon, lat, neighbor, relation}` ;
- `dust[]` et `nebs[]` pour la voie lactée et les nébuleuses ;
- `order` (ordre de dessin), `name`, `st` (style de nom), `earth` (booléen) ;
- `day`, `surface`, `space`, `vantage` (ciel vu depuis une autre étoile), `traveling`.

### 5.4 Le monde (`world`)

Produit par `makeWorld()`, appelé dans `regen()` → `buildWorld()`. Principaux champs :

- grilles `h` (altitude), `T` (température), `M` (humidité), `B` (biome), `dist` (distance à la côte), en `WW × WH` cellules ;
- `places[]` : `{kind ('continent'|'ocean'|'sea'|'region'|'mountains'|'island'|'lake'|'capital'|'city'|'people'), name, lon, lat, size, people}` ;
- `peoples.list[]` : `{key, name ('les …'), base, style, col, capital, cities[], cn{}}`, et `peoples.map` (peuple de chaque cellule) ;
- `pois[]` (lieux légendaires `poi-major` et remarquables `poi`) : `{name, desc, hook (rumeur), danger, people, lon, lat}` ;
- `frame` : `{suns[], moons[], yearLen, tilt, homeSunName, dayH}` ;
- `name`, `desc`, `canvas` (image du relief), `peopleImg` (image des peuples), `key` (empreinte des réglages, `worldKey()`).

### 5.5 Objets dérivés (tous mis en cache)

| Fonction | Renvoie |
|---|---|
| `civOf(k)` | `{reg, ruler, eraI, pop, era0, traits[], rel[{o, kind}], hist[[an, texte]], cust[], belief, lang, founder, stats}` |
| `makeCountryMap(k)` | `{k, p, cv, MW, MH, toLL(x,y), toPx(lon,lat), kmPx, img, rivers, roads, cities, villages, foreign, minors, wpois, areas, title}` |
| `makeCityPlan(ct, k)` | Plan de ville : quartiers, parcelles, rues, lieux `L[]` avec `name`, `desc`, `hook` |
| `homeSystem()` / `systemOfSky(i)` | `{star, planets[], belts[], dwarfs[], comets[], companion, aMax, starR, hz}` |
| `computeCalendar()` | `{Y, y0, months[], fest[]}` |
| `civTimeline()`, `geoData()` | Événements datés des peuples et de la planète |
| `makeQuests()` | Voir 5.6 |

### 5.6 Les quêtes (`makeQuests()`, `22-quetes.js`)

Graine des quêtes : `P.seed | 'quetes' | P.wvar | P.qvar`. Le bouton « Autres quêtes » incrémente `P.qvar`, qui est gardé dans les sauvegardes.

```
{ main:      { title, peoples[kA,kB], theme ('fragments'|'prophetie'|'nuit'|'guerre'), deadline{text, at, short},
               summary (joueurs), truth (MJ), lore (MJ), patron, antagonist, relic,
               stages[5] { title, place, npcs[], players, mj, obstacle, branches[{choice, cons}], secret? },
               endings[3] { name, cond, text }, rewards[], rewardItems[] },
  secondary: [3 ou 4] { title, people, peoples[], summary, truth, lore, link, giver, foe, places[], stages[3], rewards[] },
  side:      [6 à 8]  { title, people, place, giver, summary, desc, danger, truth, branches[], rewards[] },
  npcs:      [] { name, g (0/1), role, people, look, mood, want, quote, secret },
  items:     [] { name, the (avec article), type, g, desc, power, lore, curse, value },
  world }
```

**Règle MJ / joueurs :**
- Les champs `truth`, `lore`, `mj`, `obstacle`, `branches`, `endings`, `link`, `want`, `secret` et `curse` sont réservés au MJ.
- L'antagoniste principal et les étapes marquées `secret` ne sont jamais montrés aux joueurs.
- En vue joueurs, ces contenus **ne sont pas générés dans le DOM ni dans les PDF**. Il ne suffit donc pas de les masquer en CSS : il faut les omettre, et toute nouvelle sortie doit respecter cette règle.

---

## 6. Fonctionnement

### 6.1 Démarrage (`99-demarrage.js`)

```js
buildControls(); resize(); syncUI(); regen(); updatePlay(); updateModeUI(); syncTime();
requestAnimationFrame(loop);
```

Au chargement de chaque module, le code relie aussi les boutons de la page (`$('id').onclick = …`). **Les modules supposent donc que les éléments de `index.html` existent.**

### 6.2 Cycle de génération

1. Un réglage change, ce qui appelle `regenSoon()` (attente de 120 ms) puis `regen()`.
2. `regen()` crée `sky` (avec `makeSky` ou `makeEarthSky`), vide `objCache`, puis appelle `buildWorld()`. Le monde n'est recréé que si `worldKey()` a changé.
3. `regen()` applique ensuite les modifications `E`, puis l'heure (`applyTime`), et met `dirty = true`.
4. `loop()` redessine le ciel à chaque image quand `dirty` est vrai, ou en continu pendant l'animation et le scintillement.
5. Les vues secondaires (système, monde, pays, ville, chronologie) ont leur propre canevas et leur propre drapeau (`wDirty`, `mDirty`, `cyDirty`…).

### 6.3 Rendus réutilisables (images hors écran)

Chaque fonction renvoie un `<canvas>`, sans toucher à l'affichage.

| Fonction | Image | Taille typique |
|---|---|---|
| `renderMapImage()` | Carte complète du ciel | 4 800 × 2 880 |
| `renderViewImage()` | Vue actuelle | taille de l'écran |
| `renderConstImage(ci)` | Une constellation de près, légende incluse | 3 000 × 2 000 |
| `renderWorldImage(ratio)` | Carte du monde avec noms | 1 800 × 900 × ratio |
| `renderCountryImage(M, scale, ratio)` | Carte d'un pays | ≈ 3 000 à 4 000 px |
| `renderCityExport(plan, size, ratio)` | Plan de ville | size × ratio |
| `renderSystemView(sys, opts)` | Système en vue inclinée (`tilt: 62°`) ou de dessus (`tilt: 0`) | 3 200 × 1 800 |
| `renderBodyView(planète, opts)` | Une planète et ses lunes | 3 200 × 2 000 |
| `renderQuestMap(q, mj)`, `renderSideQuestsMap(Q)` | Cartes de quête avec itinéraire numéroté | 2 880 × 1 440 |
| `renderNpcCard(n, mj)`, `renderItemCard(it, mj)` | Cartes à jouer | 1 500 × 2 100 |

Technique : les fonctions de dessin écrivent dans des variables globales (`ctx`, `W`, `H`, `view`, `vctx`, `V`). Les rendus hors écran **sauvegardent ces variables, les remplacent, dessinent, puis les restaurent** dans un `try/finally`. Toute nouvelle fonction de rendu hors écran doit suivre ce modèle.

### 6.4 Documents

- `buildCarnet(opts)` construit le PDF avec jsPDF :
  - `opts.blobOnly` renvoie `{blob, filename}` sans enregistrer ;
  - `opts.questsOnly` produit le livret des quêtes seul ;
  - `opts.player` produit la version joueurs ;
  - `opts.onStep(texte)` reçoit l'avancement.
- Ordre du carnet :
  1. couverture et sommaire ;
  2. ciel et astres ;
  3. système stellaire ;
  4. monde ;
  5. chaque peuple (fiche, carte du pays, guide, plan de la capitale) ;
  6. calendrier ;
  7. chronologie ;
  8. lieux légendaires ;
  9. quêtes ;
  10. constellations.
- Les textes du PDF passent par `pdfT()`, car jsPDF n'accepte que le Latin-1 avec les polices standard. Les caractères hors Latin-1 sont convertis ou supprimés (par exemple le tiret long « — »).
- Pour ajouter une section au carnet, il faut des outils internes à `buildCarnet`. Ils sont exposés à `carnetQuestSection(K, mj)` via un objet `K` (`newPage`, `sectionTitle`, `flow`, `text`, `heading`, `factsBox`, `ensure`, `y`, `colW`…). C'est le modèle à suivre pour toute nouvelle section.

### 6.5 Export complet (`20-export-complet.js`)

- `xpPlan()` construit une liste de tâches `{label, run(out, step, done)}`. `exportAll()` les exécute avec une barre de progression et un bouton Annuler.
- **Destination :**
  - Chrome et Edge utilisent l'API File System Access (`showDirectoryPicker`). Le dossier choisi est mémorisé dans IndexedDB (`atlas-ciels-export`). Si l'utilisateur choisit le dossier de l'Atlas, l'outil descend tout seul dans `exports/`.
  - Les autres navigateurs reçoivent une archive `.zip` non compressée, construite en JavaScript.
- Arborescence produite :

```
exports/<Monde> - <Ciel> - AAAA-MM-JJ HHhMM/
├─ Carnet de campagne - <Ciel>.pdf
├─ SAVE - <Ciel>.json                 Format § 5.2, rechargeable
├─ contenu.txt                        Liste des fichiers et mode d'emploi du SAVE
├─ cartes/
│  ├─ 01 - Carte du ciel.jpg
│  ├─ 02 - <Monde> - peuples.jpg
│  ├─ 03 - <Monde> - relief.jpg
│  └─ Pays NN - <Peuple>/
│     ├─ Carte - <Régime des …>.jpg
│     ├─ villes/NN - <Cité> (capitale).jpg
│     └─ villages/NN - <Village>.jpg  (si la case est cochée)
├─ systeme stellaire/
│  ├─ 01 - Système de <Étoile> (vue inclinée).jpg
│  ├─ 02 - Système de <Étoile> (vue de dessus).jpg
│  ├─ fiche du système.txt
│  └─ planetes/NN - <Planète>.jpg
├─ quetes/
│  ├─ MJ/        Livret des quêtes (MJ).pdf, quêtes (MJ).txt, cartes/, personnages/, objets/
│  └─ joueurs/   Même structure, sans aucun secret
└─ constellations/NN - <Nom>.jpg
```

Les JPG sont encodés à la qualité 0,92, sur un fond opaque.

---

## 7. Interface (`index.html`)

- **Barre du bas** : `btnNew` (nouveau ciel), `btnSettings` (réglages), `btnSaves` (Mes ciels), `btnWorld` (Monde), `btnShip` (Explorer), `btnSave`, `btnSearch`.
- **Panneaux latéraux** (classe `.sheet`, ouverts avec `openSheet(id)`) : `panelSettings`, `panelSearch`, `panelWorld`, `panelQuests`, `panelShip`, `panelCal`, `panelSaves`.
- **Vues plein écran** (classe `.viewer`) :
  - `viewer` : systèmes ;
  - `world` : globe ;
  - `micro` : pays ;
  - `cityv` : ville ;
  - `chrono` : chronologie.
- **Fenêtres** (`.imgview`) : `imgView`, `jsonView`, `xpView` (progression de l'export).
- **Fiche** : `card` (étoile ou constellation), avec le formulaire d'édition `editForm`.
- Le thème clair ou sombre suit le système. Les couleurs sont définies par des variables CSS (`--panel`, `--ink`, `--brass`…) dans `css/atlas.css`.

---

## 8. Intégrer l'Atlas dans un projet plus grand

### 8.1 Les contraintes à connaître

1. **Espace global** : environ 520 noms globaux (`P`, `D`, `sky`, `world`, `draw`, `select`, `toast`, `el`, `$`…). Ils peuvent entrer en collision avec un autre code chargé dans la même page.
2. **Dépendance au DOM** : les modules relient leurs boutons dès le chargement. Sans les éléments de `index.html`, le chargement échoue.
3. **Un seul univers à la fois** : l'état est unique et global.
4. **`file://`** : il faut rester sur des scripts classiques. Sous un serveur web (`http://`), tout fonctionne aussi.
5. **Chargement synchrone** : le catalogue d'étoiles (580 Ko) est chargé même si le mode Terre n'est pas utilisé.

### 8.2 Les quatre façons d'intégrer, de la plus simple à la plus profonde

**A. Par fichiers (aucun changement de code).** Le projet hôte lit et écrit les fichiers SAVE (§ 5.2) et consomme le dossier d'export (§ 6.5). C'est le couplage le plus faible, et le format est stable.

**B. Dans une iframe (recommandé pour une application hôte).** On charge `index.html` dans un `<iframe>`, ce qui l'isole complètement (variables globales, CSS, DOM). Pour piloter l'Atlas, il suffit d'ajouter un petit module `js/23-pont.js` qui écoute `postMessage`. Exemple de protocole à créer :

```js
// js/23-pont.js : à ajouter avant 99-demarrage.js
addEventListener('message', async ev => {
  const m = ev.data || {};
  if (m.type === 'atlas:open')   { openSaved(m.entry); }                         // charger un univers
  if (m.type === 'atlas:seed')   { P.seed = m.seed; syncUI(); regen(); }
  if (m.type === 'atlas:save')   { ev.source.postMessage({type:'atlas:saved', entry:{name:currentName||sky.name, ...snapshot()}}, '*'); }
  if (m.type === 'atlas:quests') { ev.source.postMessage({type:'atlas:quests', quests:questsText(makeQuests(), !m.player)}, '*'); }
});
```

Restreindre `'*'` à l'origine de l'application hôte quand elle est connue.

**C. Même page, avec un espace de noms.** On concatène les modules dans l'ordre à l'intérieur d'une seule fonction (`(() => { … })()`), comme l'était la version d'origine, et on expose une API publique, par exemple `window.Atlas = { openSaved, snapshot, regen, makeQuests, buildCarnet, … }`. Il faut aussi préfixer les identifiants HTML et les classes CSS pour éviter les collisions. Cela demande une petite étape d'assemblage, qui peut être un simple script de concaténation.

**D. Extraire le moteur.** Il s'agit de séparer la génération pure (fonctions `make*`, `civOf`, `makeQuests`…) de l'interface. Pour cela :
- déplacer les liaisons de boutons (`$('…').onclick`) dans des fonctions d'initialisation ;
- remplacer les variables globales par un objet d'état passé en paramètre.

C'est le chemin vers un moteur utilisable côté serveur ou dans un autre client. C'est aussi le plus gros chantier : la génération du monde utilise des canevas, il faudrait donc un canvas côté serveur (node-canvas) ou un `OffscreenCanvas` dans un Web Worker.

### 8.3 Points d'entrée utiles pour un hôte

| Besoin | Appel |
|---|---|
| Ouvrir un univers | `openSaved(entry)` |
| Lire l'état courant | `snapshot()` → `{params, display, edits, view}` |
| Changer la graine | `P.seed = '…'; syncUI(); regen();` |
| Passer au vrai ciel de la Terre | `switchMode('earth')` / `switchMode('gen')` |
| Données des peuples | `world.peoples.list`, `civOf(k)` |
| Quêtes | `makeQuests()`, `questsText(Q, mj)` |
| Système stellaire | `mainSystem()`, `systemSheetText(sys)` |
| Carnet ou livret PDF en mémoire | `await buildCarnet({blobOnly:true, questsOnly?, player?})` |
| Images | les fonctions `render*` du § 6.3, puis `canvas.toBlob(…)` |
| Lancer l'export complet | `exportAll(false)` (nécessite un clic de l'utilisateur pour le choix du dossier) |

---

## 9. Faire évoluer le code

### 9.1 Conventions

- **Un thème par module.** Un nouveau thème va dans un nouveau fichier `js/NN-nom.js`, ajouté dans `index.html` **avant** `99-demarrage.js`.
- Chaque module commence par un commentaire d'en-tête qui décrit son rôle, puis `"use strict";`.
- Pas de `Math.random()` dans la génération : il faut utiliser `rngFor('clé|…')` ou `mulberry32(hashStr(…))`, avec une clé propre au sujet. Un nouvel élément ne doit pas modifier les tirages existants.
- Mettre en cache les calculs coûteux avec `cached('clé|…', () => …)`.
- Les textes générés sont en français soigné : articles et accords (masculin/féminin selon `g`), élision (« l' », « qu' »), noms de lieux entre guillemets (« au lieu-dit « X » »). Les textes destinés au PDF passent par `pdfT()`.
- Pour les rendus hors écran, suivre le modèle « sauvegarder, remplacer, dessiner, restaurer » (§ 6.3).
- Toute nouvelle sortie liée aux quêtes doit respecter la règle MJ / joueurs (§ 5.6).

### 9.2 Sécurité des modifications

- Avant chaque modification, copier les fichiers touchés dans `versions/AAAA-MM-JJ vN/`.
- Après une modification, ouvrir `index.html` et vérifier la console : aucune erreur au chargement. Une erreur `ReferenceError` au chargement signale presque toujours un appel immédiat à une fonction d'un module chargé plus tard.

### 9.3 Limites connues

- **Export complet long** avec les plans de villages (une vingtaine par pays). La case peut être décochée.
- **Firefox** ne peut pas écrire dans un dossier : l'export arrive en `.zip`. Chrome et Edge peuvent redemander l'autorisation d'accès au dossier à chaque session.
- **Légendes écrites par Claude** : disponibles seulement dans la version en ligne.
- **Système natal** : le monde est placé sur l'orbite générée la plus proche de la zone habitable. La durée de l'année affichée dans le visualiseur de systèmes (calculée à partir de l'orbite) peut donc différer de `world.frame.yearLen` (utilisée par le calendrier).
- **Une seule langue** (français), sans fichier de traduction : les textes sont dans le code.
- **Un seul univers en mémoire** à la fois.

---

## 10. Glossaire

| Terme | Sens |
|---|---|
| Graine (`seed`) | Texte qui détermine tout l'univers |
| `wvar` | Variante du monde pour une même graine (bouton « Autre planète ») |
| `qvar` | Variante des quêtes pour un même monde (bouton « Autres quêtes ») |
| Vue au sol / carte | Projection stéréographique du ciel visible, ou carte équirectangulaire du ciel entier |
| Lieu légendaire / remarquable | Points d'intérêt du monde (`poi-major` / `poi`) avec rumeur et niveau de danger |
| Carnet de campagne | PDF illustré complet du monde |
| Livret des quêtes | PDF des quêtes seules, en version MJ ou joueurs |
| SAVE | Fichier JSON d'un univers, au format § 5.2 |
| Export complet | Dossier daté qui regroupe tous les documents et images |

---

## Annexe A : fonctions et données par module

Liste générée à partir du code (déclarations de premier niveau).

**`js/01-outils.js`** : 26 lignes, 18 fonctions
- Fonctions : `$`, `hashStr`, `mulberry32`, `gauss`, `pick`, `clamp`, `dot`, `cross`, `norm`, `cap`, `wrapPi`, `lonOf`, `latOf`, `dirOf`, `fr`, `rngFor`, `shuffle`, `uid`
- Données et état : `deg`, `TAU`, `UID`

**`js/02-noms-et-legendes.js`** : 155 lignes, 9 fonctions
- Fonctions : `stem`, `constName`, `starName`, `deArt`, `aArt`, `relText`, `assignParts`, `chooseStarLore`, `toEq`
- Données et état : `STYLES`, `GREEK`, `LATIN_END`, `ROMAN`, `FIGURES`, `PARTV`, `PART_OVERRIDE`, `CULTURES`, `LANGS`, `C_MEAN`, `C_STORY`, `S_MEAN_WARM`, `S_MEAN_COLD`, `S_MEAN_ANY`, `S_MEAN_BRIGHT`, `S_MEAN_FAINT`, `S_LORE`, `RELS`, `LEG_EQ0`

**`js/03-parametres.js`** : 112 lignes, 8 fonctions
- Fonctions : `starColor`, `rgb`, `colorLabel`, `starPhysics`, `sig2`, `lumText`, `periodText`, `randomSeed`
- Données et état : `PTYPES`, `PT_TEXT`, `MOON_T`, `GTYPES`, `GSTAR_KINDS`, `GEN_DEF`, `DISP_DEF`, `GEN_SPEC`, `DISP_TOGGLES`, `TINTS`, `P`, `D`, `view`, `E`, `currentEntry`, `exporting`, `playing`, `editTarget`, `editPrefill`, `sky`, `currentName`, `sel`, `selC`, `dirty`, `cardMode`, `reduceMotion`

**`js/04-ciel-generation.js`** : 252 lignes, 20 fonctions
- Fonctions : `makeSky`, `hillAlt`, `physOf`, `partSentence`, `starText`, `constText`, `visibilityOf`, `cardDesc`, `keyOfStar`, `applyEdits`, `editsToArr`, `editsFromArr`, `smooth`, `dayness`, `sunDir`, `skyDay`, `applyTime`, `mixHex`, `syncTime`, `updatePlay`
- Données et état : `sky_maxSize`, `sky_minSize`, `physCache`, `SUN_TXT`, `MOON_TXT`, `PLAY_SVG`, `PAUSE_SVG`

**`js/05-ciel-rendu.js`** : 257 lignes, 13 fonctions
- Fonctions : `resize`, `setCam`, `projP`, `projRaw`, `mapS`, `projM`, `freeBox`, `draw`, `drawMoonPhase`, `drawGrid`, `drawGround`, `drawMapOverlay`, `loop`
- Données et état : `cv`, `ctx`, `off`, `octx`, `SERIF`, `W`, `H`, `DPR`, `cam`, `px`, `py`, `pk`, `pf`, `SX`, `SY`, `SV`, `SR`, `labelBoxes`, `constHits`, `lastDraw`, `lastT`

**`js/06-ciel-interface.js`** : 288 lignes, 25 fonctions
- Fonctions : `attachDrag`, `aimView`, `stepCam`, `pan`, `clampPitch`, `zoom`, `tap`, `doubleTap`, `fillFacts`, `select`, `showConst`, `closeCard`, `closeEdit`, `refreshCard`, `persistEdits`, `setMode`, `closeSheets`, `openSheet`, `buildControls`, `latLabel`, `lonLabel`, `smagLabel`, `syncUI`, `regenSoon`, `regen`
- Données et état : `camAnim`, `regenT`

**`js/07-systemes-stellaires.js`** : 441 lignes, 36 fonctions
- Fonctions : `cached`, `planetMass`, `makeMoons`, `makePlanet`, `planetText`, `homePlanet`, `systemOfSky`, `makeSystem`, `galaxyOf`, `systemOfGalaxyStar`, `topScene`, `resetVCam`, `openViewer`, `pushScene`, `vBack`, `closeViewer`, `updatePauseLabel`, `vTap`, `vSelect`, `kindLabel`, `dotColor`, `factsOf`, `descOf`, `vPanel`, `vDR`, `vP`, `vDraw`, `drawStarDisc`, `drawPlanet`, `drawRingHalf`, `drawMoon`, `selRing`, `vLabel`, `drawSystem`, `drawBody`, `drawGalaxy`
- Données et état : `objCache`, `V`, `vcv`, `vctx`, `bgStars`

**`js/08-planete.js`** : 444 lignes, 30 fonctions
- Fonctions : `makeNoise`, `cellLon`, `cellLat`, `cellOf`, `components`, `labelPoints`, `makeWorld`, `worldKey`, `buildWorld`, `placeDefault`, `placeName`, `updateLocation`, `openWorld`, `closeWorld`, `wZoom`, `wPan`, `wR`, `wS`, `gBasis`, `wToScreen`, `wTap`, `drawWorld`, `drawGlobe`, `drawWMap`, `drawWLabels`, `syncWParams`, `regenWorldSoon`, `regenWorld`, `wPanel`, `earthWPanel`
- Données et état : `WW`, `WH`, `WN`, `BIOMES`, `BKEYS`, `BI`, `world`, `W_OPEN`, `wDirty`, `wSel`, `wView`, `wcv`, `wctx`, `gCan`, `gctx`, `WSW`, `WSH`, `wHits`, `W_SPEC`, `wT`

**`js/09-vrai-ciel-terre.js`** : 386 lignes, 21 fonctions
- Fonctions : `helio`, `ceresHelio`, `eclToRaDec`, `currentJD`, `todayStr`, `specInfo`, `makeEarthSky`, `earthEphemeris`, `earthApplyTime`, `moonPhaseName`, `earthStarText`, `obsLat`, `obsLon`, `setObs`, `inRing`, `countryAt`, `oceanAt`, `earthPlaceName`, `makeEarthWorld`, `realBody`, `realSolarSystem`
- Données et état : `CON_ART`, `KH`, `LAC`, `HEV`, `CON_TXT`, `STAR_NOTES`, `SPECT_OVERRIDE`, `REAL_MOONS`, `REAL_PLANETS`, `EARTH_CITIES`, `EARTH_PLACES`, `PLANET_EL`, `PLANET_H`, `OBLIQ`, `EARTH_CACHE`, `EARTH_WORLD`

**`js/10-monde-astres-peuples.js`** : 375 lignes, 35 fonctions
- Fonctions : `hexToRgb`, `fmtLy`, `starLabel`, `makeHomeFrame`, `attachFrame`, `frameApplyTime`, `drawRingArc`, `currentFrame`, `computeCalendar`, `monthName`, `yearLabel`, `dateParts`, `seasonNow`, `fmtGenDate`, `renderCalendar`, `worldBody`, `homeSystem`, `makePeoples`, `getCN`, `localPeople`, `constDisplayName`, `peopleAt`, `otherNamesText`, `buildPeopleImage`, `starPos`, `homeName`, `computeVantage`, `setVantage`, `goToStar`, `updateChips`, `makeSurfaceFrame`, `landOn`, `exitSurface`, `neighborsScene`, `drawNeighbors`
- Données et état : `MOON_LORE`, `SEASONS_N`, `calCache`

**`js/11-legendes-claude.js`** : 55 lignes, 3 fonctions
- Fonctions : `updateTellBtn`, `cancelTell`, `legendPrompt`
- Données et état : `SAMPLE`, `tellAbort`, `lastTold`

**`js/12-carnet-campagne.js`** : 266 lignes, 4 fonctions
- Fonctions : `loadScript`, `pdfT`, `renderWorldImage`, `buildCarnet`
- Données et état : `GREEKN`

**`js/13-civilisations.js`** : 178 lignes, 12 fonctions
- Fonctions : `peopleRng`, `describePeople`, `peopleStats`, `landCount`, `civOf`, `openWorldHub`, `el`, `renderWorldHub`, `poiList`, `renderPeopleDetail`, `calPeopleObj`, `fillCalPeopleSelect`
- Données et état : `ERAS`, `REGIMES`, `LANG_ADJ`, `EXTRA_TRAITS`, `HOSPITALITY`, `FUNERAL`, `worldHub`, `calPeople`

**`js/14-vaisseau-et-lieux.js`** : 141 lignes, 12 fonctions
- Fonctions : `ship`, `travelTime`, `curPos`, `curPlaceName`, `openShip`, `renderShip`, `startTravel`, `faceTarget`, `stepTravel`, `poiNeed`, `poiFill`, `makeWorldPOIs`
- Données et état : `SPEEDS`, `SHIP_NAMES`, `travel`, `DANGERS`, `POI_MAJOR`, `POI_MED`

**`js/15-cartes-de-pays.js`** : 310 lignes, 9 fonctions
- Fonctions : `makeCountryMap`, `renderParchment`, `openCountryMap`, `closeMicro`, `mFit`, `drawMicroTo`, `drawMicro`, `mPanel`, `renderCountryImage`
- Données et état : `PARCH`, `INNS`, `MINOR`, `MICRO`, `M_OPEN`, `mDirty`, `mSel`, `mHits`, `mView`, `mcv`, `mctx`, `MSW`, `MSH`

**`js/16-phenomenes-recherche.js`** : 180 lignes, 18 fonctions
- Fonctions : `stemOf`, `worldShowers`, `dayOfYearNow`, `showerActivity`, `tangentAt`, `stepMeteors`, `drawMeteors`, `worldComet`, `cometState`, `drawComet`, `project2`, `eclipseCheck`, `eclipsesOfYear`, `drawAurora`, `weatherNow`, `drawClouds`, `normTxt`, `searchAll`
- Données et état : `EARTH_SHOWERS`, `meteors`, `meteorAcc`, `WX`, `WXkey`

**`js/17-chronologie.js`** : 196 lignes, 15 fonctions
- Fonctions : `geoData`, `geoPos`, `renderGeo`, `maLabel`, `maFromPos`, `posFromMa`, `civTimeline`, `openChrono`, `closeChrono`, `syncChSlider`, `stepChrono`, `drawChrono`, `drawGeo`, `drawCiv`, `chPanel`
- Données et état : `CH_OPEN`, `chDirty`, `chTab`, `chSel`, `chHits`, `chcv`, `chctx`, `CHW`, `CHH`, `chState`, `GEO_W`, `GEO_H`, `geoImg`, `EV_COL`

**`js/18-plans-de-ville.js`** : 369 lignes, 20 fonctions
- Fonctions : `clipPoly`, `polyArea`, `polyCen`, `insetPoly`, `norm2`, `distSeg`, `distPoly`, `voronoi`, `splitLots`, `cityContext`, `chooseArch`, `makeCityPlan`, `renderCityImage`, `openCityPlan`, `closeCity`, `cyFit`, `drawCityTo`, `drawCity`, `cyPanel`, `renderCityExport`
- Données et état : `CITY_HOOKS`, `ARCH`, `ROOFS`, `CITY`, `CY_OPEN`, `cyDirty`, `cySel`, `cyHits`, `cyView`, `ccv`, `cyctx`, `CYW`, `CYH`, `CITY_ICON`, `ROLE_LABEL`

**`js/19-sauvegardes-exports.js`** : 209 lignes, 14 fonctions
- Fonctions : `toast`, `refreshList`, `snapshot`, `openSaved`, `renderMapImage`, `renderViewImage`, `exportImage`, `updateModeUI`, `switchMode`, `exportSaves`, `atmoCol`, `startLandAnim`, `drawLandFx`, `localSave`
- Données et état : `LS_KEY`, `Store`, `landAnim`, `landCv`, `landCtx`, `ATMO`

**`js/20-export-complet.js`** : 227 lignes, 17 fonctions
- Fonctions : `xpSafe`, `xpPad`, `xpTick`, `xpJpg`, `xpWrap`, `renderConstImage`, `xpCanUseFolders`, `xpResolveExports`, `xpPickFolder`, `xpUniqueDir`, `xpFolderTarget`, `xpCrc32`, `xpZipTarget`, `xpPlan`, `xpUI`, `exportAll`, `xpShowDest`
- Données et état : `XP_JPG_QUALITY`, `XP`, `XP_IDB`, `XP_CRC`

**`js/21-systeme-stellaire-images.js`** : 70 lignes, 9 fonctions
- Fonctions : `mainSystem`, `renderSysScene`, `xpWrapSys`, `factsLine`, `renderSystemView`, `renderBodyView`, `systemObjects`, `systemSummaryRows`, `systemSheetText`

**`js/22-quetes.js`** : 419 lignes, 29 fonctions
- Fonctions : `qPick`, `qG`, `qPeopleShort`, `qOf`, `qPlaceOfCity`, `qPlaceOfPoi`, `qPlaceOfMicro`, `qAt`, `qNm`, `qThe`, `qFill`, `makeQuests`, `questWorldMap`, `questCountryMap`, `qMarker`, `qMapTitle`, `questMarks`, `renderQuestMap`, `renderSideQuestsMap`, `qCardBase`, `qCardText`, `renderNpcCard`, `renderItemCard`, `questsText`, `carnetQuestSection`, `openQuests`, `renderQuests`, `qShowPlace`, `exportQuestBooklet`
- Données et état : `QG`, `QG_ITEMS`, `QG_CURSE`, `QG_TWIST`, `QG_TITLES`, `QG_CLUES`, `QG_COMPL`, `QUI`

**`js/99-demarrage.js`** : 9 lignes, 0 fonctions

**`js/donnees/terre-etoiles.js`** : 6 lignes, 0 fonctions
- Données et état : `EARTH_DATA`

**`js/donnees/terre-pays.js`** : 6 lignes, 0 fonctions
- Données et état : `EARTH_COUNTRIES`

## Annexe B : dépendances entre modules

Pour chaque module, les modules dont il utilise des fonctions ou des données (calculé à partir du code).

| Module | Utilise | Utilisé par |
|---|---|---|
| `01-outils.js` | 03 | 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22 |
| `02-noms-et-legendes.js` | 01, 07 | 03, 04, 07, 08, 09, 10, 13, 14, 15, 16, 17, 18, 22 |
| `03-parametres.js` | 01, 02, 16 | 01, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 99 |
| `04-ciel-generation.js` | 01, 02, 03, 05, 07, 08, 09, 10, 16 | 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 19, 20, 99 |
| `05-ciel-rendu.js` | 01, 03, 04, 06, 07, 08, 09, 10, 14, 15, 16, 17, 18, 19 | 04, 06, 07, 08, 09, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 99 |
| `06-ciel-interface.js` | 01, 03, 04, 05, 07, 08, 09, 10, 11, 13, 15, 16, 17, 18, 19 | 05, 07, 08, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 99 |
| `07-systemes-stellaires.js` | 01, 02, 03, 04, 05, 06, 09, 10 | 02, 04, 05, 06, 08, 09, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22 |
| `08-planete.js` | 01, 02, 03, 04, 05, 06, 07, 09, 10, 14, 15, 18, 19 | 04, 05, 06, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22 |
| `09-vrai-ciel-terre.js` | 01, 02, 03, 04, 05, 07, 08, terre-etoiles, terre-pays | 04, 05, 06, 07, 08, 10, 11, 12, 13, 14, 15, 16, 19, 21 |
| `10-monde-astres-peuples.js` | 01, 02, 03, 04, 05, 06, 07, 08, 09, 13, 14, 16, 19 | 04, 05, 06, 07, 08, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22 |
| `11-legendes-claude.js` | 01, 03, 04, 06, 08, 09, 10, 19 | 06 |
| `12-carnet-campagne.js` | 01, 03, 04, 05, 07, 08, 09, 10, 13, 15, 17, 18, 19, 21, 22 | 20, 22 |
| `13-civilisations.js` | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 15, 17, 18, 19, 22 | 06, 10, 12, 14, 15, 16, 17, 18, 22 |
| `14-vaisseau-et-lieux.js` | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 13, 19 | 05, 08, 10 |
| `15-cartes-de-pays.js` | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 13, 18, 19 | 05, 06, 08, 12, 13, 16, 18, 20, 22 |
| `16-phenomenes-recherche.js` | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 13, 15, 19 | 03, 04, 05, 06, 10, 17, 20, 22 |
| `17-chronologie.js` | 01, 02, 03, 05, 06, 07, 08, 13, 16, 19 | 05, 06, 12, 13 |
| `18-plans-de-ville.js` | 01, 02, 03, 05, 06, 07, 08, 10, 13, 15, 19 | 05, 06, 08, 12, 13, 15, 20 |
| `19-sauvegardes-exports.js` | 01, 03, 04, 05, 06, 07, 09, 10 | 05, 06, 08, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 99 |
| `20-export-complet.js` | 01, 03, 04, 05, 06, 07, 08, 10, 12, 15, 16, 18, 19, 21, 22 | - |
| `21-systeme-stellaire-images.js` | 01, 03, 05, 06, 07, 09, 10 | 12, 20, 22 |
| `22-quetes.js` | 01, 02, 03, 05, 06, 07, 08, 10, 12, 13, 15, 16, 19, 21 | 12, 13, 20 |
| `99-demarrage.js` | 03, 04, 05, 06, 19 | - |
| `donnees/terre-etoiles.js` | - | 09 |
| `donnees/terre-pays.js` | - | 09 |

Total : 25 fichiers de code, 377 fonctions, 233 liens entre modules, 5377 lignes.
