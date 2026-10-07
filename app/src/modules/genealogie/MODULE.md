# Module Généalogie

État : **prêt**. Arbres généalogiques interactifs pour tout le monde, du simple PNJ à la dynastie.

| Fichier | Rôle |
|---|---|
| `generateur.ts` | Pur, testé, déterministe : `familleDepuisPersonnage` (parents, grands-parents, fratrie, conjoint, enfants ; nom de famille = dernier mot du nom ; âge tiré de la description), `dynastieDepuisCivilisation` (du fondateur au souverain actuel, règnes continus, successions enfant / fratrie / usurpateur, conjoints et cadets), `separerTitre`. Noms tirés de la réserve du peuple (`civilisation.noms`), sinon `noms.json`. |
| `logique.ts` | Pur, testé : `ajouterProche` (parent, enfant, conjoint, frère / sœur), `etendre`, `supprimerMembre`, `modifierMembre`, `promouvoir` (membre → vrai PNJ avec stats de son rôle), `civilisationDe`, `familleDuPersonnage`. |
| `disposition.ts` | Pur, testé : générations, couples côte à côte, balayages par barycentre. |
| `ArbreFamille.tsx` | SVG : cartes des membres (portrait si fiche liée, ♛ règne, ● fiche), lignée du membre choisi en évidence. |
| `Membre.tsx` | Panneau du membre : identité, dates, titre, rôle, notes, secrets MJ, liens, actions. |
| `Page.tsx` | Liste des dynasties et familles, création (personnage, peuple, vide). Cible `naviguer` : id de famille, id de personnage (arbre créé s'il manque) ou `peuple:<clé>` (dynastie créée). |

Données : collection `familles` du contrat (membres légers ; `persoId` relie à une fiche).
API publique : `definition`, `familleDepuisPersonnage`, `dynastieDepuisCivilisation`, `separerTitre`, `ajouterFamille`, `familleDuPersonnage`, `civilisationDe`, `disposerFamille`.
