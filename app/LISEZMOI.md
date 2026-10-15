# JDR Global : mode d'emploi

## Lancer l'application

**Sans rien installer** : double-clic sur `lancer.bat`. Une fenêtre noire s'ouvre (c'est le petit serveur, la laisser ouverte) et le navigateur affiche l'application sur `http://localhost:8417`. Fermer la fenêtre noire arrête l'application.

**Avec Node.js installé** (https://nodejs.org), `lancer.bat` démarre un serveur qui relaie aussi l'écran joueurs vers **les tablettes et autres appareils du même Wi-Fi**. La première fois, Windows demande d'autoriser Node.js dans le pare-feu : accepter pour les réseaux privés.

Si le port 8417 est déjà pris par un autre programme (Steam en prend parfois un), le serveur en choisit un autre (8427, 8437…), le dit dans la fenêtre noire et **le garde** aux lancements suivants (fichier `port-local.txt`). Les campagnes étant rangées par adresse, celles de l'ancienne adresse se récupèrent par **Exporter l'archive complète** puis **Importer**. En cas d'erreur, la fenêtre noire reste ouverte pour qu'on puisse lire le message.

**En ligne** : la même application sera publiée sur GitHub Pages (étape à venir).

> Tes campagnes sont enregistrées **dans le navigateur, pour une adresse donnée**. La version locale (`localhost:8417`), la version de développement (`localhost:5173`) et la version en ligne ont chacune leurs propres campagnes. Pour passer de l'une à l'autre : **Campagne → Exporter l'archive complète**, puis **Importer une archive** de l'autre côté.

## À la table

1. Clique sur **Écran joueurs** : une seconde fenêtre s'ouvre. Fais-la glisser sur la télé ou le second écran, puis double-clic dedans pour le plein écran.
2. Depuis une fiche, **Montrer aux joueurs** l'affiche sur cet écran. Les secrets du MJ ne partent jamais vers cette fenêtre.
3. **Aperçu joueurs** (en haut) te montre l'application comme la verraient les joueurs, sans rien pouvoir modifier.
4. **Dés** (en haut) : choisis d'abord Désavantage, Neutre ou Avantage, puis clique le dé. Le jet roule en 3D sur l'écran joueurs et le mode revient tout seul sur Neutre. « Jet caché » : le résultat reste chez toi.
5. La **date du monde** est en haut (clic : Chronologie, « +1 h » pour avancer). Elle peut aussi s'afficher sur l'écran joueurs.
6. **Tablette** : bouton 📱 en haut → « Ouvrir le salon » → scanner le QR code avec la tablette (même Wi-Fi), puis « Plein écran ». La tablette devient un écran joueurs tactile : zoom au doigt sur les cartes et les arbres, tracé des sceaux de l'Atelier, visée des sorts et déplacements en combat. Le salon se rouvre tout seul au prochain lancement.
7. **Faire agir les joueurs** : en combat, choisis le jeton puis, dans son détail, « Faire agir … » : viser un sort de la table, se déplacer, ou tracer un sceau (chrono choisi par le MJ, qui part au premier trait ; l'effet 3D s'affiche, puis le sort se vise sur la table). Les joueurs touchent la carte, l'aperçu s'affiche chez toi en direct, « Valider » joue l'action (Ctrl+Z pour annuler).
8. **Montrer aux joueurs** existe aussi pour les arbres généalogiques et dynasties (Généalogie → « Cet arbre »), les organigrammes, et la fiche d'un pays (Pays → « Montrer aux joueurs… » : coche ce que les joueurs savent).
9. **Joueurs à distance** (chez eux, autre Wi-Fi) : page **Joueurs** → « Créer son lien personnel » pour chaque PJ → « Ouvrir l'accès Internet » (la première fois : installer cloudflared, `winget install --id Cloudflare.cloudflared`) → « Copier le lien » et l'envoyer au joueur. Il voit l'écran de la table, sa fiche (avec ses notes) et tes messages privés, et peut t'écrire. En combat, à son tour, il joue depuis son écran : se déplacer, attaquer, lancer un sort, tracer un sceau (lui seul et toi voyez le tracé), finir son tour. Tu vois tout en direct et peux annuler avec Ctrl+Z. Il a aussi des onglets **Dés** (ses jets ; tu peux lui demander un jet avec un DD secret depuis la page Joueurs), **Sac** (s'équiper, donner à un compagnon), **Groupe** (journal commun) et **Niveau** quand il peut monter (tu valides). Une alerte sonne quand c'est son tour. Sur une carte montrée, la table peut poser des repères et dessiner. La page **Écrans** montre une copie de chaque écran de joueur (taille réelle, même onglet) et vérifie la mise en page ; le bouton **🎲** de l'en-tête affiche les jets des joueurs. Le bouton **🎬** de l'en-tête prépare le programme de la séance (cartes, personnages, documents, quêtes, peuples) : « ▶ » ou Alt+N montre le suivant. Il a un onglet **Talents** pour explorer son arbre et dépenser ses points (tu peux l'interdire dans la page Joueurs). Si son personnage trace des sorts, il a aussi un onglet **Entraînement** (tracé libre, leçons, défis, calibrage de sa main) ; dans la page Joueurs, tu choisis si une leçon réussie lui apprend le signe et s'il peut changer son grimoire. L'adresse change à chaque ouverture : renvoie les liens à chaque séance, et ferme l'accès à la fin.
10. **Écran d'attente** : « ⏸ Attente » ou Alt+A ; « ↩ Reprendre » ou Alt+A à nouveau pour revenir.

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
