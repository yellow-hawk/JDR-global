# Module Cartes

État : **prêt**. Cartes importées (Inkarnate ou autre) ou venues de l'Atlas.

| Fichier | Rôle |
|---|---|
| `types.json` | Listes ouvertes : `typesCarte` (monde, région, ville, lieu, donjon, bataille, autre) et `sortesRepere`. Ajouter un type = une ligne ici. |
| `logique.ts` | Pur, testé. `ajouterCarte`, `modifierCarte`, `definirVersionMj`, `supprimerCarte` (détache enfants et univers), `echelleDepuisPoints`, `pixelsParCase` (1,5 m), `ajouterRepere` / `modifierRepere` / `supprimerRepere`, `enfants`, `chemin`, `parentPossible`, `devinerType`, `nomDepuisFichier`. |
| `import.ts` | Navigateur : `tailleImage`, `pdfVersImage` (pdf.js chargé à la demande, 1re page → PNG ~4000 px), `preparer`. |
| `enregistrer.ts` | `enregistrerImageCarte(idCampagne, blob, nom)` → fichier rangé + taille. |
| `Page.tsx` | Galerie classée par catégorie (groupes repliables ; ceux de plus de 12 cartes sont repliés), filtre par type, import multiple. |
| `Detail.tsx` | Fiche : bascule version MJ / joueurs, outils Repère / Échelle / Placer une carte ici, « Montrer aux joueurs » (toujours la version joueurs), bloc MJ. |
| `Visionneuse.tsx` | Image + calque SVG (repères, zones des cartes enfants, points d'échelle, rectangle), zoom. |
| `PanneauRepere.tsx` | Édition d'un repère : lien vers une carte (« Ouvrir la carte liée ») ou une rencontre (« Lancer le combat »), secret, caché. |

| `generateur/` | **Cartes de bataille générées**, pur et testé (sauf `rendu.ts`) : `types.ts` (cases, plan), `outils.ts`, `donjon.ts` (salles + couloirs : pierre, crypte, mine ; grotte organique), `interieur.ts` (taverne, temple, palais, maison, tour, fort, entrepôt, bibliothèque), `exterieur.ts` (12 sortes), `choix.ts` (lieu de quête → sorte de carte, règles par mots-clés), `zones.ts` (cases bloquantes → rectangles de terrain), `rendu.ts` (image 70 px/case, version MJ annotée). |

API publique : `definition`, `TYPES_CARTE`, `libelleType`, `ajouterCarte`, `pixelsParCase`, `enregistrerImageCarte`, `choisirCarte`, `genererPlan`, `libelleChoix`, `rectanglesTerrain`, `imagePlan`, `PX_CASE`.
