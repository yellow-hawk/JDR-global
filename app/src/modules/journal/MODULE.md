# Module Journal

État : **prêt**. Quêtes (importées de l'Atlas ou écrites à la main) et séances de jeu.

| Fichier | Rôle |
|---|---|
| `logique.ts` | Pur, testé. `STATUTS`, `SORTES_QUETE`, `importerQuetesAtlas(c, quetes, univers)` (mise à jour sans doublon, garde statut et notes MJ, lie les PNJ par nom), `nouvelleQuete`, `modifierQuete`, `supprimerQuete` (détache des séances), `trierQuetes`, `nouvelleSeance` (numéro suivant, liée aux quêtes en cours, reprend la date du monde), `modifierSeance`, `supprimerSeance`, `sceneQuete`, `sceneSeance`. Type `QueteAtlas`. |
| `Page.tsx` | Onglets Quêtes / Séances ; quêtes groupées par statut. |
| `FicheQuete.tsx` | Titre, statut, sorte, résumé joueurs, lieux, PNJ (liens vers Personnages), étapes avec bloc MJ, récompenses, secrets, notes MJ, « Montrer aux joueurs ». |
| `Seances.tsx` | Date réelle, date du monde, résumé, quêtes liées, notes MJ, « Montrer le résumé aux joueurs ». |
| `journal.css` | Classes `.journal-`. |

Quêtes de l'Atlas : pont `atlas:quetes-donnees` (`public/atlas/js/23-pont.js`), déclenché depuis Monde → « Importer les quêtes ». Tout ce que l'Atlas réserve au MJ (vérité, antagoniste, étapes secrètes, fins) est rangé sous `mj`.
API publique : `definition`, `importerQuetesAtlas`, type `QueteAtlas`.

## Ajouts

- `preparation.ts` (pur, testé) : `pointsPreparation` (quêtes en cours, leurs rencontres, PNJ concernés avec portrait / stats manquants, cartes, documents liés non montrés, fêtes des 14 prochains jours, peuples méfiants ou pires, points du MJ), coches et notes dans `modules.journal.preparation`. `Preparer.tsx` : onglet « Préparer la séance » + « Démarrer la séance » (nouvelle séance à la date de l'horloge, coches remises à zéro).
- `EffetsReputation.tsx` : effets d'une quête sur la réputation, appliqués au passage à « Terminée » (`appliquerReputationQuete` du module Pays).
- `nouvelleSeance(c, date, dateMonde?)` : la date du monde vient de l'horloge (Chronologie).
