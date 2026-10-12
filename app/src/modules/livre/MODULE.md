# Module Livre de campagne

État : **prêt**. Un livre imprimable de la campagne : on choisit les sections et les éléments, la version (MJ avec secrets, ou joueurs), puis le navigateur l'imprime ou l'enregistre en PDF.

| Fichier | Rôle |
|---|---|
| `selection.ts` | Pur, testé : `SECTIONS`, `ChoixLivre` (`version`, `sections`, `exclus`, `cartesMj`), `elementsDe(c, section)`, `retenus`, `campagneDuLivre` (vue joueurs : `vueJoueurs`). |
| `html/outils.ts` | Échappement, `partie` (titre de partie = nouvelle page + sommaire), `bloc` (insécable, page, paysage), `STYLE_LIVRE` (A4, pages paysage nommées, calendriers, organigrammes). |
| `html/monde.ts` | Couverture et sommaire, peuples, institutions (organigramme en liste), calendriers (`anneeHtml`), chronologie. |
| `html/jeu.ts` | Cartes (image réduite, repères), quêtes, séances, fiches (`ficheCorpsHtml` du module Personnages), généalogies (`arbreSvg`), arbres de talents (`arbreTalentsSvg` + descriptions), documents, rencontres (MJ), grimoire. |
| `assembler.ts` | Lit et réduit les images (cartes 2200 px, portraits 320 px, documents 1400 px), assemble la page, lance l'impression quand les images sont prêtes. |
| `Page.tsx` | Choix (gardés dans `modules.livre.choix`), « Créer le livre (PDF) », « Aperçu sans imprimer ». |

Le livre est une page HTML autonome (images incluses) : « Enregistrer au format PDF » dans la fenêtre d'impression du navigateur.
