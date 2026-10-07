# Avatar Creator 3D — Documentation de référence

> Document de contexte et d'architecture, destiné à intégrer ce module dans un
> projet plus grand (ex. une suite d'outils de JDR). Écrit pour que toute personne
> — ou toute session Claude Code — puisse reprendre le projet sans contexte préalable.
>
> Dernière mise à jour de l'état : à la fin de la Phase 4 + vignettes. Le genre H/F
> est en cours d'intégration (voir §9).

---

## 1. Vision

Outil web de **création de personnage 3D entièrement paramétrable**, inspiré de
Baldur's Gate 3, pour un usage de création de personnages et PNJ de jeu de rôle.

- L'utilisateur sculpte un avatar via des sliders (visage + corps, à parité), des
  couleurs, et des assets interchangeables (coiffures, sourcils, cils).
- Genres masculin et féminin visés (en cours d'intégration).
- Une seule espèce active : **humain**. L'architecture est conçue pour ajouter des
  espèces (elfe, nain…) **sans toucher au code** — uniquement assets + config.

## 2. Principe directeur : DATA-DRIVEN

C'est la règle structurante de tout le projet. **Le code ne connaît aucune espèce,
aucun matériau, aucun morph, aucun asset en dur.** Tout est déclaré dans
`src/data/species.json`. Le moteur lit cette config et génère dynamiquement l'UI et
le comportement.

Conséquence : enrichir l'outil (nouveau morph, nouvelle coiffure, nouvelle couleur
colorable) = déposer un asset + ajouter une entrée JSON. Aucune logique métier
modifiée. Si du code contient `if (species === "human")` ou un nom de matériau/morph
en dur, c'est un bug d'architecture.

Ce principe est aussi ce qui rend le module **intégrable** : l'état d'un personnage
est entièrement sérialisable (voir §7), donc un projet hôte peut stocker, charger et
afficher un personnage sans connaître les détails internes.

## 3. Stack technique

- **Build** : Vite
- **UI** : React 18.3 (verrouillé — voir note ci-dessous)
- **3D** : `three` + `@react-three/fiber` (R3F) **v8.17** + `@react-three/drei` v9.114
- **GUI de contrôle** : `leva` (prototypage ; à remplacer par une UI custom à terme)
- **État global** : `zustand`
- **Langage** : JavaScript + JSX (pas de TypeScript)
- **Assets 3D** : glTF binaire (`.glb`) exclusivement

> Note React 18 / R3F v8 : volontairement figé. R3F v9 / drei v10 exigent React 19.
> Le pin actuel couvre tous les besoins (GLB, morphs, matériaux). Un futur passage à
> React 19 serait un upgrade coordonné des trois paquets.

## 4. Structure du projet

```
avatar-creator/
├── CLAUDE.md                        ← instructions persistantes (vision, stack, règles)
├── public/
│   └── assets/species/human/
│       ├── base.glb                 ← mesh riggé + morph targets (produit via Blender)
│       ├── hair/hair_ponytail.glb
│       ├── eyebrows/eyebrow_default.glb
│       └── eyelashes/eyelashes_default.glb
├── scripts/
│   └── inspect-glb.mjs              ← outil de diagnostic (meshes, matériaux, morphs, bbox)
├── src/
│   ├── data/
│   │   └── species.json             ← LE contrat data-driven (matériaux, morphs, assets)
│   ├── store/
│   │   ├── useCharacter.js          ← état zustand du personnage (source de vérité)
│   │   └── presets.js               ← sérialisation / désérialisation des presets
│   ├── three/
│   │   ├── AvatarViewer.jsx         ← <Canvas> R3F, caméra, lumières, OrbitControls
│   │   ├── AvatarModel.jsx          ← charge le base.glb de l'espèce courante
│   │   ├── useMaterials.js          ← applique les couleurs (teinte multiplicative)
│   │   ├── useMorphs.js             ← applique les morphs (morphTargetInfluences)
│   │   ├── useAssets.js             ← attache/détache les assets au bone de tête
│   │   └── snapshot.js              ← rendu off-screen pour vignettes (caméra fixe)
│   ├── ui/
│   │   └── ControlPanel.jsx         ← panneaux leva générés depuis species.json
│   ├── App.jsx
│   └── main.jsx
└── ...
```

## 5. Le contrat de configuration : species.json

Fichier central. Sections principales :

- **`materials`** : mappe des rôles logiques (`skin`, `eyes`, `teeth`, `tongue`) vers
  les noms réels des matériaux du GLB, avec couleur par défaut et flag `forceOpaque`.
  La couleur agit en teinte multiplicative (blanc = texture d'origine intacte).
- **`morphTargets`** : liste des rôles-sliders. Chaque entrée = { id, label FR,
  category ("visage"|"corps"), targets (un ou plusieurs noms de morph targets du GLB),
  min, max, default }. Un rôle peut pointer plusieurs cibles (paires gauche/droite
  regroupées sous un slider symétrique ; bloc `pair:{left,right}` pour l'asymétrie).
- **`assetSlots`** : slots d'assets (`hair`, `eyebrows`, `eyelashes`). Chaque slot =
  { id, label, attachBone ("head"), attachMode ("head-bone" ; "skinned" réservé au
  futur), options[] }. Chaque option = { id, label, file }. Une option "Aucun"
  (id null) permet de retirer l'asset.

Règle d'or : tout morph target présent dans le GLB mais **non listé** dans
`morphTargets` (notamment les macros MakeHuman `$md-...`) est **ignoré** par le code
et reste à son influence par défaut. Le GLB est le réservoir ; le JSON est le filtre.

## 6. Modèle d'état (store zustand)

Le store `useCharacter.js` est la **source de vérité unique**. La 3D ne fait que le
refléter. Il contient :

- `species`, `gender`
- `colors` : { rôle → couleur hex }
- `morphs` : { values: { rôle → nombre }, asymmetry: bool, lr: { rôle → {left,right} } }
- `assets` : { slot → id d'option sélectionnée }

Les hooks (`useMaterials`, `useMorphs`, `useAssets`) lisent le store et appliquent les
changements au mesh en temps réel. Aucun état visuel ne vit ailleurs que dans le store
(sauf leva, qui garde une copie interne — voir §9, limites connues).

## 7. Format de preset (sauvegarde / intégration)

Un personnage est **entièrement** décrit par un preset JSON versionné. C'est le point
d'intégration clé : un projet hôte peut stocker ces objets et les réinjecter.

```json
{
  "presetVersion": 1,
  "name": "Aelindra",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "thumbnail": "data:image/jpeg;base64,...",   // vignette 3/4 face, peut être null
  "data": {
    "species": "human",
    "gender": "male",
    "colors": { "skin": "#c8966e", "eyes": "#4a7ba6", ... },
    "morphs": { "values": {...}, "asymmetry": false, "lr": {...} },
    "assets": { "hair": "ponytail", "eyebrows": "default", "eyelashes": "default" }
  }
}
```

Deux mécanismes de persistance :
- **localStorage** : bibliothèque locale (dictionnaire id → preset). Ne marche pas
  dans les artifacts Claude.ai mais fonctionne dans l'app déployée.
- **Export / import `.json`** : fichier portable (notes de campagne, partage, backup).

**Chargement tolérant** : si un preset référence un morph/couleur/asset qui n'existe
plus dans `species.json` (renommé, supprimé), il est ignoré proprement (valeur par
défaut) avec un warning, sans planter. C'est ce qui permet d'enrichir l'outil sans
casser les persos déjà sauvegardés — essentiel pour un usage sur la durée.

## 8. Pipeline d'assets (hors code — Blender / MPFB2)

Les assets 3D ne sont pas produits par le code mais dans Blender.

- **Outils** : Blender 4.2 LTS recommandé (ou 5.x avec MPFB 2.0.15+), extension
  **MPFB2** (générateur d'humains paramétriques), + asset pack "MakeHuman system
  assets" (peaux, yeux, dents).
- **Topologie canonique GELÉE** (~13380 vertices) : décidée une fois, jamais changée.
  Tous les morphs (shape keys) dépendent de cet ordre de vertices.
- **Fichier maître** : un `.blend` canonique avec helpers + shape keys vivants. C'est
  l'atelier. L'"Export Copy" de MPFB (helpers supprimés, shape keys NON bakées) en
  produit une version propre, jetable, qui devient le `base.glb`.

Réglages d'export glTF validés :
- Morphs voulus → **Shape Keys COCHÉ**, **Apply Modifiers DÉCOCHÉ** (les deux sont
  incompatibles à l'export : Apply Modifiers jette les shape keys).
- Helpers retirés via **Export Copy** (pas à la main — ça casse les morphs).
- +Y Up coché. Armature incluse.

Gotchas rencontrés (documentés pour ne pas les refaire) :
- MPFB **purge** les shape keys de détail dont la valeur retombe sous ~0.0001 → les
  laisser à **0.001** au lieu de 0 pour qu'elles survivent à l'export.
- Les morphs MakeHuman macro (`$md-...`) ne sont jamais exposés (ils définissent le
  neutre). Seuls les morphs "détail" (à 0 = neutre) deviennent des sliders.
- Les morphs de genre / poitrine se fabriquent via **variantes + "Nouvelles depuis
  objets" (Join as Shapes)** : dupliquer le neutre, pousser UN slider, injecter la
  différence comme shape key. Fonctionne par numéro de vertex → les variantes DOIVENT
  venir du même neutre canonique.
- Transparence : les yeux MPFB sortent en alphaMode=BLEND → forcés opaques côté code
  (`forceOpaque`). Les cheveux/cils ont une transparence légitime → à traiter via
  `alphaTest` (data-driven par slot) plutôt que forceOpaque.

Outil de diagnostic : `node scripts/inspect-glb.mjs <chemin.glb>` liste meshes,
matériaux, morph targets (noms) et bounding box. **Toujours lancer avant de coder**
après un ré-export, pour vérifier le pont Blender → GLB.

## 9. État d'avancement (phasage)

- **Phase 0** ✅ — Affichage GLB, caméra orbitale, lumières, placeholder de secours.
- **Phase 1** ✅ — Couleurs paramétrables (peau/yeux/dents/langue), teinte multiplicative.
- **Phase 2** ✅ — 12 morphs de forme (visage + corps), mode symétrique + asymétrie L/R.
- **Phase 3** ✅ — Assets interchangeables (coiffure/sourcils/cils) attachés au bone
  de tête (approche "posée"), chargement/déchargement à la volée, dispose propre.
- **Phase 4** ✅ — Sauvegarde/chargement (localStorage + fichier .json), bibliothèque,
  chargement tolérant, vignettes (rendu off-screen caméra fixe, cadrage réglable via
  `THUMB_FRAMING` dans `snapshot.js`).

**En cours :**
- **Genre H/F** 🔶 — Fabrication des shape keys `gender-female` / `gender-male` via
  Join as Shapes dans Blender. Variantes créées et déformées, injection en cours de
  débogage (shape keys créées mais déformation non appliquée — vérifier ordre de
  sélection source→destination et le Range Min/Max des clés). À câbler ensuite en
  **curseur unique masculin↔féminin** côté code (regroupement de 2 morphs, comme les
  paires L/R).

**À venir (noté, non commencé) :**
- Poitrine (même méthode que le genre).
- Limitation de l'amplitude des morphs de crâne (les assets posés ne suivent pas les
  morphs → flottement aux valeurs extrêmes ; limite acceptée de l'approche posée).
- **Phase 6 — Poses** : manipulation du squelette (IK), bibliothèque de poses,
  création manuelle, sauvegarde. Gros chantier à part entière (touche le rig, mécanique
  jamais exploitée jusqu'ici).
- **Phase 5 — Multi-espèces** : l'architecture est prête ; le coût est le contenu
  (nouveau base mesh canonique + morphs + assets par espèce).
- Polish : transparence cheveux/cils (alphaTest), couleurs fines (lèvres, iris,
  yeux G/D séparés — nécessite de re-découper les matériaux dans Blender sur la
  topologie gelée), presets de peau réalistes, remplacement de leva par une UI custom.

**Limite connue à garder en tête :** leva conserve une copie interne de ses valeurs ;
après un chargement de preset, il faut le resynchroniser sur le store (déjà corrigé
via `set` leva / remontage par `key`). Une UI custom branchée directement sur le store
supprimerait définitivement ce type de désynchro.

## 10. Intégration dans un projet plus grand

Le module est conçu pour être embarquable. Points d'ancrage :

- **Affichage** : monter `<AvatarViewer />` (R3F `<Canvas>` autonome). Il lit le store
  `useCharacter`. Pour afficher un personnage donné, charger son preset dans le store
  via `presets.js` (désérialisation tolérante).
- **Contrôle** : `<ControlPanel />` (leva) est optionnel. Un projet hôte peut piloter
  le personnage en écrivant directement dans le store, sans l'UI leva.
- **Contenu** : `species.json` + les `.glb` sous `public/assets/` constituent tout le
  contenu. Un hôte peut étendre les espèces/assets en suivant le même contrat.
- **Données** : les presets JSON sont le format d'échange. Un projet hôte (ex. une
  base de PNJ de JDR) stocke des presets et demande au module de les afficher. La
  vignette (champ `thumbnail`) permet d'afficher une galerie sans instancier la 3D.
- **Découplage** : aucune dépendance au backend ; tout est statique (déployable sur
  GitHub Pages). L'état est 100 % sérialisable.

Recommandation d'intégration : exposer le module derrière une petite API (ex.
`loadCharacter(preset)`, `getCurrentPreset()`, `onChange(cb)`) qui encapsule le store,
pour que le projet hôte n'ait pas à connaître zustand. C'est l'évolution naturelle
quand le module quitte le statut d'app autonome pour devenir une brique.

## 11. Environnement de dev

- OS : Windows 11, RTX 3060 6 Go (largement suffisant pour WebGL).
- Node : installé dans `D:\ckaude` (hors PATH système par défaut — à ajouter au PATH
  ou préfixer). `node -v` ≥ 18.
- Dépôt : GitHub (utilisateur `yellow-hawk`), déploiement GitHub Pages.
- Blender + MPFB2 installés hors du dépôt (chaîne d'assets).
```
