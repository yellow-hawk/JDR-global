# Module Réseau

État : **prêt**. La campagne vue comme un graphe : qui est lié à quoi.

| Fichier | Rôle |
|---|---|
| `sortes.json` | Sortes de nœuds (univers, peuples, PJ, PNJ, ennemis, quêtes, rencontres, cartes, villages, séances, sorts) : libellé, couleur, page à ouvrir, visible par défaut. |
| `logique.ts` | Pur, testé : `grapheDeCampagne(c, visibles?)` (liens : quête → personnages / lieux / rencontres, rencontre → carte / jetons, carte → carte parente / repères, personnage → peuple / sorts, peuples entre eux, parenté des familles, séances), `cibleDe(noeud)`. |
| `Page.tsx` | Filtres par sorte, recherche, couleur par centralité (intermédiarité), communauté (propagation d'étiquettes) ou sorte, taille selon le degré, nœuds déplaçables, voisinage en évidence, fiche du nœud avec « Ouvrir ». |

Algorithmes : `src/noyau/graphe/` (forces, mesures, arbres). Vue : `src/interface/graphe/VueGraphe.tsx`.
API publique : `definition`, `grapheDeCampagne`.

## Ajouts

Liens `rel:<sorte>` entre personnages (couleur et libellé : `apparenceLien`), « Lier à un autre personnage… » puis clic sur la cible (`PanneauRelation.tsx`), liste des relations du personnage choisi ; couleur « Réputation auprès des peuples ».
