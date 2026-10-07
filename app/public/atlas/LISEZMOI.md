# Atlas des ciels imaginaires — version locale

Générateur de ciels nocturnes, de mondes et de campagnes de jeu de rôle, qui fonctionne sans installation.

## Ouvrir l'outil

Double-clique sur `index.html` : il s'ouvre dans ton navigateur (Chrome, Edge ou Firefox). C'est le seul fichier à ouvrir : il charge tout seul les modules du dossier `js/`.
Aucune connexion internet n'est nécessaire, sauf pour la fonction « Raconter la légende » (voir plus bas).

## Organisation du dossier

```
générateur de ciel/
  index.html        la page à ouvrir (interface) : c'est le seul fichier à double-cliquer
  css/atlas.css     l'apparence de l'outil
  js/               le code, découpé en modules qui partagent le même état
  lib/              bibliothèque PDF (jsPDF) et polices (Cormorant Garamond, Figtree)
  sauvegardes/      range ici tes exports de ciels (.json)
  exports/          carnets PDF, cartes, plans et exports complets
  versions/         copies de sécurité datées de l'outil
  LISEZMOI.md       ce fichier
```

Les dossiers `css/`, `js/` et `lib/` doivent rester à côté de `index.html`.

### Les modules du dossier `js/`

Ils sont chargés dans l'ordre par `index.html` et fonctionnent ensemble comme un seul programme : ils partagent les mêmes données (le ciel, le monde, les réglages), donc tout reste synchronisé.

| Fichier | Rôle |
|---|---|
| `01-outils.js` | outils communs (hasard déterministe, géométrie) |
| `02-noms-et-legendes.js` | noms des étoiles, légendes des constellations |
| `03-parametres.js` | données physiques, réglages, état de l'outil |
| `04-ciel-generation.js` | génération du ciel, heure de la nuit |
| `05-ciel-rendu.js` | dessin du ciel, boucle d'animation |
| `06-ciel-interface.js` | clics sur le ciel, fiches, panneaux |
| `07-systemes-stellaires.js` | visualiseur de systèmes |
| `08-planete.js` | planète de l'observateur, vue du monde |
| `donnees/terre-etoiles.js`, `donnees/terre-pays.js` | données du vrai ciel et des pays de la Terre |
| `09-vrai-ciel-terre.js` | vrai ciel de la Terre |
| `10-monde-astres-peuples.js` | astres, calendrier, peuples, voyages, carte 3D |
| `11-legendes-claude.js` | « Raconter la légende » (version en ligne seulement) |
| `12-carnet-campagne.js` | carnet de campagne PDF |
| `13-civilisations.js` | civilisations, menu Monde |
| `14-vaisseau-et-lieux.js` | vaisseau, lieux remarquables |
| `15-cartes-de-pays.js` | cartes de pays |
| `16-phenomenes-recherche.js` | étoiles filantes, comète, éclipses, aurores, météo, recherche |
| `17-chronologie.js` | chronologie du monde |
| `18-plans-de-ville.js` | plans de ville |
| `19-sauvegardes-exports.js` | sauvegardes, exports image et JSON |
| `20-export-complet.js` | export complet dans un dossier |
| `21-systeme-stellaire-images.js` | images et fiche du système stellaire (carnet et export) |
| `22-quetes.js` | générateur de quêtes, panneau Quêtes, cartes de quête, cartes de PNJ et d'objets |
| `99-demarrage.js` | démarrage (toujours en dernier) |

## Sauvegardes : à lire

- Les ciels sauvegardés avec « Sauvegarder » sont gardés **dans le navigateur** (stockage local). Ils restent d'une session à l'autre, mais ils disparaissent si tu vides les données du navigateur ou changes de navigateur.
- Ta vraie sauvegarde, c'est le fichier JSON : **Mes ciels → Exporter mes ciels**, puis range le fichier dans `sauvegardes/`.
- Pour restaurer : **Mes ciels → Importer un fichier**. Les ciels importés s'ajoutent sans rien écraser.
- Pour récupérer tes ciels de la version en ligne (claude.ai) : exporte-les là-bas, puis importe le fichier ici.

## Ce qui change par rapport à la version en ligne

| Fonction | Version en ligne | Version locale |
|---|---|---|
| Tout l'outil (ciel, Terre, monde, peuples, cartes, plans, vaisseau, chronologie, carnet) | oui | oui |
| Sauvegardes | dans ton compte Claude | dans le navigateur + fichiers JSON |
| Exports (PDF, PNG, JSON) | fenêtre de confirmation | téléchargement normal du navigateur |
| Export complet (dossier avec carnet, cartes, plans, constellations) | non | oui |
| « Raconter la légende » (Claude écrit une légende) | oui | non, le bouton est masqué |

Pour des légendes écrites par Claude en local : demande-les dans Cowork (voir ci-dessous) et ajoute-les dans un fichier de sauvegarde.

