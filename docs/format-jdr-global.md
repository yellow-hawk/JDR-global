# Format `jdr-global` : le contrat de données

Version du format : **1 (brouillon 0.8)**, 6 octobre 2026. Implémenté dans `app/src/noyau/contrat/`.
Ce document est la seule référence commune à tous les modules. Un module ne connaît des autres que ce qui est écrit ici.

---

## 1. Principes

1. **Versionné** : la racine porte `format` et `version`. Une migration par version (`noyau/contrat/migrations/`).
2. **Tolérant** : un champ inconnu est conservé tel quel, un champ manquant prend sa valeur par défaut, une référence cassée est signalée sans planter (principe repris de l'Avatar).
3. **Enveloppe, pas réécriture** : les formats existants (SAVE de l'Atlas, preset de l'Avatar, `Sceau` et `ProfilPJ` de l'Atelier) sont rangés **tels quels** dans leur champ. On ne les traduit pas.
4. **Identifiants** : chaque objet a un `id` texte unique dans la campagne, préfixé par son type (`carte-…`, `perso-…`). Les liens entre objets passent par une **référence** `{ "type": "carte", "id": "carte-7f3a" }`.
5. **Dates** : ISO 8601 (`creeLe`, `majLe`). Les dates du monde (calendrier inventé) sont un objet à part : `{ "an": 412, "mois": 3, "jour": 14 }`.
6. **Règle MJ / joueurs, en une ligne** : *tout ce qui est secret est rangé sous une clé `mj`*. La vue joueurs s'obtient en supprimant récursivement toutes les clés `mj` (fonction `vueJoueurs()` du noyau). Un objet marqué `"mj": { "cache": true }` disparaît **entièrement** de la vue joueurs (personnage, repère, carte secrets). Aucun module n'a besoin de sa propre règle. Les formats enveloppés (quêtes de l'Atlas) gardent leur règle propre, appliquée par leur module.
7. **Listes ouvertes** : les types de carte, de personnage, de repère… sont déclarés dans des fichiers de données (`types.json`), pas dans le code.
8. **Fichiers lourds à part** : images, PDF, vignettes sont stockés comme fichiers et référencés par `"fichier-…"`. Le JSON reste léger.

---

## 2. Racine d'une campagne

```jsonc
{
  "format": "jdr-global",
  "version": 1,
  "campagne": {
    "id": "camp-…", "nom": "Boîtes d'Orden",
    "regles": "dnd5e",                 // module de règles utilisé
    "univers": { "type": "univers", "id": "univ-…" },  // monde par défaut (optionnel)
    "temps": { "date": { "an": 1285, "mois": 3, "jour": 8 }, "heure": 16, "reference": { "univers": "univ-…", "peuple": 2 } },  // horloge (§ 14)
    "creeLe": "…", "majLe": "…",
    "mj": { "notes": "…" }
  },
  "univers":     [ /* § 3 */ ],
  "cartes":      [ /* § 4 */ ],
  "personnages": [ /* § 5 */ ],
  "sorts":       [ /* § 6 */ ],
  "rencontres":  [ /* § 7 */ ],
  "quetes":      [ /* § 8 */ ],
  "seances":     [ /* § 9 */ ],
  "fichiers":    [ /* § 10 */ ],
  "familles":    [ /* § 12 */ ],
  "evenements":  [ /* § 14 */ ],
  "documents":   [ /* § 15 */ ]
}
```

Une campagne peut contenir **plusieurs univers** (ex. le monde de Boîtes d'Orden fait main, et un monde généré pour une aventure à part).

---

## 3. Univers

Deux sortes, un seul objet :

```jsonc
{
  "id": "univ-orden", "nom": "Monde d'Orden",
  "sorte": "fait-main",                  // "genere" | "fait-main"

  // sorte "genere" : l'entrée SAVE de l'Atlas, telle quelle (format atlas-des-ciels v1)
  "atlas": { "params": {…}, "display": {…}, "edits": […], "view": {…} },

  // sorte "fait-main" : ce que le MJ décrit lui-même
  "monde": {
    "carte": { "type": "carte", "id": "carte-monde" },   // la carte du monde (§ 4), enroulée sur le globe
    "peuples": [ { "id": "peuple-…", "nom": "…", "couleur": "#…", "desc": "…", "mj": {…} } ],
    "calendrier": { "joursParAn": 365, "mois": [ { "nom": "…", "jours": 30 } ], "fetes": [] }
  },
  // optionnel pour un monde fait main : emprunter le ciel et le système stellaire à l'Atlas
  "cielAtlas": { "seed": "orden", "params": {…} },

  "mj": { "notes": "…" }
}
```

**Monde fait main dans les vues de l'Atlas.** La carte du monde importée remplace le relief généré : elle est enroulée sur le globe et affichée en carte plate. Pour cela, la carte du monde déclare sa projection (§ 4.2). Le ciel, les astres et le système stellaire peuvent venir de l'Atlas (`cielAtlas`) ou rester absents.

---

## 4. Cartes

### 4.1 Objet

```jsonc
{
  "id": "carte-7f3a", "nom": "Royaume d'Orden",
  "type": "region",                       // liste ouverte : monde, region, ville, village, lieu, donjon, bataille, quete, ciel, systeme…
  "univers": { "type": "univers", "id": "univ-orden" },
  "source": { "sorte": "import" },        // "import" | "atlas" (+ "cle" : monde, pays|k, ville|k|i, village|k|i, quete|id…) | "generateur" (+ "cle" = quête|lieu, "ref" = sorte de carte)

  "images": {
    "joueurs": "fichier-a1",              // version montrée aux joueurs (obligatoire)
    "mj":      { "image": "fichier-a2" }  // version complète MJ (optionnelle ; sinon on montre "joueurs")
  },
  "taille": { "l": 8192, "h": 4096 },     // pixels de l'image, lus à l'import

  "echelle": { "metresParPixel": 12.5 },  // calée par 2 clics + une distance connue ; null si inconnue
  "projection": null,                     // § 4.2, utile surtout pour type "monde"
  "parent": {                             // où elle se trouve sur la carte au-dessus
    "carte": { "type": "carte", "id": "carte-monde" },
    "zone": [1200, 840, 300, 220]         // x, y, largeur, hauteur en pixels de la carte parente
  },
  "reperes": [ /* § 4.3 */ ],
  "grille": { "type": "carree", "taille": 40, "decalage": [0, 0] },  // pour la Table de combat
  "creeLe": "…", "majLe": "…"
}
```

### 4.2 Projection d'une carte du monde (pour le globe)

```jsonc
"projection": {
  "sorte": "equirectangulaire",           // "equirectangulaire" | "plate" (pas de globe)
  "lonMin": -180, "lonMax": 180,
  "latMin": -70,  "latMax": 70,           // une carte Inkarnate couvre rarement les pôles
  "remplissagePoles": "glace"             // "glace" | "ocean" | "couleur" : ce qu'on affiche hors de l'image
}
```

Une carte Inkarnate n'est pas dessinée en projection géographique : l'enrouler sur le globe étire un peu le haut et le bas. Régler `latMin`/`latMax` limite cet effet. Les repères d'une carte projetée ont aussi des coordonnées `lon`/`lat`, calculées automatiquement.

### 4.3 Repères

```jsonc
{
  "id": "rep-…", "nom": "Tour d'Ébène", "x": 1530, "y": 960,
  "sorte": "ville",                       // liste ouverte : ville, lieu, danger, quete, note…
  "lien": { "type": "carte", "id": "carte-tour" },   // optionnel : carte (« Ouvrir ») ou rencontre (« Lancer le combat »)
  "desc": "Ce que les joueurs savent.",
  "mj": { "desc": "Le sorcier y cache…" } // repère entièrement secret : "mj": { "cache": true, … }
}
```

---

## 5. Personnages

```jsonc
{
  "id": "perso-richard", "nom": "Richard", "joueur": "Paul",
  "sorte": "pj",                          // pj | pnj | allie | ennemi | neutre
  "peuple": { "type": "peuple", "id": "peuple-…" },   // ou { "atlas": "k3" } pour un peuple généré
  "portrait": "fichier-p1",               // image ronde pour les jetons
  "apparence": { /* preset Avatar presetVersion 1, tel quel */ },
  "magie":     { /* ProfilPJ de l'Atelier, sans id/nom (repris du personnage) */ },
  "combat": {
    "regles": "dnd5e",
    "conditions": ["En feu"],          // états en cours, reportés depuis la Table de combat
    "stats": { "pv": 52, "pvMax": 52, "ca": 18, "vitesse": 6,
               "carac": { "for": 16, "dex": 14, "con": 14, "int": 12, "sag": 13, "cha": 16 },
               "degats": "1d10+3", "vision": 12 }
  },
  "notes": "…",
  "mj": { "secret": "…", "motivation": "…" }
}
```

`combat.stats` appartient au module de règles indiqué : la 5e définit les champs ci-dessus ; un autre système définira les siens sans changer le reste du format.

### 5.1 Fiche détaillée (`personnage.fiche`, facultative)

```jsonc
"fiche": {
  "identite": { "age": "34 ans", "genre": "", "taille": "", "poids": "", "yeux": "", "cheveux": "", "alignement": "Neutre bon",
                "divinite": "", "historique": "soldat", "origine": "", "langues": ["Commun", "Nain"] },
  "personnalite": { "traits": "", "ideaux": "", "liens": "", "defauts": "" },
  "progression": { "classes": [{ "id": "guerrier", "niveau": 5, "sousClasse": "champion" }], "xp": 6500,
                   "journalXp": [{ "quand": "…", "gain": 450, "raison": "Combat du gué" }],
                   "talents": ["guerrier.defense.1"], "aptitudes": [{ "nom": "Second souffle", "texte": "…", "effets": [] }] },
  "maitrises": { "competences": { "athletisme": 1, "perception": 2 }, "sauvegardes": ["for", "con"], "armes": [], "armures": [], "outils": [] },
  "inventaire": { "objets": [{ "id": "obj-…", "nom": "Épée longue", "ref": "arme:epee-longue", "quantite": 1, "poids": 1.5,
                               "equipe": true, "harmonise": false, "description": "", "effets": [{ "cible": "ca", "valeur": 1 }] }],
                  "monnaie": { "po": 12, "pa": 4 } },
  "defense": { "pvTemp": 0, "desVie": 5, "resistances": "", "immunites": "", "vulnerabilites": "", "mortSucces": 0, "mortEchecs": 0 },
  "journal": [{ "quand": "…", "texte": "…", "mj": { "cache": true } }]
}
```

- Compétences : 1 = maîtrise, 2 = expertise. `ref` d'un objet : entrée du catalogue du système (`noyau/regles/dnd5e/catalogue.json`, données SRD 5.1 CC-BY 4.0).
- `effets` : `{ cible, valeur }`, cibles comprises par le système (5e : `ca`, `carac.for`, `competence.perception`, `sauvegarde.dex`, `vitesse`, `pvMax`, `initiative`, `attaque`, `degats`). Comptent pour les objets **équipés** et les aptitudes.
- `progression.talents` : ids des talents acquis (arbres des règles ou de la campagne, `modules.personnages.arbres` : `ArbreTalents[]`, voir `noyau/talents`).
- Valeurs dérivées (modificateurs, compétences, CA de l'armure portée, attaques des armes équipées, charge) : calculées par `R.calculer(p)` ; CA, bonus d'attaque, dégâts et niveau sont reportés dans `combat.stats` (la Table de combat les lit).

---

## 6. Sorts

```jsonc
{
  "id": "sort-…", "nom": "Colonne de flammes",
  "sceau": { /* Sceau de l'Atelier, tel quel */ },
  "categorie": "Attaque", "notes": "…",
  "proprietaire": { "type": "personnage", "id": "perso-…" },  // null = grimoire du MJ
  "cree": 1790000000000,                                     // date de création (ms), reprise de l'Atelier
  "mj": { "notes": "…" }
}
```

Le grimoire du MJ ne stocke que les sorts créés ou modifiés : les 66 sorts de base de l'Atelier sont ajoutés à l'affichage (sauf ceux retirés, listés dans `modules.magie.exemplesRetires`). Les sorts d'un PJ restent dans `personnage.magie.grimoire` (format de l'Atelier).

La traduction en gabarit de combat (forme, rayon, dégâts) **n'est pas stockée** : elle est recalculée à partir du sceau par le module de règles, pour rester juste si les règles changent.

---

## 7. Rencontres

```jsonc
{
  "id": "renc-…", "nom": "Embuscade au gué",
  "carte": { "type": "carte", "id": "carte-gue" },
  "jetons": [ { "perso": { "type": "personnage", "id": "perso-…" }, "x": 5, "y": 7, "visible": true } ],
  "terrain": [ /* zones de terrain de la table (format « zone » ci-dessous, categorie "terrain") */ ],
  "table": { /* état complet de la table de combat (EtatTable, version 1) */ },
  "quete": { "type": "quete", "id": "quete-…" },   // optionnel : rencontre préparée pour une quête
  "mj": { "notes": "…", "tactique": "…" }
}
```

Rencontres préparées automatiquement (installation d'un monde de l'Atlas) : une par lieu de quête, avec une carte de bataille générée
(`source.sorte = "generateur"`, cachée aux joueurs, version MJ annotée), murs et obstacles en zones de terrain, PJ et adversaires placés,
et un repère « ⚔ » (caché aux joueurs, `lien` vers la rencontre) sur la carte du lieu.

`table` (EtatTable, défini dans `app/src/modules/combat/moteur/types.ts`) :

```jsonc
{
  "version": 1,
  "grille": { "type": "carree", "taille": 40 },            // ou "hex" (hexagones pointe en haut, coordonnées axiales)
  "jetons": [ { "id": 1, "nom": "Richard", "camp": "pj", "pv": 31, "pvMax": 52, "ca": 18, "vitesse": 6,
               "carac": { "for": 16, "dex": 14, "con": 12, "int": 10, "sag": 10, "cha": 12 },
               "x": 3, "y": 4, "taille": 1, "conditions": ["En feu"], "visible": true, "auras": [],
               "concentration": null, "degats": "1d10+3", "persoId": "perso-…", "portrait": "data:image/jpeg;…" } ],
  "zones": [ { "id": 1, "categorie": "terrain", "forme": "cercle", "x": 8, "y": 2, "rayon": 2, "angle": 0,
              "couleur": "rgba(180,140,60,0.4)", "nom": "Terrain difficile", "terrain": "difficile" } ],
  "sorts": [ /* gabarits : forme, rayon, portee, origine "soi" | "point", effets (degats | soin | condition), particule, concentration */ ],
  "bibliotheque": [ /* modèles de créatures */ ],
  "combat": { "actif": true, "round": 2, "tour": 0, "ordre": [3, 1, 2] },
  "brouillard": { "actif": false, "cases": { "3,4": true } },   // cases révélées
  "fond": { "carte": "carte-gue", "pxCase": 52.5 },              // carte de la campagne en fond, grille calée
  "opacites": { "carte": 1, "jetons": 0.95, "sorts": 0.35, "terrains": 0.3 }
}
```

Formes : `cercle`, `cone` (90°), `ligne`, `carre`, `rectangle`, `polygone` (`points`). Terrains : `difficile`, `infranchissable`, `eau`, `elevation`, `couvert`, `antimagie`, `mur`.
Compatibilité : un `table` à l'ancien format de la Table v7 (`tokens`, `zones`, `gs`…) est toujours accepté et converti au chargement.
La table en cours (non enregistrée comme rencontre) est gardée dans `modules.combat.table`, au même format.

---

## 8. Quêtes

```jsonc
{
  "id": "quete-…", "titre": "…",
  "source": { "sorte": "atlas", "cle": "q0" },     // ou "fait-main"
  "sorte": "principale",                            // principale | secondaire | annexe | personnelle (liste ouverte)
  "statut": "en-cours",                             // a-venir | en-cours | terminee | abandonnee
  "univers": { "type": "univers", "id": "univ-…" },
  "resume": "Ce que les joueurs savent.",
  "lieuxTexte": ["Kan (capitale)"],                 // lieux nommés par l'Atlas
  "lieux": [ { "type": "carte", "id": "…" } ],
  "personnages": [ { "type": "personnage", "id": "…" } ],   // PNJ liés par leur nom à l'import
  "etapes": [ { "titre": "…", "lieu": "…", "joueurs": "…", "mj": { "texte": "…", "obstacle": "…", "choix": [] } } ],
  "recompenses": ["…"],
  "mj": { "verite": "…", "antagoniste": "…", "fins": [], "notes": "…" }
}
```

Une quête de l'Atlas réimportée (même univers, même clé) est mise à jour : son statut et les notes MJ ajoutées sont conservés. Une étape secrète garde côté joueurs un titre neutre ; ses vrais titre, lieu et texte sont sous `mj`.

## 9. Séances (journal de campagne)

```jsonc
{
  "id": "seance-…", "numero": 12, "date": "2026-10-11",
  "dateMonde": { "an": 412, "mois": 3, "jour": 14 },
  "resume": "…",
  "liens": [ { "type": "quete", "id": "…" }, { "type": "rencontre", "id": "…" } ],
  "mj": { "notes": "…" }
}
```

---

## 10. Fichiers

```jsonc
{ "id": "fichier-a1", "nom": "orden-joueurs.png", "mime": "image/png", "octets": 4823011 }
```

- **Dans l'application** : le contenu est rangé dans IndexedDB, séparément du JSON.
- **À l'export** : une archive `.zip` contenant `campagne.json` et un dossier `fichiers/` (`fichier-a1.png`, …).
- **Export joueurs** : `vueJoueurs()` retire aussi les fichiers référencés uniquement sous une clé `mj`.

---

## 12. Familles et dynasties

```jsonc
{
  "id": "famille-…", "nom": "Dynastie de Nerak (Kaiqens)", "sorte": "dynastie",   // ou "famille"
  "univers": { "type": "univers", "id": "univ-…" }, "peuple": 3, "racine": "mbr-…",
  "membres": [
    { "id": "mbr-…", "nom": "Nerak", "sexe": "m", "naissance": -30, "mort": 54, "titre": "fondateur", "regne": [1, 54],
      "role": "souverain", "persoId": null, "parents": [], "conjoints": ["mbr-…"], "notes": "", "mj": {} }
  ]
}
```

Un membre est une fiche légère ; `persoId` le relie à un vrai personnage. Années dans le calendrier du peuple.

## 13. Peuples, calendriers, rôles

- `campagne.univers` : monde par défaut (référence d'univers).
- `univers.civilisations` : `{ monde: { nom, soleils, lunes, jourHeures }, peuples: Civilisation[] }`. Une `Civilisation` : `cle`, `nom`, `couleur`, `capitale`, `villes`, `regime`, `regimeTexte`, `titres` [m, f], `souverain`, `fondateur`, `ere`, `population`, `anActuel`, `traits`, `coutumes`, `croyance`, `langue`, `relations` [{ peuple, nom, sorte }], `histoire` [{ an, texte }], `calendrier` (`Calendrier`, fêtes avec `texte`), `noms` (réserve de noms), `mj`.
- `personnage.role` : rôle ou métier ; sert aux stats (`R.statsPourProfil`), aux sorts des PNJ lanceurs et aux organigrammes. Stats D&D 5e : `niveau`, `bonusAttaque` en plus.
- `rencontre.quete` ; `modules.combat.packs` (packs d'univers : `{ format: "jdr-global-pack", id, nom, bibliotheque, sorts, conditions }`), `modules.combat.diffusionAuto`.
- Les sorts du grimoire de base de l'Atelier sont de vrais `sorts` de la campagne (ajoutés à l'ouverture). Un PNJ lanceur a `magie.grimoire` et `mj.magieAuto`.

## 14. Temps de jeu et chronologie

- `campagne.temps` : `{ date: DateMonde, heure, reference? }`. `mois` et `jour` commencent à 1. Le calendrier de référence est celui du peuple `reference` (sinon le premier peuple du monde par défaut qui a un calendrier, sinon 12 mois de 30 jours) ; la durée du jour et les lunes viennent de `univers.civilisations.monde`.
- `evenements` : `{ id, titre, date: DateMonde, texte?, sorte?, liens: Ref[], mj? }` (`mj.cache` = événement secret).
- Une nouvelle séance prend `campagne.temps.date` comme `dateMonde`.
- `modules.chronologie.bandeau` : la date est affichée sur l'écran joueurs.

## 15. Documents, brouillard, relations, réputation

- `documents` : `{ id, titre, sorte: "texte" | "image", texte?, image?: "fichier-…", style?: "parchemin" | "lettre" | "affiche" | "note", lien?: Ref, montreLe?, mj? }`. Créé avec `mj.cache: true` ; « Montrer aux joueurs » retire `cache` et note `montreLe`.
- `carte.brouillard` : `{ actif, traits: [{ x, y, r, revele }] }` en pixels de l'image, appliqués dans l'ordre sur une carte d'abord couverte.
- `personnage.relations` : `[{ vers: Ref, sorte, texte?, mj? }]` ; sortes dans `modules/personnages/relations.json` (symétriques ou avec libellé inverse). `mj.cache` = relation secrète.
- `civilisation.reputation` (−100..100) et `reputationJournal` `[{ quand, delta, raison }]`.
- `quete.reputation` : `[{ univers, peuple, delta }]`, appliqués une fois au passage à « terminée » (`quete.mj.reputationAppliquee`).
- `modules.journal.preparation` : `{ coches: string[], notes: [{ id, texte }] }` (préparation de séance).
- Hors du contrat de campagne : instantanés automatiques (magasin IndexedDB `sauvegardes`) et dossier de sauvegarde (réglage `dossier-sauvegarde`).

## 11. À trancher plus tard

- Images très grandes (cartes du monde de plus de 8 000 px) : découpage en tuiles si l'affichage rame.
- Synchronisation entre plusieurs appareils : hors du format pour l'instant (choix : écran MJ + écran partagé).
