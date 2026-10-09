# CLAUDE.md : carte du projet JDR Global

> Lu à chaque session. Ne lire ensuite QUE la fiche `MODULE.md` du module touché et les fichiers à modifier.
> Garder ce fichier sous 150 lignes.

## 1. Le projet

Suite d'outils de jeu de rôle pour un MJ et sa table (Joseph, campagne Boîtes d'Orden et autres) :
monde, cartes, personnages, avatar 3D, magie (Atelier de tracé), combat, campagne.
Fusion progressive de 4 outils existants (voir `../00 - Analyse et propositions.md`, § 4.2 et § 6).

- Interface, code (noms de fonctions et variables) et commentaires : **français**.
- Usage : écran MJ + **écran joueurs** (seconde fenêtre sur la télé, synchro BroadcastChannel, sans serveur).
- Lancement : **GitHub Pages** et **local** (`lancer.bat`). Build statique, `base: './'`.
- Règles : **D&D 5e** via un module remplaçable (`noyau/regles`). Rien de la 5e en dur ailleurs.

## 2. Pile (verrouillée)

Vite 6 · React 18 · TypeScript strict · Vitest · fflate (zip) · three 0.169 · pdf.js (chargé à la demande).
Avatar : @react-three/fiber 8 + drei 9 + zustand (JS/JSX d'origine, `allowJs`). Pas de serveur.
Atlas : fichiers d'origine dans `public/atlas/`, ouverts dans un cadre (iframe) avec un script pont. Table de combat : réécrite en TS (canevas 2D).

## 3. Commandes

```bash
npm install
npm run dev                      # http://localhost:5173
npm test                         # tous les tests Vitest (noyau + modules + vérifications d'origine de l'Atelier, ~30 s)
npm run test:magie               # seulement la magie (dont les 144 tracés simulés de l'Atelier)
npx vitest run src/modules/xxx   # tests d'un seul module
npm run verif                    # vérification des types
npm run build                    # dist/ (types vérifiés avant)
```

## 4. Carte des dossiers

| Dossier | Rôle | Fiche |
|---|---|---|
| `src/noyau/contrat` | Types du format `jdr-global`, chargement tolérant, références, `vueJoueurs()` | `src/noyau/MODULE.md` |
| `src/noyau/stockage` | IndexedDB (campagnes, fichiers, réglages, instantanés), archive .zip, dossier de sauvegarde, téléchargement | idem |
| `src/noyau/bus` | Événements entre modules + scènes, jets de dés et bandeau vers l'écran joueurs | idem |
| `src/noyau/hasard` | Hasard déterministe (identique à l'Atlas) | idem |
| `src/noyau/regles` | Interface « système de règles », dés, `dnd5e/` (stats selon le rôle, fiche calculée, classes et peuples SRD, création, progression, talents) | idem |
| `src/noyau/talents` | Moteur des arbres de talents (pur) : points, prérequis, effets, magie des sceaux | idem |
| `src/noyau/graphe` | Graphes et arbres : forces, centralité, communautés, disposition (pur) ; vues dans `src/interface/graphe` | idem |
| `src/interface` | Coquille : menu, rôle MJ / aperçu joueurs, thème, écran joueurs, composants communs ; `des/` plateau de dés + dés 3D | `src/interface/MODULE.md` |
| `src/modules/campagne` | Liste, création, import / export d'archives, tableau de bord | `MODULE.md` du dossier |
| `src/modules/journal` | Quêtes (Atlas ou faites main), séances, préparation de séance | idem |
| `src/modules/chronologie` | Horloge du temps de jeu (calendriers, lunes, fêtes) et frise chronologique | idem |
| `src/modules/documents` | Lettres, affiches, indices, images à montrer aux joueurs | idem |
| `src/modules/pays` | Fiches des peuples / pays : gouvernement, histoire, relations, calendrier, réputation ; liens campagne | idem |
| `src/modules/genealogie` | Familles et dynasties : générateur, arbre interactif, membres promus en personnages | idem |
| `src/modules/personnages` | Fiche complète en 8 onglets (calcul 5e), création aléatoire / assistant, progression et XP, arbres de talents (+ éditeur MJ), impression | idem |
| `src/modules/cartes` | Cartes importées (images, PDF), versions MJ / joueurs, échelle, repères, emboîtement, brouillard ; `generateur/` cartes de bataille | idem |
| `src/modules/monde` | Atlas en cadre + pont, univers générés ou faits main, globe 3D ; `installation/` d'un monde complet | idem |
| `src/modules/avatar` | Créateur 3D (code d'origine dans `createur/`), apparence + portrait des personnages | idem |
| `src/modules/magie` | Atelier de tracé (code d'origine dans `atelier/`), branché sur la campagne par `lien.ts` | idem |
| `src/modules/combat` | Table de combat : `moteur/` (pur) · `rendu/` (canevas) · `interface/` (React) ; jetons, fond, sorts, rencontres, diffusion, packs d'univers | idem |
| `src/modules/generateurs` | PNJ, taverne, boutique, butin à la volée | idem |
| `src/modules/reseau` | Graphe de la campagne (centralité, communautés, réputation, relations entre personnages) | idem |
| `src/modules/organigrammes` | Institutions par régime, successions, quêtes, cartes, personnages | idem |
| `public/atlas/` | Atlas d'origine (scripts classiques) + `23-pont.js` | `src/modules/monde/MODULE.md` |
| `../blender/` | Chaîne Blender scriptée de l'avatar (MPFB) : corps, morphs, coiffures, tenues → `public/avatar/` | `../blender/LISEZMOI.md` |

Référence du format de données : `../docs/format-jdr-global.md`. Journal : `../docs/journal-de-bord.md`.

## 5. Règles d'architecture (non négociables)

1. **Un module n'importe jamais l'intérieur d'un autre module.** Seulement son `index.ts`, ou le bus.
2. **Le noyau ne dépend d'aucun module ni de React.** Les modules dépendent du noyau et de `interface/`.
3. **Le contrat est la seule structure partagée.** Nouveau champ = d'abord dans `docs/format-jdr-global.md` et `noyau/contrat/types/` (un fichier par domaine : base, monde, cartes, personnages, jeu, campagne).
4. **Secrets** : tout ce qui est secret va sous une clé `mj`. `mj: { cache: true }` cache l'objet entier.
   Aucune donnée vers l'écran joueurs sans passer par `montrerAuxJoueurs()` (qui filtre).
5. **Logique séparée de l'affichage** : chaque module a un `logique.ts` (ou un sous-dossier `moteur/`) pur et testé.
6. **Chargement tolérant** : un champ inconnu est conservé, un manquant prend sa valeur par défaut, jamais de plantage.
7. **Pas de `Math.random()` dans la génération** : `rngFor(graine, cle)` (`noyau/hasard`). Les jets de dés en jeu peuvent l'utiliser.
8. **CSS** : variables globales dans `interface/styles.css` ; chaque module préfixe ses classes (`.perso-`, `.camp-`…).
9. **Taille** : fichier ≤ 300 lignes, sinon découper en sous-module (exception : le code d'origine copié dans `atelier/`, `createur/`, `public/`).
10. **Data-driven** : listes de types (cartes, repères, sortes…) dans des données, pas en `if` dans le code.

## 6. Ajouter un module

1. Créer `src/modules/<nom>/` : `definition.tsx` (`DefinitionModule`), `index.ts` (API publique), `MODULE.md`, `logique.ts` + test.
2. L'ajouter dans `src/interface/registre.ts`.
3. Mettre à jour le tableau § 4 ci-dessus et une ligne dans `../docs/journal-de-bord.md`.

## 7. Routine de fin d'étape

- `npm run verif && npm test` sans erreur ; `npm run build` passe.
- `MODULE.md` du module à jour si son API publique a changé.
- Une ligne dans le journal de bord.
- Historique : **git** (dépôt `yellow-hawk/JDR-global`, racine = `projet JDR Global/`). Un commit par étape, message en français.
  Le dossier `../versions/` est l'ancien système de copies (avant git) : ne plus l'alimenter.
- Chaque envoi sur `main` lance la CI (`.github/workflows/ci.yml` : verif, test, build) puis publie `dist/` sur GitHub Pages.

## 8. Où en est-on

Étapes 1 et 2 terminées : les 4 outils sont intégrés, plus le module Cartes ; ponts en place
(sort tracé → gabarit de combat, personnages → jetons avec portrait, cartes → fond de combat calé, PNJ de l'Atlas → personnages,
carte du monde de l'Atlas → Cartes, avatar → portrait). Ajouts du 6 octobre : module Journal (quêtes de l'Atlas + séances), PV et états du combat → fiches,
repère de carte → rencontre (« Lancer le combat »), Atlas masqué en aperçu joueurs, **Table de combat réécrite**
(moteur / rendu / interface, plus de cadre). leva remplacé par un panneau natif dans Avatar.
**Installation complète d'un monde** (Monde → « Ajouter le ciel affiché ») : toutes les cartes de l'Atlas, PNJ avec avatar et portrait, cartes de bataille générées (`cartes/generateur/`) + rencontres prêtes. Ajouts suivants : combat diffusé automatiquement, stats des PNJ selon leur rôle, sorts réels de campagne (auto dans le combat, PNJ lanceurs), packs d'univers (rien de l'Épée de vérité dans le code), modules **Pays**, **Généalogie**, **Organigrammes**, **Réseau**.
Puis : plateau de dés partagé et **dés 3D** sur l'écran joueurs, modules **Chronologie** (horloge du temps de jeu), **Documents**, **Générateurs**, brouillard des cartes, réputation des peuples, relations entre personnages, préparation de séance, **sauvegardes automatiques** (instantanés + dossier).
Avatar refait le 08/10 : chaîne Blender scriptée (`../blender/`), genre H/F et 41 réglages, coiffures et 11 tenues attachées au squelette, PNJ habillés selon leur rôle.
Personnages refaits le 09/10 : fiche complète, création aléatoire et assistée (avatar + portrait), progression, arbres de talents (168 talents, magie des sceaux), impression.
Suite possible : poses de l'avatar, monde fait main dans les vues de l'Atlas.