## Quêtes

**Monde → Quêtes** ouvre le générateur. Les quêtes sont tirées de l'histoire des peuples, de leurs relations (alliés, rivaux, partenaires), de leurs cités, des lieux légendaires et du ciel (comète, éclipses, lunes) :

- **une quête principale** en 5 étapes, entre deux peuples, avec commanditaire, antagoniste, relique, échéance céleste, embranchements et trois dénouements ;
- **3 ou 4 quêtes secondaires**, une par peuple, liées au régime ou aux relations du peuple, chacune reliée à la quête principale ;
- **6 à 8 quêtes annexes** autour des lieux remarquables ;
- les **personnages** (apparence, caractère, réplique, motivation et secret) et les **objets** (description, pouvoir, histoire, revers caché).

Le bouton **Vue MJ / Vue joueurs** bascule l'affichage : en vue joueurs, la vérité, les secrets, les embranchements, les dénouements et l'antagoniste ne sont pas affichés du tout. **Autres quêtes** en génère de nouvelles (le choix est gardé dans les sauvegardes). Les boutons **Livret MJ** et **Livret joueurs** téléchargent le livret des quêtes en PDF.

Le carnet de campagne contient aussi les quêtes, en version MJ, sauf si tu coches **Carnet en version joueurs** dans Mes ciels.

## Export complet

**Mes ciels → Export complet** crée un sous-dossier daté dans `exports/`, par exemple `exports/Scaon - Ciel de Laea - 2026-10-01 14h05/`, qui contient :

- `Carnet de campagne - ….pdf` (avec une grande partie « Le système de … » : vues du système, fiche de l'étoile, chaque planète et ses lunes)
- `cartes/` : la carte complète du ciel, la carte du monde (peuples et relief), puis **un dossier par pays** avec la carte du pays et deux sous-dossiers `villes/` et `villages/` (plans de ville ; les villages se décochent si l'export est trop long)
- `quetes/MJ/` et `quetes/joueurs/` : le livret des quêtes en PDF, les cartes de chaque quête, les cartes à jouer des personnages et des objets, et le texte des quêtes. Le dossier `joueurs/` ne contient aucun secret : tu peux le donner à ta table
- `systeme stellaire/` : le système vu en perspective et vu de dessus, une image par planète avec ses lunes et ses informations (dans `planetes/`), et `fiche du système.txt` avec la description et toutes les données de l'étoile, des planètes, des lunes, des ceintures et des comètes
- `constellations/` : une image par constellation
- `SAVE - ….json` : le fichier de sauvegarde de l'univers (graine, paramètres du ciel et du monde, noms et légendes modifiés, lieu d'observation). **Mes ciels → Importer un fichier** puis ce fichier : l'univers se rouvre directement, à l'identique
- `contenu.txt` : la liste de tout ce qui a été exporté

Toutes les images sont en JPG haute qualité (3 000 à 4 800 pixels de large).

- **Chrome ou Edge** : au premier export, choisis le dossier `exports` (ou le dossier de l'Atlas lui-même : l'outil descend tout seul dans `exports`). Le navigateur s'en souvient ; il peut te redemander l'autorisation à la session suivante. **Changer de dossier** permet d'en choisir un autre.
- **Firefox** : le navigateur ne peut pas écrire dans un dossier, tu reçois une archive `.zip` à décompresser dans `exports/`.

L'export prend une à quelques minutes selon la taille du monde. Tu peux l'annuler en cours de route.

## Travailler avec Claude Cowork

Ouvre ce dossier dans Cowork, puis demande par exemple :

- « Ajoute une option à l'outil `index.html` pour … »
- « Corrige ce bug : quand je … il se passe … »
- « Lis `sauvegardes/mes-ciels.json` et écris une légende pour chaque constellation du ciel X, puis ajoute-les au fichier pour que je les importe »
- « Range les PDF de `exports/` par monde »

Conseils :
- Avant chaque modification, Claude range une copie datée de l'outil dans `versions/`.
- Le code est découpé par thème dans `js/` : pour une modification, seul le module concerné change.

## Ce que contient l'outil

- **Ciels imaginaires** : génération par graine, constellations avec légendes cohérentes, noms par peuple, phénomènes (étoiles filantes, comète, éclipses, aurores, météo), calendrier, recherche.
- **Vrai ciel de la Terre** : 5 000 étoiles, 88 constellations, planètes, Lune et Soleil calculés à la date choisie, pluies d'étoiles filantes réelles.
- **Monde** : planète générée (continents, climats, peuples aux frontières naturelles), lieux légendaires et remarquables, cartes de pays, plans de ville (11 types d'organisation), chronologie des peuples et de la planète avec dérive des continents.
- **Exploration** : systèmes stellaires, atterrissage sur les planètes, vaisseau, carte 3D des étoiles voisines.
- **Carnet de campagne** : PDF illustré et complet du monde.
