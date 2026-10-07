# Interface (coquille)

Assemble les modules. Ne contient aucune logique métier.

| Fichier | Rôle |
|---|---|
| `etat.tsx` | `FournisseurCampagne` + `useCampagne()` : `campagne` (complète), `vue` (filtrée en aperçu joueurs), `role`, `lectureSeule`, `alertes`, `enregistrement`, `modifier(f)` (sauvegarde auto 400 ms), `ouvrir`, `creer`, `installer` (import), `fermer`, `changerRole`. Rouvre la dernière campagne au démarrage. |
| `Coquille.tsx` | En-tête (campagne, Aperçu joueurs, Écran joueurs, thème auto/clair/sombre), menu, page courante. Navigation par adresse `#<idModule>` et événement `naviguer`. |
| `EcranJoueurs.tsx` | Fenêtre `?ecran=joueurs` : affiche les `Scene` reçues ; double-clic = plein écran. Ne lit jamais la campagne. |
| `registre.ts` | `MODULES` (ordre du menu), `moduleParId`. |
| `types.ts` | `DefinitionModule { id, nom, icone, etat, besoinCampagne, dansMenu, Page }`. |
| `composants.tsx` | `Icone`, `Champ`, `BlocMj`, `PageAVenir`, `Toasts`, `useUrlFichier(idCampagne, idFichier)`. |
| `styles.css` | Variables de thème (`--fond`, `--panneau`, `--encre`, `--accent`, `--mj`…), clair/sombre, classes communes (`.btn`, `.carte-ui`, `.champ`, `.bloc-mj`, `.ecran-…`). |

Règle : une page de module lit `vue` pour afficher et appelle `modifier()` pour changer ; en `lectureSeule`, rien n'est modifiable et les `BlocMj` ne s'affichent pas.
