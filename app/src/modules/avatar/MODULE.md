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
| `Fabrique.tsx` | `FabriqueDePortraits` : visualiseur hors écran qui charge les apparences une à une et les photographie (`modeleCharge()` ajouté à `snapshot.js`). |

Stockage : `personnage.apparence` = preset `presetVersion 1` complet (avec vignette).
API publique : `definition`, `ouvrirAvatarPour`, `apparenceAuto`, `FabriqueDePortraits`.
À faire : genre H/F (pas prioritaire), vêtements, alléger `base.glb` (12,5 Mo ; meshopt ne gagne que 29 %, ce sont surtout les textures).
