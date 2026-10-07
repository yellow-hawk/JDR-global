# Module Campagne

Page d'accueil de l'application. État : **prêt**.

| Fichier | Rôle |
|---|---|
| `definition.tsx` | `DefinitionModule` (id `campagne`, ne demande pas de campagne ouverte). |
| `Page.tsx` | Sans campagne : `Accueil`. Avec campagne : nom, système de règles, compteurs cliquables, notes MJ, exports, changer / supprimer. |
| `Accueil.tsx` | Liste des campagnes (IndexedDB), création, import. |
| `echanges.ts` | `exporterCampagne(c, joueurs)`, `importerCampagne()` (gère « déjà présente » : remplacer ou copie). |
| `campagne.css` | Classes `.camp-`. |

API publique (`index.ts`) : `definition`, `exporterCampagne`, `importerCampagne`.
Dépend de : `noyau/contrat`, `noyau/stockage`, `noyau/regles`, `noyau/bus`, `interface`.
Pas de logique pure propre (tout est dans le noyau) : pas de test dédié.

## Sauvegardes

`Sauvegardes.tsx` : exports, instantanés (Restaurer, Télécharger), dossier de l'ordinateur (choisir, réautoriser, sauvegarder maintenant). `EnTete.tsx` (`enTete`) : écrit l'archive du jour dans le dossier au plus toutes les 10 minutes si la campagne a changé. `echanges.ts` : `archiveDe`, `sauverDansDossier`.
