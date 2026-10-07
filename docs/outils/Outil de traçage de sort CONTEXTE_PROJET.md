# Atelier de tracé — contexte et structure du projet

> Document de référence pour comprendre, maintenir ou intégrer l'outil dans un projet plus grand.
> Version décrite : **v0.6.0** (octobre 2026). Langue du code et de l'interface : français.

---

## 1. En une phrase

Un outil web (React + TypeScript + Three.js) qui **lit un sceau magique tracé à la main ou composé à la souris**, en déduit **l'effet du sort** selon un alphabet de signes original, le **décrit en français** (titre, effet, valeurs de jeu), et le **montre en 3D** sur un banc d'essai avec des cibles qui réagissent. Il sert à la fois **aux joueurs pendant la partie** et **au MJ pour préparer** campagnes et rencontres.

## 2. Contexte

- **Inspiration** : le système de magie de *L'Atelier des Sorciers* (Witch Hat Atelier, Kamome Shirahama) : la magie naît d'un dessin, un cercle (sceau) composé de signes, actif quand l'anneau est fermé. L'alphabet, les noms et les règles de ce projet sont **originaux** (aucun signe du manga n'est reproduit).
- **Usage** : jeu de rôle sur table, univers personnel du MJ.
- **Deux publics** :
  - **Table de tracé** (joueurs) : zone de dessin, lancement du sort, carnet du personnage. Accès libre.
  - **Mode MJ** (mot de passe) : composeur, grimoire complet, Cœurs scellés, gestion des personnages, générateur aléatoire.
- **Livrables** :
  - `atelier-de-tracage-v0.6.html` : application autonome en **un seul fichier**, fonctionne hors ligne (sauf polices Google).
  - `app/` : code source.
  - Une version publiée en ligne (artifact Claude, privée).

## 3. Vocabulaire (métaphore de l'arbre)

| Terme | Sens |
|---|---|
| **Sceau** | Le dessin complet : un Cœur, des signes, une Cerne. |
| **Cœur** | Signe au centre. Donne l'**élément** ou la **nature** du sort (feu, eau, mémoire…). |
| **Rameaux** | Signes placés **autour** du Cœur. Donnent la **forme** de l'effet (jet, pluie, mur…). Leur position donne la **direction**. |
| **Nœuds** | Signes posés **sur la Cerne**. **Réglages** : cible, portée, durée, intensité, rythme, déclencheur. |
| **Cerne** | L'anneau extérieur. Fermée = le sort s'éveille. |
| **Entaille** | Ouverture volontaire dans la Cerne : sort **préparé**, s'active quand on la ferme. |
| **Gerce** | Trait diagonal qui barre un Cœur : **Cœur inversé**. |
| **Double cerne** (couronne) | Seconde cerne extérieure ; les signes tracés entre les deux anneaux s'ajoutent au sort. Rang Maître. |
| **Sceau fendu** | Cerne coupée en deux moitiés opposées ; le sort ne s'éveille que quand on **rejoint les moitiés**. Rang Compagnon minimum. |
| **Greffe** | Deux sceaux reliés par un trait. Les sorts se combinent (renfort, annulation ou combinaison). Rang Maître. |
| **Rang** | Difficulté : 1 Apprenti, 2 Compagnon, 3 Maître. |

### Règles d'inversion

- **Cœur** inversé : barré par la gerce.
- **Rameau** inversé : pointe tournée **vers le Cœur** (au lieu de l'extérieur).
- **Nœud** inversé : tracé **à l'intérieur** de la Cerne (au lieu de l'extérieur).

## 4. L'alphabet (32 signes)

Source : `src/data/signes.ts` (textes), `src/data/glyphs.ts` (dessins SVG dans une boîte 100×100, « haut » = extérieur du sceau).

### Cœurs (12) — rang selon la catégorie

| id | Endroit | Effet | Inversé | Effet inversé | Rang | Catégorie |
|---|---|---|---|---|---|---|
| `braise` | Braise | Feu, chaleur, combustion. | Givre | Froid, gel, glace. | 1 | élément |
| `source` | Source | Eau et liquides. | Aride | Assèche, évapore. | 1 | élément |
| `socle` | Socle | Terre, pierre, sable. | Poussière | Effrite, érode, réduit en poudre. | 1 | élément |
| `souffle` | Souffle | Air, vent. | Calme | Air immobile, vide, silence. | 1 | élément |
| `lueur` | Lueur | Lumière, clarté. | Pénombre | Ombre, obscurité. | 1 | élément |
| `memoire` | Mémoire | Ramène un objet à son état précédent : répare, conserve. | Usure | Accélère le vieillissement d'un objet. | 2 | nature |
| `regard` | Regard | Voir de loin, à travers, révéler le caché. | Voile | Rend invisible, camoufle. | 2 | nature |
| `lien` | Lien | Attache, colle, scelle deux objets. | Rupture | Sépare, détache, ouvre les verrous. | 2 | nature |
| `mouvement` | Mouvement | Anime un objet inerte, comme une marionnette. | Arrêt | Fige un objet ou un mécanisme. | 2 | nature |
| `seve` | Sève | Soigne, fait croître le vivant. | Flétrissure | Affaiblit, fait dépérir. | 3 | **scellé** |
| `chair` | Chair | Transforme un corps : forme, taille. | Figement | Pétrifie. | 3 | **scellé** |
| `esprit` | Esprit | Efface ou modifie un souvenir. | Réminiscence | Fait resurgir un souvenir effacé. | 3 | **scellé** |

Les Cœurs **scellés** = magie interdite (agit sur le vivant). Réservés au MJ dans le composeur ; marqués « Interdit ».

### Rameaux (11) — formes

| id | Endroit | Effet | Inversé | Effet inversé | Rang |
|---|---|---|---|---|---|
| `jet` | Jet | Colonne ou faisceau continu. | Puits | Aspire l'élément en colonne vers le sceau. | 1 |
| `pluie` | Pluie | L'élément tombe en averse sur une zone. | Remontée | L'élément s'élève du sol : geyser, vapeur, braises. | 1 |
| `gerbe` | Gerbe | Déborde, se répand dans toutes les directions. | Moisson | Rassemble l'élément épars vers le sceau. | 1 |
| `plume` | Plume | Fait léviter ce qui est posé sur le sceau. | Ancre | Alourdit, plaque au sol. | 1 |
| `appel` | Appel | Attire la matière de l'élément. | Rejet | Repousse. | 1 |
| `dard` | Dard | Projectiles rapides : traits, éclats, boules. | Parade | Intercepte les projectiles de l'élément. | 2 |
| `etau` | Étau | Concentre en un point, compacte, solidifie. | Diffusion | Étale en brume, affaiblit, ramollit. | 2 |
| `rempart` | Rempart | Forme un mur, une barrière, un dôme. | Brèche | Perce un passage dans une matière de l'élément. | 2 |
| `tourbillon` | Tourbillon | Fait tourner l'élément : vortex, toupie. | Apaisement | Stoppe le mouvement, calme. | 2 |
| `ampleur` | Ampleur | Agrandit l'effet ou l'objet. | Réduction | Rétrécit. | 3 |
| `figure` | Figure | L'élément prend la forme d'une créature qui agit. | Dissolution | Défait une forme ou un sort de cet élément. | 3 |
| `tisse` | Tisse | Rend souple : ruban, corde, filet. | Trempe | Rend rigide et cassant. | 3 |

### Nœuds (9) — réglages

| id | Endroit | Effet | Inversé | Effet inversé | Rang | Réglage |
|---|---|---|---|---|---|---|
| `fenetre` | Fenêtre | Agit sur le support du sceau. | Seuil | Agit sur ce qui touche ou approche le sceau. | 1 | cible |
| `halo` | Halo | Agit sur toute une zone autour du sceau. | Refuge | Zone d'effet qui épargne le centre. | 1 | cible |
| `sablier` | Sablier | Prolonge la durée (scène, heure, jour). | Fulgurance | Instantané mais plus puissant. | 1 | durée |
| `visee` | Visée | Allonge la portée dans sa direction. | Repli | Portée nulle, effet collé au sceau, plus intense. | 2 | portée |
| `douce` | Braise-douce | Atténue (feu → chaleur, vent → brise). | Attise | Amplifie, mais rend le sort instable. | 2 | intensité |
| `echo` | Écho | Se répète par pulsations. | Retenue | Accumule puis libère tout d'un coup. | 2 | rythme |
| `guet` | Guet | S'active au passage de quelqu'un. | Veille | Se coupe en présence de quelqu'un. | 3 | déclencheur |
| `mot` | Mot | S'active sur un mot convenu. | Mutisme | Se désactive sur ce mot. | 3 | déclencheur |

## 5. Règles du moteur (`src/engine/analyse.ts`)

`analyser(sceau) → Analyse`. Résumé des règles :

- **Actif** : Cœur présent + Cerne fermée (pas d'entaille, pas fendu). **Prêt** : tout est là sauf la fermeture.
- **Formes** : rameaux regroupés par (id, inversé), triés par nombre. Endroit + inverse du même rameau → alerte (annulation partielle).
- **Direction** (`direction()`), à partir des angles des Rameaux (0° = haut de la feuille, sens horaire) :
  - moyenne des vecteurs ≥ 0,3 → **côté** (vers le haut, la droite…) ;
  - sinon, si les rameaux sont alignés sur un axe → **axe** (dans les deux sens) ;
  - sinon → **radiale** (s'élève au-dessus du sceau) ; aucun rameau → **sur place**.
- **Puissance** (1 à 12) : `min(nb de la forme principale, 4) × taille` ; +1 Repli, +2 Fulgurance, +2 Attise, −2 Braise-douce, +1 Retenue, +2 si couronne avec rameaux.
- **Stabilité** (0 à 100 %) : pénalités pour asymétrie des Rameaux, plus de 2 formes différentes, Attise, Nœuds contradictoires (Sablier + Fulgurance…), tracé peu net, cerne irrégulière, signes illisibles. Libellés : Stable ≥ 85, Correct ≥ 60, Instable ≥ 35, Dangereux.
- **Durée** : selon le nombre de Sabliers (quelques instants → une journée) ; Fulgurance = instantané.
- **Portée** : selon le nombre de Visées (courte → à vue) ; Repli = contact.
- **Cible** : Fenêtre / Seuil / Halo / Refuge ; sinon l'effet part du sceau.
- **Déclencheur** : Guet, Veille, Mot, Mutisme ; sinon à la fermeture de la cerne.
- **Rythme** : Écho (pulsations), Retenue (charge puis libère).
- **Rang** = max des rangs des signes ; couronne ou greffe → 3 ; fendu → au moins 2.
- **Difficulté** (bonus/malus de jet pour le MJ) : `rang − 1 + max(0, nb signes − 4) + 1 si couronne + 1 si greffe (+ difficulté du sceau greffé)`.
- **Greffe** : même Cœur et mêmes formes → **renfort** (puissances additionnées) ; même Cœur inversé → **annulation** ; sinon **combinaison** (deux effets, −10 de stabilité).
- **Interdit** : Cœur scellé.

`valeurs()` et `decrire()` (`src/engine/effets.ts`) transforment l'analyse en chiffres (portée en m, zone, diamètre, hauteur, charge en kg, recul…) puis en texte : titre, composition, « en bref », ce qui se passe, sensation, effets sur créatures / objets / décor, valeurs de jeu, fin du sort, comment le contrer, risques. `titreSort()` (`src/engine/noms.ts`) génère le nom (« Geyser compact », « Colonne de flammes jumelée »…).

## 6. Architecture

```
atelier de tracage/                 (dossier sur le PC : D:\projet claude\atelier de tracage)
├── atelier-de-tracage-v0.6.html    application autonome (build single-file)
├── app/                            code source (ce dossier)
├── archive/                        anciennes versions (v0.1 → v0.5) et fichiers obsolètes
├── GRIMOIRE_signes.md              alphabet rédigé (référence de conception)
├── grimoire-signes.html            planche visuelle des signes
└── PROPOSITION_atelier_de_tracage.md   proposition initiale (veille + concept)
```

### Pile technique

- **React 18** + **TypeScript 5** (strict) + **Vite 6**
- **three 0.169** (+ OrbitControls) pour la 3D
- **vite-plugin-singlefile** pour produire un HTML unique
- **tsx** pour lancer les tests (pas de framework de test : scripts avec `check()`)
- Aucune dépendance serveur, aucune base de données : tout est dans le navigateur (`localStorage`).

### Commandes

```bash
npm install
npm run dev           # http://localhost:5173
npm run build         # dist/ (GitHub Pages, base './')
npm run build:single  # dist-single/index.html (un seul fichier)
npm test              # tests du moteur
npm run test:tout     # tous les tests (moteur, techniques, profils, robustesse)
```

### Arborescence `app/src` (≈ 5 900 lignes)

```
src/
├── main.tsx                 point d'entrée React
├── App.tsx                  coquille : en-tête, modes, verrou MJ, profils, choix du personnage
├── styles.css               styles (variables CSS, thème clair/sombre automatique)
│
├── data/                    DONNÉES PURES (aucune dépendance UI)
│   ├── signes.ts            catalogue des 32 signes (SIGNE, COEURS, RAMEAUX, NOEUDS, RANGS)
│   ├── glyphs.ts            dessins SVG des signes (primitives path/circle/dot), GERCE
│   ├── grimoire.ts          GRIMOIRE_DE_BASE : 66 sorts d'exemple, CATEGORIES
│   └── lecons.ts            LECONS : 25 leçons (modèle + signe appris)
│
├── engine/                  MOTEUR (TypeScript pur, testable sans navigateur)
│   ├── types.ts             Sceau, Placement, SortEnregistre
│   ├── geometry.ts          échantillonnage SVG, placement des signes, traitsDuSceau()
│   ├── recognizer.ts        reconnaissance de signes ($P point-cloud) + modèles perso
│   ├── freehand.ts          lecture d'un tracé libre → Sceau (cernes, groupes, techniques)
│   ├── analyse.ts           règles : actif, direction, puissance, stabilité, rang…
│   ├── effets.ts            valeurs chiffrées + description en français
│   ├── noms.ts              génération du titre du sort
│   ├── generateur.ts        générateur de sorts aléatoires (intention, rang max)
│   ├── defi.ts              notation d'un tracé par rapport à un modèle (/100)
│   ├── profils.ts           profils de PJ (signes connus, grimoire, calibrage, records)
│   ├── impression.ts        fiches imprimables façon grimoire (HTML A5)
│   ├── storage.ts           grimoire du MJ (localStorage)
│   └── verrou.ts            mot de passe MJ (SHA-256, sessionStorage)
│
├── three/                   RENDU 3D (dépend de three, pas de React)
│   ├── monde.ts             décor : ambiances (jour/crépuscule/nuit), lieux (pré, forêt, village, grotte, atelier)
│   ├── cibles.ts            cibles physiques (mannequin, caisse, tonneau, arbre, brasero…) et leurs réactions
│   ├── banc.ts              disposition des cibles selon le sort
│   ├── effet3d.ts           animation de l'effet selon élément × forme, action sur les cibles
│   └── particules.ts        système de particules (Nuage)
│
└── components/              INTERFACE REACT
    ├── Freehand.tsx         table de tracé : dessin, chrono, leçons/défis, inscription au grimoire du PJ
    ├── Carnet.tsx           carnet du personnage (grimoire, signes connus, leçons)
    ├── Calibrage.tsx        modale « Calibrer ma main »
    ├── Composer.tsx         composeur MJ (clic pour placer les signes, techniques, générateur)
    ├── Grimoire.tsx         grimoire MJ (filtres, import/export, donner à un PJ, imprimer)
    ├── Profils.tsx          gestion des personnages (MJ)
    ├── Vue3D.tsx            fenêtre 3D (lieu, ambiance, cibles, vue du lanceur, agrandir)
    ├── Fiche.tsx            fiche du sort (texte, valeurs, copier, imprimer)
    ├── SceauSVG.tsx         rendu SVG d'un sceau (y compris paire greffée)
    └── Glyph.tsx            rendu d'un signe isolé
```

### Dépendances entre couches

```
data  ←  engine  ←  three
  ↑        ↑         ↑
  └──── components ──┘   ←  App.tsx
```

- `data/` et `engine/` **n'importent jamais** React ni three : réutilisables tels quels dans un autre projet (Node, autre framework, worker).
- `three/` dépend de `engine/` (Analyse, Valeurs) mais pas de React.
- `components/` assemble le tout.

## 7. Modèle de données (format JSON)

### Sceau

```ts
interface Placement { id: string; angle: number; inv: boolean; score?: number }
// angle en degrés : 0 = haut de la feuille, sens horaire

interface Sceau {
  coeur: { id: string; inv: boolean; score?: number } | null;
  rameaux: Placement[];
  noeuds: Placement[];
  taille: 1 | 2 | 3;                 // petit, moyen, grand
  entaille: number | null;           // angle de l'ouverture, null = cerne fermée
  sansCerne?: boolean;               // tracé libre sans anneau
  trace?: { nettete: number; rondeur: number; illisibles: number }; // mesures du tracé libre
  couronne?: { rameaux: Placement[]; noeuds: Placement[] } | null;  // double cerne
  fendu?: { axe: number } | null;    // sceau fendu
  greffe?: Sceau | null;             // second sceau relié
}
```

Exemple (Colonne de feu vers le haut, longue portée) :

```json
{ "coeur": { "id": "braise", "inv": false },
  "rameaux": [{ "id": "jet", "angle": 0, "inv": false }],
  "noeuds": [{ "id": "visee", "angle": 0, "inv": false }],
  "taille": 2, "entaille": null }
```

### Sort enregistré

```ts
interface SortEnregistre { id: string; nom: string; notes: string; sceau: Sceau; cree: number; categorie?: string; exemple?: boolean }
```

### Profil de personnage

```ts
interface ProfilPJ {
  id: string; nom: string; joueur: string; couleur: string;
  rang: 1 | 2 | 3;
  signes: string[];                        // ids connus ; départ = braise, source, socle, souffle, lueur, jet, gerbe, plume, fenetre, halo
  emplacements: number;                    // taille du grimoire ; départ = 5
  grimoire: SortEnregistre[];
  calibrage: Record<string, Stroke[][]>;   // jusqu'à 5 tracés perso par signe, boîte 0..100
  defis: Record<string, { score: number; temps: number; date: number }>; // meilleur résultat par sort ou leçon
  lecons: string[];                        // ids des leçons réussies
  cree: number;
}
type Stroke = { x: number; y: number }[];
```

### Stockage navigateur

| Clé | Type | Contenu |
|---|---|---|
| `atelier-de-tracage.grimoire.v1` | localStorage | sorts du MJ (hors exemples) |
| `atelier-de-tracage.grimoire.retires` | localStorage | ids des exemples supprimés |
| `atelier-de-tracage.profils.v1` | localStorage | liste des `ProfilPJ` |
| `atelier-de-tracage.profil.actif` | localStorage | id du personnage à la table |
| `atelier-de-tracage.mj` | sessionStorage | `'1'` si le mode MJ est ouvert |
| `atelier.ambiance`, `atelier.lieu`, `atelier.cibles` | localStorage | réglages de la vue 3D |

Les exports JSON (grimoire, personnages) utilisent exactement ces structures.

## 8. Pipeline de lecture d'un tracé libre (`engine/freehand.ts`)

`lireTrace(strokes, largeurZone, tolerance = 1, { connus?, perso? }) → Lecture`

1. **Cernes** : chaque trait long est ajusté à un cercle (méthode de Kåsa). Les morceaux d'un même anneau sont fusionnés ; les anneaux concentriques sont groupés (double cerne). Au plus 2 groupes → 2 sceaux.
2. **Greffe** : un trait dont les extrémités touchent les deux cernes = lien de greffe.
3. **Répartition** des autres traits vers le sceau le plus proche.
4. **Entaille / fendu** : couverture angulaire de la cerne par cases de 5° ; un trou = entaille ; deux trous opposés (±35°) = sceau fendu.
5. **Groupes** : les traits proches (boîtes englobantes) sont réunis (union-find) ; chaque groupe est classé Cœur (centre), Rameau (intérieur), Nœud (sur la cerne) ou signe de couronne, d'après la distance au centre, mesurée sur le **rayon local** de la cerne (tolère les cernes irrégulières).
6. **Reconnaissance** (`recognizer.ts`) : le groupe est ramené dans le repère du signe (« haut » = extérieur), puis comparé aux modèles par l'algorithme **$P** (32 points, rotations testées ±24°), avec cache. Seuil d'acceptation par rang : 0,18 / 0,24 / 0,30. Les modèles **perso** (calibrage) s'ajoutent aux modèles de base.
7. **Signes inconnus** : si `connus` est fourni, un signe reconnu mais inconnu du PJ est signalé (`inconnus`) et **ignoré** dans le sceau.
8. Sortie : `{ sceau, centre, R, cerne, groupes (pour l'affichage), cernes, inconnus, greffeTrait }`.

Performance : ≈ 17 ms par lecture sur un sceau chargé.

## 9. Rendu 3D (`three/` + `components/Vue3D.tsx`)

- `Vue3D` reçoit `{ traits, centre, R, sceau, analyse, playKey }` ; incrémenter `playKey` relance l'animation.
- Le sceau tracé est projeté au sol et s'illumine ; `effet3d.creerEffet(env)` choisit les émetteurs selon **élément × forme** (jet, pluie, dard, rempart, tourbillon, figure…) et applique les actions aux **cibles** (`cibles.reagir`) : brûler, geler, tremper, pousser, léviter, rétrécir, lier…
- Un **relevé** liste ce qui est arrivé à chaque cible (« Tonneau trempé, en lévitation, déplacé de 1,5 m »).
- Options : choix des cibles (adaptées, mannequins, objets, nature, aucune), lieu (5), ambiance (3), **vue du lanceur** (POV), plein écran.
- Techniques : sceau fendu → les deux moitiés se rejoignent (plans de découpe) ; greffe → second effet (combinaison) ou étincelles (annulation).

## 10. Fonctions utiles pour une intégration

```ts
import { analyser } from './engine/analyse';
import { decrire, valeurs } from './engine/effets';
import { lireTrace } from './engine/freehand';
import { generer } from './engine/generateur';
import { noter } from './engine/defi';
import { svgSceau, htmlGrimoire } from './engine/impression';
import { SIGNE, TOUS } from './data/signes';

const a = analyser(sceau);             // règles
const d = decrire(sceau, a);           // texte : d.titre, d.enBref, d.formes, d.stats…
const L = lireTrace(traits, 600);      // tracé → L.sceau
const g = generer({ intention: 'Attaque', rangMax: 2, coeur: 'hasard-element', scelles: false });
const n = noter(modele, L.sceau);      // { score, mention, details }
const svg = svgSceau(sceau, 300);      // chaîne SVG autonome (encre sur fond transparent)
const html = htmlGrimoire([{ nom, sceau }], 'Mon grimoire'); // page A5 imprimable
```

Composants React réutilisables : `<SceauSVG sceau={s} />`, `<Fiche analyse={a} sceau={s} />`, `<Vue3D … />`, `<Freehand mj profil majProfil onOuvrir onSave />`.

## 11. Guide d'intégration dans un projet plus grand

### Option A — intégrer comme page autonome (le plus simple)
Héberger `atelier-de-tracage-v0.6.html` (ou `dist/`) et l'ouvrir dans un onglet ou une `<iframe>`. Aucune modification de code. Inconvénient : les données restent dans le `localStorage` de cette page.

### Option B — intégrer comme module (recommandé si le projet est en React/TS)
1. Copier `src/data`, `src/engine` (et `src/three`, `src/components` si on veut l'interface) dans un sous-dossier, par ex. `modules/atelier/`.
2. Ajouter les dépendances `react`, `react-dom`, `three`, `@types/three`.
3. Monter `App.tsx` (ou seulement les composants voulus) dans une route du projet.
4. **Préfixer le CSS** : `styles.css` définit des variables sur `:root` et des classes génériques (`.btn`, `.chip`, `.tabs`, `.modale`, `.badge`…). Les envelopper sous un conteneur (`.atelier-root { … }`) pour éviter les collisions.
5. Polices : Marcellus SC et Alegreya Sans (interface), IM Fell English (fiches imprimées), chargées depuis Google Fonts.

### Option C — réutiliser seulement le moteur
`data/` + `engine/` (sauf `impression.ts`, `storage.ts`, `verrou.ts`, `profils.ts` côté stockage) sont du TypeScript pur, sans DOM : utilisables côté serveur, dans un bot, un générateur de PNJ, un éditeur de campagne, etc.

### Points à adapter lors d'une intégration

| Point | Où | À faire |
|---|---|---|
| Stockage | `engine/storage.ts`, `engine/profils.ts`, `components/Vue3D.tsx` | Remplacer `localStorage` par l'API ou la base du projet hôte (fonctions `charger…` / `sauver…` déjà isolées). |
| Mot de passe MJ | `engine/verrou.ts` | Remplacer par l'authentification / les rôles du projet hôte (`verifierMotDePasse`, `mjDejaOuvert`). Le mot de passe n'est stocké que sous forme d'empreinte SHA-256. |
| Personnages | `engine/profils.ts` | Relier `ProfilPJ` aux fiches de personnage du projet (id commun) ; `signes`, `rang`, `emplacements`, `grimoire` sont les seuls champs nécessaires aux règles. |
| Univers | `data/signes.ts`, `data/grimoire.ts`, `engine/effets.ts` | Ajouter des signes, des sorts ou des éléments propres à l'univers (voir § 12). |
| Impression | `engine/impression.ts` | `imprimer()` ouvre une fenêtre ; dans un environnement qui bloque les pop-ups, utiliser `htmlGrimoire()` et gérer l'affichage soi-même. |
| Thème | `styles.css` | Variables `--ink`, `--paper`, `--accent`, etc. ; thème sombre automatique (`prefers-color-scheme`) ou forcé par `data-theme`. |

## 12. Étendre l'outil

- **Nouveau signe** : ajouter l'entrée dans `data/signes.ts` (C, R ou N), son dessin dans `data/glyphs.ts` (boîte 100×100, haut = extérieur), puis :
  - Cœur : `MATIERE` dans `analyse.ts`, `ELEMENTS` et `DETAILS` dans `effets.ts`, réactions dans `three/cibles.ts` et émetteurs dans `three/effet3d.ts` ;
  - Rameau : `phraseForme()` dans `effets.ts`, nom de forme dans `noms.ts`, émetteur dans `effet3d.ts` ;
  - Nœud : règle dans `analyse()` et `valeurs()`.
  - Vérifier ensuite qu'il n'est pas confondu avec un signe proche : `npm run test:realiste`.
- **Nouveau sort d'exemple** : `sort(id, nom, categorie, notes, coeur, cInv, rameaux, noeuds, taille, entaille, extra)` dans `data/grimoire.ts` (helpers `autour()` et `aux()`).
- **Nouvelle leçon** : `L(id, titre, signeAppris | null, rang, consigne, modele)` dans `data/lecons.ts`. Un test vérifie que chaque modèle est validable (≥ 70).
- **Nouveau lieu 3D** : `Lieu` + `LIEUX` + `construireLieu()` dans `three/monde.ts`.

## 13. Fonctionnalités par version

| Version | Contenu |
|---|---|
| v0.1 | Tracé libre, composeur, grimoire, animation 2D |
| v0.2 | Table de tracé seule par défaut, mode MJ sous mot de passe, visualisation 3D, descriptions précises |
| v0.3 | Lecture des dessins fiabilisée, grimoire étendu, 3D toujours visible et agrandissable, générateur aléatoire |
| v0.4 | 3D variée et réaliste, effets sur des cibles physiques |
| v0.5 | Titre et description claire et détaillée de chaque sort |
| v0.6 | Profils de PJ (signes connus, grimoire limité, carnet), chrono, leçons et défis notés, calibrage de la main, double cerne / sceau fendu / greffe, lieux 3D et vue du lanceur, fiches imprimables façon grimoire, « Donner à un PJ » |

## 14. Tests et qualité

| Fichier | Contenu | État v0.6 |
|---|---|---|
| `tests/engine.test.ts` | règles, reconnaissance, analyse, descriptions | 83/83 |
| `tests/techniques.test.ts` | double cerne, fendu, greffe | 9/9 |
| `tests/profils.test.ts` | profils, notation, 25 leçons validables, signes inconnus, calibrage | 10/10 |
| `tests/realiste.test.ts` | robustesse sur 144 tracés « à la main » simulés (`FORCE=1` par défaut) | Cœurs 100 %, Rameaux 100 %, Cerne 100 %, Nœuds ≈ 94 % |

## 15. Limites connues

- Les **Nœuds** (petits signes posés sur la cerne : Écho, Guet, Braise-douce…) sont les moins bien reconnus (≈ 94 %) ; le calibrage de la main compense.
- Toutes les données sont **locales au navigateur** : changer de navigateur ou vider les données efface grimoire et personnages (prévoir les exports JSON).
- Au plus **deux sceaux** lus à la fois (une greffe), une seule couronne.
- La 3D est illustrative (physique simplifiée), pas une simulation exacte.
- Les textes générés sont en français uniquement.
- Le build single-file pèse ≈ 900 Ko (≈ 256 Ko compressé), surtout à cause de three.js.
