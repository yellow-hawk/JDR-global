# JDR Global : mode d'emploi

## Lancer l'application

**Sans rien installer** : double-clic sur `lancer.bat`. Une fenêtre noire s'ouvre (c'est le petit serveur, la laisser ouverte) et le navigateur affiche l'application sur `http://localhost:8417`. Fermer la fenêtre noire arrête l'application.

**En ligne** : la même application sera publiée sur GitHub Pages (étape à venir).

> Tes campagnes sont enregistrées **dans le navigateur, pour une adresse donnée**. La version locale (`localhost:8417`), la version de développement (`localhost:5173`) et la version en ligne ont chacune leurs propres campagnes. Pour passer de l'une à l'autre : **Campagne → Exporter l'archive complète**, puis **Importer une archive** de l'autre côté.

## À la table

1. Clique sur **Écran joueurs** : une seconde fenêtre s'ouvre. Fais-la glisser sur la télé ou le second écran, puis double-clic dedans pour le plein écran.
2. Depuis une fiche, **Montrer aux joueurs** l'affiche sur cet écran. Les secrets du MJ ne partent jamais vers cette fenêtre.
3. **Aperçu joueurs** (en haut) te montre l'application comme la verraient les joueurs, sans rien pouvoir modifier.
4. **Dés** (en haut) : choisis d'abord Désavantage, Neutre ou Avantage, puis clique le dé. Le jet roule en 3D sur l'écran joueurs et le mode revient tout seul sur Neutre. « Jet caché » : le résultat reste chez toi.
5. La **date du monde** est en haut (clic : Chronologie, « +1 h » pour avancer). Elle peut aussi s'afficher sur l'écran joueurs.

## Les modules

| Module | Ce qu'on y fait |
|---|---|
| **Campagne** | Créer, ouvrir, exporter / importer une campagne (archive .zip complète ou joueurs). |
| **Journal** | Les quêtes (importées de l'Atlas ou écrites à la main) avec leur statut, leurs étapes, les secrets MJ et leurs effets sur la réputation ; le journal des séances (date réelle, date du monde, résumé) ; **Préparer la séance** (tout ce qui compte pour la prochaine séance, à cocher) et « Démarrer la séance ». Tout peut être montré aux joueurs. |
| **Chronologie** | L'horloge du temps de jeu (calendrier d'un peuple, heures, lunes, fêtes à venir, avances +1 h… +1 mois) et la frise : histoire des peuples, séances, événements notés. |
| **Documents** | Lettres, affiches, notes, images à préparer ; « Montrer aux joueurs » les affiche sur l'écran joueurs avec leur habillage. Invisibles des joueurs tant qu'ils n'ont pas été montrés. |
| **Générateurs** | PNJ, taverne (carte et prix, rumeurs tirées de ta campagne), boutique, butin, en un clic ; « Garder » crée le PNJ (stats, sorts, avatar) et range la fiche dans Documents. |
| **Monde** | L'Atlas des ciels complet. « Ajouter le ciel affiché » range l'univers dans la campagne ; « Importer les PNJ des quêtes » crée les PNJ (secrets côté MJ, antagoniste caché) ; « Importer les quêtes » les range dans le Journal ; « Importer la carte du monde » l'envoie dans Cartes. « Nouveau monde fait main » : ta carte du monde (Inkarnate, format 2:1 conseillé) sur un globe, et tes peuples. |
| **Cartes** | Importer tes cartes (PNG, JPG, WebP, PDF). Ajouter une version MJ, caler l'échelle (2 clics + distance), poser des repères (un repère peut ouvrir une autre carte ou lancer une rencontre de combat), placer une carte dans une autre (monde → pays → ville), **brouillard** (dévoiler au pinceau, écran joueurs en direct), montrer aux joueurs. |
| **Personnages** | Fiches PJ / PNJ / ennemis, portrait, stats D&D 5e, relations (allié, rival, dette…, secrètes possibles), secrets MJ, bouton vers l'avatar 3D. |
| **Avatar 3D** | Sculpter l'apparence d'un personnage ; « Enregistrer + utiliser comme portrait » met la vignette sur sa fiche et son jeton. |
| **Magie** | L'Atelier de tracé complet. Les PJ de la campagne y ont leurs signes, leur grimoire et leur calibrage. Le mode MJ est simplement le rôle MJ (plus de mot de passe). |
| **Combat** | La Table de combat (réécrite). Grille carrée ou hexagonale, jetons avec portraits, terrains (difficile, mur, eau, antimagie…), brouillard, initiative et actions, attaques, sorts avec gabarits et particules, dés, journal, annuler / rétablir (Ctrl+Z / Ctrl+Y). Placer des personnages, mettre une carte en fond (grille calée si l'échelle est réglée), ajouter des sorts de l'Atelier, enregistrer / charger des rencontres, reporter les PV et états dans les fiches, diffuser toute la carte sur l'écran joueurs. La table en cours est gardée d'une séance à l'autre. |
| **Pays** | Fiche de chaque peuple : gouvernement, souverain, population, époque, villes, relations, histoire, coutumes, croyances, calendrier et fêtes, **réputation** du groupe ; liens vers ses cartes, PNJ, quêtes, dynastie et institutions. Modifiable par le MJ. |
| **Généalogie** | Arbres généalogiques interactifs : famille d'un personnage ou dynastie d'un peuple (du fondateur au souverain actuel), ajout de parents, enfants, conjoints, frères et sœurs, « Étendre », création de la fiche personnage d'un membre. |
| **Réseau** | Toute la campagne en graphe : qui est lié à quoi, coloré par centralité, par groupes ou par réputation, filtres et recherche ; « Lier à un autre personnage » crée une relation. |
| **Organigrammes** | Institutions de chaque peuple selon son régime (postes occupés par les PNJ, postes à pourvoir), successions, quêtes, cartes emboîtées, personnages par peuple. |

## Secrets du MJ

Tout ce qui est dans un cadre violet « Réservé au MJ » est retiré de la vue joueurs, de l'écran joueurs et de l'archive joueurs. La case « entièrement caché aux joueurs » fait disparaître l'objet complet.

## Sauvegardes

Enregistrement automatique à chaque modification, plus un **instantané** à l'ouverture et toutes les 10 minutes de travail (Campagne → Sauvegardes → Restaurer). Pour une copie hors du navigateur : **Choisir un dossier** (par exemple `sauvegardes` dans le dossier du projet) ; l'archive complète du jour y est écrite automatiquement (Chrome ou Edge). Après un redémarrage du navigateur, clique « Réautoriser la sauvegarde » en haut.

## Pour le développement

Voir `CLAUDE.md`. Node.js requis : `npm install`, `npm run dev`, `npm test`, `npm run build`.
