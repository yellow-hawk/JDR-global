# Module Monde

État : **prêt**. L'Atlas des ciels (copie dans `public/atlas/`) tourne dans un cadre isolé ; mondes faits main avec globe 3D.

| Fichier | Rôle |
|---|---|
| `Page.tsx` | Cadre de l'Atlas + liste des univers (★ = monde par défaut) ; « Ajouter le ciel affiché » = installation complète ; imports à l'unité : ajouter / mettre à jour le ciel affiché, importer les PNJ des quêtes, importer les quêtes (→ Journal), importer la carte du monde (→ Cartes), nouveau monde fait main. En aperçu joueurs, l'Atlas n'est pas chargé (contenu MJ). |
| `pont.ts` | Messages vers l'Atlas : `demander(cadre, type)`, `ouvrirDansAtlas`. Types `EtatAtlas`, `PnjAtlas`. |
| `logique.ts` | Pur, testé : `enregistrerUnivers`, `ajouterUniversFaitMain`, `modifierUnivers`, `supprimerUnivers`, `importerPnj` (secrets → bloc MJ, antagoniste = ennemi caché). |
| `UniversFaitMain.tsx` | Nom, carte du monde (choisie dans Cartes), latitudes couvertes, remplissage des pôles, peuples, notes MJ. |
| `Globe.tsx` | Sphère three.js texturée avec la carte (projection équirectangulaire, bande latMin..latMax). |
| `installation/` | **« Ajouter le ciel affiché » installe tout** : `executer.ts` (univers par défaut → quêtes → PNJ + apparence auto → toutes les cartes → cartes de bataille + rencontres ; progression, arrêt, relance sans doublon), `cartes.ts` (pur : `integrerCarte`, `relierCartes` emboîtement + repères), `batailles.ts` (pur : `lieuxDeBataille`, `adversairesPour`, `integrerBataille`), `Installation.tsx` (fenêtre + fabrique de portraits du module Avatar). |
| `public/atlas/js/23-pont.js` | Côté Atlas : `atlas:ouvrir`, `atlas:demander`, `atlas:quetes`, `atlas:quetes-donnees` (avec `lieuxDetail` : sorte, danger, carte cible `ou`), `atlas:pnj` (avec `feminin`), `atlas:image-monde`, `atlas:cartes-plan` (toutes les cartes : clé, type, parent + zone, repères), `atlas:carte` (image d'une carte, version MJ pour les quêtes, repères des plans de ville) → `atlas:reponse`, et `atlas:pret`. Sauvegarde avant modification : `versions/2026-10-06 atlas-pont/`. |

Règle : ne jamais modifier les autres fichiers de `public/atlas/` sans copie dans `versions/` (voir la doc de l'Atlas, `docs/outils/`).
API publique : `definition`.
Limites : l'Atlas garde aussi ses « Mes ciels » (localStorage de la même adresse) ; l'Atlas lui-même ne sait pas encore afficher un monde fait main dans ses propres vues (le globe est dans la suite).
