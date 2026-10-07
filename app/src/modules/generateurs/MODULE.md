# Module Générateurs

État : **prêt**. Improviser en séance : PNJ, taverne, boutique, butin.

| Fichier | Rôle |
|---|---|
| `logique.ts` | Pur, testé, déterministe (graine) : `contexteDe` (PNJ, lieux, peuples, quêtes et réserve de noms de la campagne), `genererPnj` + `pnjVersPersonnage` (stats selon le rôle, secrets en `mj`), `genererTaverne` (nom, ambiance, patron, carte avec prix, chambres, clients, événement, rumeurs tirées de la campagne), `genererBoutique` (6 sortes, objets et prix, raretés), `genererButin` (4 tranches de niveau : pièces, gemmes, objets d'art, objets magiques, valeur). Textes prêts : `menuTaverne`, `texteTaverne`, `etalBoutique`, `texteBoutique`, `texteButin`. |
| `donnees/*.json` | Toutes les listes (noms, plats, prix, objets, gemmes, rôles, secrets…). |
| `Page.tsx` | Onglets, « Relancer », « Garder » (PNJ avec avatar auto et sorts selon le rôle ; document caché dans Documents), « Montrer » (écran joueurs). |

API publique : `definition`, `genererPnj`, `genererTaverne`, `genererBoutique`, `genererButin`, `contexteDe`.
