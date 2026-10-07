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

## Ajouts

- `des/` : `PlateauDes` (mode Désavantage / Neutre / Avantage choisi avant le dé, retour à Neutre après chaque jet, formule libre, jet caché, historique), `BoutonDes` (en-tête, MJ), `Des3D` (écran joueurs, chargé à la demande : d4, d6, d8, d10, d12, d20, d100 = deux d10 ; les dés roulent et s'arrêtent face à la caméra sur leur valeur ; total affiché), `geometrie.ts` (polyèdres, numéros, orientation finale).
- `EcranJoueurs` : scène `document`, jets 3D, historique des jets, bandeau (date du monde).
- `DefinitionModule.enTete` : petit composant d'un module affiché dans l'en-tête (Chronologie : horloge ; Campagne : sauvegarde dans le dossier).
- `etat.tsx` : instantané à l'ouverture et toutes les 10 minutes de travail ; `restaurer(idInstantane)`.
