# Module Joueurs (joueurs à distance)

État : **prêt**. Chaque PJ reçoit un lien personnel : l'écran de la table (le même que la tablette posée sur la table), sa fiche en lecture seule à jour en direct, ses notes (il les écrit, le MJ les lit) et les messages privés du MJ. Passe par le relais du serveur local (`lancer.bat`) et, pour Internet, par un tunnel Cloudflare (`cloudflared`, gratuit, sans compte) ouvert depuis la page.

| Fichier | Rôle |
|---|---|
| `logique.ts` | Pur, testé : `distantsDe` (`modules.joueurs.distants[persoId] = { jeton, messages }`), `avecJeton` (jeton secret de 16 caractères, nouveau lien), `ajouterMessage` (`de: 'joueur'` pour un message du joueur) / `retirerMessage`, `nonLusMj` / `marquerLusMj`, `lienJoueur`, `persoDuJeton`, `notesJoueur` / `avecNotesJoueur` (`fiche.notesJoueur`), `ficheDuJoueur` (fiche d'impression, rien du MJ). |
| `Synchro.tsx` | En-tête (MJ, toujours actif) : salons privés (`definirJoueursPrives`), envoi de la fiche et des messages à l'arrivée d'un joueur et à chaque changement, notes reçues rangées dans la fiche ; indicateur 🌐 connectés / liens. |
| `Page.tsx` | Accès Internet (tunnel : ouvrir, fermer, adresse, installation de cloudflared), message à tous, par PJ : lien, connecté ou non, nouveau lien, messages privés (texte, image), ses notes. |

Écran du joueur : `interface/EcranDistant.tsx` (onglets Table, Ma fiche, Messages : il peut écrire au MJ), choisi par `?joueur=<jeton>` dans l'adresse. Le MJ envoie aussi `persoId` : la Table de combat sait quel PJ ce joueur peut jouer.
API (`index.ts`) : `definition`, `distantsDe`, `persoDuJeton` (pour la Table de combat).
Arbre de talents (`logique.ts`) : `droitsTalents` / `avecDroitsTalents` (`modules.joueurs.talents`, défaut : développer oui, oublier non), `talentsDuJoueur` (progression seule + arbres + points par niveau), `avecTalentDemande` (règles de `noyau/talents`). Synchro envoie `talents` et applique `{ talents: { faire, id } }`.
Entraînement à la magie (`logique.ts`) : `droitsEntrainement` / `avecDroitsEntrainement` (`modules.joueurs.entrainement`), `entrainementActif` / `avecEntrainement` (par PJ), `avecEntrainementRecu` (carnet renvoyé → `personnage.magie`, via `magie.appliquerEntrainement`). Synchro envoie `entrainement: { profil, droits }` ; l'écran du joueur affiche la vue `entrainement` de la Magie dans l'onglet Entraînement.
Confidentialité : un salon privé par joueur (`<salon>.<jeton>`) ; un joueur ne reçoit que ce qui lui est destiné.

Actions des joueurs (`actions.ts`, pur, testé) : jets (`jetsDeLaFiche`, `formuleDuJoueur` : bonus toujours recalculé ici, `demanderJet` / `retirerDemandeJet`, `verdict`), sac (`inventaireDuJoueur` sans secrets, `avecInventaireDemande` : équiper, donner un objet, de l'argent ; `droitsInventaire`), journal du groupe (`avecEntreeGroupe`, `avecEntreeModifiee`), niveau (`avecDemandeNiveau`, `trancherNiveau`).
`prive.ts` : `donneesDuJoueur` (tout ce qui part sur l'écran du joueur, une clé par onglet, plus `alerte` et `badges`) et `traiterRetour` (ce qu'il renvoie). Vues de l'écran du joueur : `vues/Des.tsx`, `vues/Sac.tsx`, `vues/Groupe.tsx`. MJ : `PanneauxMj.tsx` (réglages, demander un jet, journal du groupe, niveau à valider).
