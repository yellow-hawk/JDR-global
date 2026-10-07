# Module Documents

État : **prêt**. Lettres, affiches, avis de recherche, notes, images : préparés par le MJ, montrés sur l'écran joueurs d'un clic.

| Fichier | Rôle |
|---|---|
| `logique.ts` | Pur, testé : `nouveauDocument` (caché par défaut, `mj.cache`), `modifierDocument`, `supprimerDocument` (libère l'image), `montrerDocument` / `cacherDocument`, `sceneDocument` (scène `document` du bus), `trierDocuments`. |
| `styles.json` | Habillages : parchemin, lettre, affiche, note (classes `.ecran-doc-*` de `interface/styles.css`). |
| `Page.tsx` | Liste « À montrer » / « Déjà montrés », édition (titre, habillage, texte, image, lien quête ou personnage), aperçu fidèle. |

Données : collection `documents` du contrat. Un document non montré est absent de l'aperçu joueurs et de l'archive joueurs.
API publique : `definition`, `nouveauDocument`, `estMontre`, `montrerDocument`, `sceneDocument`.
