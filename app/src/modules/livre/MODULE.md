# Module Livre de campagne

État : **prêt**. Un livre imprimable de la campagne : on choisit les sections et les éléments, la version (MJ avec secrets, ou joueurs), puis le navigateur l'imprime ou l'enregistre en PDF.

Mise en page : des **feuilles A4 fixes** (`page`, portrait ou paysage ; le titre et l'image restent sur la même feuille ; avec `ajuster`, le texte rapetisse jusqu'à tenir, au plus jusqu'à 55 %), et du **texte qui coule** (`flux` : quêtes, séances, chronologie, rencontres, grimoire). Sommaire cliquable (parties et éléments), « ↑ sommaire » sur chaque partie.

| Fichier | Rôle |
|---|---|
| `selection.ts` | Pur, testé : `SECTIONS`, `ChoixLivre`, `elementsDe(c, section)` (peuples, villes = cartes `ville|…`, autres cartes, personnages…), `retenus`, `campagneDuLivre` (vue joueurs). |
| `html/outils.ts` | `page`, `flux`, `partie` (titre en tête de la première feuille), `bloc`, `visuel` (image qui tient dans la feuille), `dessin` (SVG), `SCRIPT_AJUSTER`, `STYLE_LIVRE`. |
| `html/lieux.ts` | Pur, testé : repères d'une carte rangés par catégorie (villes, villages, puis auberges, ruines… d'après leur description), en HTML compact. |
| `html/monde.ts` | Couverture, sommaire ; peuples : feuille 1 carte du pays + fiche, feuille 2 lieux par catégorie + histoire + calendrier ; dynastie et institutions (paysage) ; une feuille par ville (plan + lieux) ; calendrier de la campagne ; chronologie. |
| `html/jeu.ts` | Autres cartes (carte + légende), quêtes, séances, personnages (PJ : une feuille ; autres : quatre par feuille), familles, arbres de talents, documents, rencontres (MJ), grimoire. |
| `assembler.ts` | Lit et réduit les images, assemble, ajuste les feuilles puis lance l'impression. |
| `Page.tsx` | Choix (gardés dans `modules.livre.choix`) ; génère d'abord les dynasties manquantes des pays du livre (gardées dans Généalogie) ; « Créer le livre (PDF) », « Aperçu sans imprimer ». |
