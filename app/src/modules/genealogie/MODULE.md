# Module Généalogie

État : **prêt**. Arbres généalogiques interactifs pour tout le monde, du simple PNJ à la dynastie.

| Fichier | Rôle |
|---|---|
| `generateur.ts` | Pur, testé, déterministe : `familleDepuisPersonnage` (parents, grands-parents, fratrie, conjoint, enfants ; nom de famille = dernier mot du nom ; âge tiré de la description), `dynastieDepuisCivilisation` (du fondateur au souverain actuel, règnes continus, successions enfant / fratrie / usurpateur, conjoints et cadets), `separerTitre`. Noms tirés de la réserve du peuple (`civilisation.noms`), sinon `noms.json`. |
| `dates.ts` | Pur, testé : `Vie` (longévité d'un peuple), `harmoniserDates(famille, an, vie)` (naissances déduites des proches, règne dans la vie, parents assez âgés, rien après l'année en cours, morts posées selon l'âge, jamais avant la fin du règne ni la naissance des enfants), `incoherences(famille, membre, an)` (alertes du panneau), `ageDe`, `mortAttendue`. |
| `logique.ts` | Pur, testé : `ajouterProche` (parent, enfant, conjoint, frère / sœur), `etendre`, `supprimerMembre`, `modifierMembre`, `promouvoir` (membre → vrai PNJ avec stats de son rôle), `civilisationDe`, `familleDuPersonnage`. |
| `disposition.ts` | Pur, testé : générations (morceaux non reliés calés sur leur époque par les naissances), un morceau par bande côte à côte, fratries centrées sous leurs parents et familles espacées (`placerLigne` : régression isotone, aucun chevauchement), rails des traits de descendance, successions sans lien de sang (pointillés). |
| `ArbreFamille.tsx` | SVG : cartes des membres (portrait si fiche liée, ♛ règne, ● fiche), lignée du membre choisi en évidence. |
| `Membre.tsx` | Panneau du membre : identité, dates, titre, rôle, notes, secrets MJ, liens, actions. |
| `Page.tsx` | Liste des dynasties et familles, création (personnage, peuple, vide). Cible `naviguer` : id de famille, id de personnage (arbre créé s'il manque) ou `peuple:<clé>` (dynastie créée). |

Année en cours : `anneeActuelle` du module Chronologie (horloge du temps de jeu dans le calendrier du peuple de l'arbre) ; générateurs, ajouts de proches, promotion (âge de la fiche) et cartes s'en servent. Cartes : nom, vie (« 1203 – 1265 (62 ans) » ou « né en 1230 (45 ans) »), puis règne ou titre.

Données : collection `familles` du contrat (membres légers ; `persoId` relie à une fiche).
API publique : `definition`, `familleDepuisPersonnage`, `dynastieDepuisCivilisation`, `separerTitre`, `ajouterFamille`, `familleDuPersonnage`, `civilisationDe`, `disposerFamille`.

« Montrer aux joueurs » (Cet arbre) : `arbreSvg` de l'arbre vu par les joueurs (membres cachés et secrets retirés), scène `svg` zoomable.
