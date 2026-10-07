# Module Pays

État : **prêt**. Fiches des peuples et pays : gouvernement, souverain, population, époque, villes, relations, histoire (frise), coutumes, croyances, langue, calendrier (mois proportionnels + fêtes) et liens vers la campagne (cartes, PNJ, quêtes, dynastie, institutions).

| Fichier | Rôle |
|---|---|
| `logique.ts` | Pur, testé : `civilisationsDe(univers)` (Atlas, sinon fiches minimales d'un monde fait main), `peuplesDeCampagne`, `pnjDuPeuple`, `quetesDuPeuple`, `cartesDuPeuple`, `dynastieDuPeuple`, `modifierCivilisation`, `ajouterPeuple`, `positionsCalendrier`. |
| `FichePays.tsx` | Fiche (lecture) et édition MJ (tous les champs, listes une par ligne, histoire « an : texte », mois « nom : jours »). |
| `Calendrier.tsx` | Bande des mois et liste des fêtes. |
| `Page.tsx` | Liste par univers (★ = monde par défaut), « + Peuple », cible `naviguer` : `{"univers","cle"}`. |

Données : `univers.civilisations` (contrat), remplies à l'installation d'un monde de l'Atlas (pont `atlas:civilisations`).
API publique : `definition`, `peuplesDeCampagne`, `civilisationsDe`.
