# Module Chronologie

État : **prêt**. Horloge du temps de jeu et frise chronologique de la campagne.

| Fichier | Rôle |
|---|---|
| `logique.ts` | Pur, testé : `reference` (calendrier du peuple choisi, sinon premier peuple du monde par défaut, sinon 12 × 30 j ; heures par jour et lunes du monde), `tempsDe` / `changerTemps`, `absolu` / `depuisAbsolu` / `jourDansAn`, `avancer` (heures, jours, mois), `moment`, `dateLisible`, `fetesAVenir`, `lunes` (phase, prochaine pleine lune), événements (`ajouterEvenement`, `modifierEvenement`, `supprimerEvenement`), `elementsFrise` (histoire des peuples recalée sur la référence par leur année actuelle, séances datées, événements). |
| `temps.json` | Boutons d'avance, moments de la journée, phases, sortes d'événements, couleurs, calendrier par défaut. |
| `Horloge.tsx` | Date, heure, avances, lunes, fêtes à venir, réglage manuel, choix du calendrier, date sur l'écran joueurs. |
| `Frise.tsx` | Frise SVG : une ligne par source, zoom molette, glisser, « Tout voir », « Autour de maintenant ». |
| `EnTete.tsx` | Horloge de l'en-tête (`DefinitionModule.enTete`) ; tient à jour le bandeau de l'écran joueurs (`montrerBandeau`). |
| `Page.tsx` | Horloge + détail (édition des événements, secret MJ) + frise. |

Données : `campagne.temps` (date, heure, référence), collection `evenements`, réglage `modules.chronologie.bandeau`.
API publique : `definition`, `tempsDe`, `reference`, `dateLisible`, `fetesAVenir`, `absolu`, `ajouterEvenement`.
