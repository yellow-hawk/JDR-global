# Module Avatar 3D

État : **prêt (intégration)**. Code de l'Avatar Creator dans `createur/` (JS/JSX d'origine), assets dans `public/avatar/assets/species/human/`.

| Fichier / dossier | Rôle |
|---|---|
| `Page.tsx` | Choix du personnage, chargement de son preset, « Enregistrer + utiliser comme portrait » (vignette → `personnage.portrait`), panneau leva intégré à droite. Le visualiseur est chargé à la demande. |
| `demande.ts` | `ouvrirAvatarPour(id)` (appelé depuis Personnages) / `prendreDemande()`. |
| `createur/data/species.json` | Contrat data-driven d'origine ; chemins réécrits en `avatar/assets/…` (relatifs, pour GitHub Pages et le lanceur). |
| `createur/store/` | `useCharacter` (zustand), `presets.js` (sérialisation tolérante). `presetLibrary.js` et `CharacterPanel.jsx` retirés : la bibliothèque, c'est la campagne. |
| `createur/three/` | Viewer R3F, modèle, morphs, matériaux, assets, vignette. |
| `createur/ui/ControlPanel.jsx` | Panneau leva généré depuis species.json. |

Stockage : `personnage.apparence` = preset `presetVersion 1` complet (avec vignette).
API publique : `definition`, `ouvrirAvatarPour`.
À faire : genre H/F (pas prioritaire), vêtements, remplacer leva, alléger `base.glb` (12,5 Mo ; meshopt ne gagne que 29 %, ce sont surtout les textures).
