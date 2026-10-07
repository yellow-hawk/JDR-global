# JDR Global : mode d'emploi

## Lancer l'application

**Sans rien installer** : double-clic sur `lancer.bat`. Une fenêtre noire s'ouvre (c'est le petit serveur, la laisser ouverte) et le navigateur affiche l'application sur `http://localhost:8417`. Fermer la fenêtre noire arrête l'application.

**En ligne** : la même application sera publiée sur GitHub Pages (étape à venir).

> Tes campagnes sont enregistrées **dans le navigateur, pour une adresse donnée**. La version locale (`localhost:8417`), la version de développement (`localhost:5173`) et la version en ligne ont chacune leurs propres campagnes. Pour passer de l'une à l'autre : **Campagne → Exporter l'archive complète**, puis **Importer une archive** de l'autre côté.

## À la table

1. Clique sur **Écran joueurs** : une seconde fenêtre s'ouvre. Fais-la glisser sur la télé ou le second écran, puis double-clic dedans pour le plein écran.
2. Depuis une fiche, **Montrer aux joueurs** l'affiche sur cet écran. Les secrets du MJ ne partent jamais vers cette fenêtre.
3. **Aperçu joueurs** (en haut) te montre l'application comme la verraient les joueurs, sans rien pouvoir modifier.

## Les modules

| Module | Ce qu'on y fait |
|---|---|
| **Campagne** | Créer, ouvrir, exporter / importer une campagne (archive .zip complète ou joueurs). |
| **Journal** | Les quêtes (importées de l'Atlas ou écrites à la main) avec leur statut, leurs étapes et les secrets MJ ; le journal des séances (date réelle, date du monde, résumé). Tout peut être montré aux joueurs. |
| **Monde** | L'Atlas des ciels complet. « Ajouter le ciel affiché » range l'univers dans la campagne ; « Importer les PNJ des quêtes » crée les PNJ (secrets côté MJ, antagoniste caché) ; « Importer les quêtes » les range dans le Journal ; « Importer la carte du monde » l'envoie dans Cartes. « Nouveau monde fait main » : ta carte du monde (Inkarnate, format 2:1 conseillé) sur un globe, et tes peuples. |
| **Cartes** | Importer tes cartes (PNG, JPG, WebP, PDF). Ajouter une version MJ, caler l'échelle (2 clics + distance), poser des repères (un repère peut ouvrir une autre carte ou lancer une rencontre de combat), placer une carte dans une autre (monde → pays → ville), montrer aux joueurs. |
| **Personnages** | Fiches PJ / PNJ / ennemis, portrait, stats D&D 5e, secrets MJ, bouton vers l'avatar 3D. |
| **Avatar 3D** | Sculpter l'apparence d'un personnage ; « Enregistrer + utiliser comme portrait » met la vignette sur sa fiche et son jeton. |
| **Magie** | L'Atelier de tracé complet. Les PJ de la campagne y ont leurs signes, leur grimoire et leur calibrage. Le mode MJ est simplement le rôle MJ (plus de mot de passe). |
| **Combat** | La Table de combat (réécrite). Grille carrée ou hexagonale, jetons avec portraits, terrains (difficile, mur, eau, antimagie…), brouillard, initiative et actions, attaques, sorts avec gabarits et particules, dés, journal, annuler / rétablir (Ctrl+Z / Ctrl+Y). Placer des personnages, mettre une carte en fond (grille calée si l'échelle est réglée), ajouter des sorts de l'Atelier, enregistrer / charger des rencontres, reporter les PV et états dans les fiches, diffuser toute la carte sur l'écran joueurs. La table en cours est gardée d'une séance à l'autre. |
| **Pays** | Fiche de chaque peuple : gouvernement, souverain, population, époque, villes, relations, histoire, coutumes, croyances, calendrier et fêtes ; liens vers ses cartes, PNJ, quêtes, dynastie et institutions. Modifiable par le MJ. |
| **Généalogie** | Arbres généalogiques interactifs : famille d'un personnage ou dynastie d'un peuple (du fondateur au souverain actuel), ajout de parents, enfants, conjoints, frères et sœurs, « Étendre », création de la fiche personnage d'un membre. |
| **Réseau** | Toute la campagne en graphe : qui est lié à quoi, coloré par centralité ou par groupes, filtres et recherche. |
| **Organigrammes** | Institutions de chaque peuple selon son régime (postes occupés par les PNJ, postes à pourvoir), successions, quêtes, cartes emboîtées, personnages par peuple. |

## Secrets du MJ

Tout ce qui est dans un cadre violet « Réservé au MJ » est retiré de la vue joueurs, de l'écran joueurs et de l'archive joueurs. La case « entièrement caché aux joueurs » fait disparaître l'objet complet.

## Sauvegardes

Enregistrement automatique à chaque modification. Pense à exporter une archive de temps en temps (le navigateur peut effacer ses données si tu vides le cache).

## Pour le développement

Voir `CLAUDE.md`. Node.js requis : `npm install`, `npm run dev`, `npm test`, `npm run build`.
