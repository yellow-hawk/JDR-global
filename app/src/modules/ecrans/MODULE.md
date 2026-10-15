# Module Écrans (mur des écrans joueurs)

État : **prêt**. Page MJ : une copie de chaque écran joueurs ouvert, à sa vraie taille et sur l'onglet que le joueur
regarde, plus l'écran de la table ; et un test de la mise en page sur cinq tailles d'écran courantes.

| Fichier | Rôle |
|---|---|
| `Page.tsx` | Mur des copies (joueurs connectés : taille et onglet signalés par leur écran, `joueurs.suivreEcransJoueurs`) ; écran de la table (taille au choix) ; « Tester sur toutes les tailles ». |
| `Copie.tsx` | Cadre de la vraie taille, réduit ; adresse du joueur avec `&miroir=1` (la copie reçoit tout, n'envoie rien, ne compte pas comme appareil) ; suit l'onglet du joueur (`postMessage` `jdr-miroir`) ; contrôle de mise en page toutes les 4 s (`interface/miseEnPage`). |

Mode miroir : `noyau/bus` (`estMiroir`, bonjour `miroir`), `interface/EcranDistant` (signale `{ ecran: { onglet, l, h } }` au MJ, suit l'onglet en miroir), `interface/alerteJoueur` (muet en miroir).
