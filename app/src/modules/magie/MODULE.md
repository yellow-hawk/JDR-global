# Module Magie (Atelier de tracé v0.6 intégré)

État : **prêt**. Le code d'origine de l'Atelier est dans `atelier/` (sous-module, quasi intact) ; le branchement sur la campagne est dans `lien.ts` et `Page.tsx`.

| Fichier / dossier | Rôle |
|---|---|
| `Page.tsx` | Remplace `App.tsx` de l'Atelier : modes (tracé libre, composeur, grimoire, magie des PJ), personnage à la table. Rôle MJ de la suite au lieu du mot de passe. |
| `lien.ts` | Pur, testé. `profilDe(perso)`, `magieDepuisProfil`, `appliquerProfils(c, profils)` (crée un PJ pour un nouveau profil, n'efface jamais un personnage), `sortsMj`, `appliquerSortsMj` (range tous les sorts, exemples compris), `integrerGrimoireDeBase` (le grimoire de base devient de vrais sorts de la campagne), `sortsPourRole` / `donnerSortsAuxPnj` (PNJ lanceurs selon `lanceurs.json` : rôle → Cœurs préférés, drapeau `mj.magieAuto`), `preparerCampagne` (appelé à l'ouverture de la campagne), `exemplesRetires`, `avecExemplesRetires`, `grimoireMjComplet`. |
| `atelier/data/` | Signes, glyphes, 66 sorts de base, 25 leçons. |
| `atelier/engine/` | Moteur pur : `analyse`, `effets` (`valeurs`, `decrire`), `freehand` (lecture du tracé), `recognizer`, `generateur`, `defi`, `profils`, `impression`, `storage` (adaptateur `configurerStockage`, plus de localStorage). `verrou.ts` supprimé. |
| `atelier/three/` | Banc d'essai 3D (three 0.169, sans React). |
| `atelier/components/` | Interface d'origine (Freehand, Composer, Grimoire, Profils, Carnet, Calibrage, Vue3D, Fiche, SceauSVG, Glyph). |
| `atelier/atelier.css` | Feuille d'origine **préfixée automatiquement** par `.atelier-racine` (thèmes clair / sombre de la suite). |
| `atelier/tests/*.verif.ts` | Tests d'origine (scripts tsx) : `npm run test:magie`. |

Stockage : profil de l'Atelier = `personnage.magie` (sans id/nom/joueur) ; grimoire du MJ = `campagne.sorts` sans propriétaire ; exemples retirés = `campagne.modules.magie.exemplesRetires`. Seule préférence locale : personnage à la table (`localStorage`, par navigateur).

API publique (`index.ts`) : `definition`, `analyser`, `decrire`, `valeurs`, `svgSceau`, `GRIMOIRE_DE_BASE`, `profilDe`, `aUneMagie`, `grimoireMjComplet`, `integrerGrimoireDeBase`, `donnerSortsAuxPnj`, `sortsPourRole`, `preparerCampagne`, types `Sceau`, `SortEnregistre`.

Limites : supprimer un PJ dans « Magie des PJ » efface seulement sa magie (le personnage se supprime dans Personnages) ; Nœuds reconnus à ≈ 94 %.
