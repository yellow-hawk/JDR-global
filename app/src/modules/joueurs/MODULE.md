# Module Joueurs (joueurs à distance)

État : **prêt**. Chaque PJ reçoit un lien personnel : l'écran de la table (le même que la tablette posée sur la table), sa fiche en lecture seule à jour en direct, ses notes (il les écrit, le MJ les lit) et les messages privés du MJ. Passe par le relais du serveur local (`lancer.bat`) et, pour Internet, par un tunnel Cloudflare (`cloudflared`, gratuit, sans compte) ouvert depuis la page.

| Fichier | Rôle |
|---|---|
| `logique.ts` | Pur, testé : `distantsDe` (`modules.joueurs.distants[persoId] = { jeton, messages }`), `avecJeton` (jeton secret de 16 caractères, nouveau lien), `ajouterMessage` / `retirerMessage`, `lienJoueur`, `persoDuJeton`, `notesJoueur` / `avecNotesJoueur` (`fiche.notesJoueur`), `ficheDuJoueur` (fiche d'impression, rien du MJ). |
| `Synchro.tsx` | En-tête (MJ, toujours actif) : salons privés (`definirJoueursPrives`), envoi de la fiche et des messages à l'arrivée d'un joueur et à chaque changement, notes reçues rangées dans la fiche ; indicateur 🌐 connectés / liens. |
| `Page.tsx` | Accès Internet (tunnel : ouvrir, fermer, adresse, installation de cloudflared), message à tous, par PJ : lien, connecté ou non, nouveau lien, messages privés (texte, image), ses notes. |

Écran du joueur : `interface/EcranDistant.tsx` (onglets Table, Ma fiche, Messages), choisi par `?joueur=<jeton>` dans l'adresse.
Confidentialité : un salon privé par joueur (`<salon>.<jeton>`) ; un joueur ne reçoit que ce qui lui est destiné.
