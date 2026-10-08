# Module Avatar 3D

État : **prêt (intégration)**. Code de l'Avatar Creator dans `createur/` (JS/JSX d'origine), assets dans `public/avatar/assets/species/human/`.

| Fichier / dossier | Rôle |
|---|---|
| `Page.tsx` | Choix du personnage, chargement de son preset, « Enregistrer + utiliser comme portrait » (vignette → `personnage.portrait`), panneau de réglages à droite. Le visualiseur est chargé à la demande. |
| `demande.ts` | `ouvrirAvatarPour(id)` (appelé depuis Personnages) / `prendreDemande()`. |
| `createur/data/species.json` | Contrat data-driven d'origine ; chemins réécrits en `avatar/assets/…` (relatifs, pour GitHub Pages et le lanceur). |
| `createur/store/` | `useCharacter` (zustand), `presets.js` (sérialisation tolérante). `presetLibrary.js` et `CharacterPanel.jsx` retirés : la bibliothèque, c'est la campagne. |
| `createur/three/` | Viewer R3F, modèle, morphs, matériaux, assets, vignette. |
| `createur/ui/ControlPanel.jsx` | Panneau de réglages généré depuis species.json (contrôles React natifs, leva retiré le 06/10 ; contrôles pilotés par le store). |

| `auto.ts` | Pur, testé : `apparenceAuto({nom, apparence, feminin, peuple})` → preset (morphs tirés des mots de la description, peau selon le peuple, genre, coiffure). Marqué `auto: true`. |
| `Fabrique.tsx` | (exporté via `FabriqueALaDemande.tsx`, chargé à la demande) `FabriqueDePortraits` : visualiseur hors écran qui charge les apparences une à une et les photographie (`modeleCharge()` ajouté à `snapshot.js`). |

Stockage : `personnage.apparence` = preset `presetVersion 1` complet (avec vignette).
API publique : `definition`, `ouvrirAvatarPour`, `apparenceAuto`, `FabriqueDePortraits`.
Tests : `avatar.test.ts` (`apparenceAuto` déterministe, morphs connus et bornés, preset chargé sans avertissement par `sanitizePreset`).
Assets : **générés par la chaîne Blender** (`../blender/`, voir `blender/LISEZMOI.md`) — corps neutre + 94 morphs (genre, âge, muscle, corpulence, stature, poitrine, visage, oreilles pointues, corps), 10 coiffures, 4 sourcils, 2 cils, 11 tenues (chemise, tunique, gilet, robe, pantalon, jupe, bottes, plastron, cotte de mailles, ceinture, cape), tous **attachés au squelette** et portant les mêmes morphs (`useAssets` mode `skinned`). Ne pas modifier les GLB à la main : reconstruire.
`species.json` est **généré** (`cd blender && npm run species`) : rôles de morph bipolaires `{ neg, pos }`, catégories (`morphCategories`, `assetCategories`), couleurs par emplacement.
`auto.json` : règles de `apparenceAuto` (tenue et palette selon le rôle, variante féminine, coiffures, couleurs, traits de peuple).
Visualiseur : reflets `RoomEnvironment` (sans fichier). Portraits cadrés sur les yeux réels (`snapshot.js`, `centreDesYeux`).
Bibliothèque MakeHuman (08/10) : 22 coiffures, 12 barbes, 18 hauts (viking, bures, robe de magicien, tenues modernes…), 9 chaussures, 13 coiffes (casques, chapeaux), 3 gants, 5 armes. Peau cachée sous les vêtements : `createur/three/masqueCorps.js` (option `cacheCorps`, attribut `_id` du corps). Crédits : `public/avatar/CREDITS.md`.
À faire : barbe longue, poses (plus tard).
