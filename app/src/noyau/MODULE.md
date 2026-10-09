# Noyau

Socle partagé, sans interface et sans React. Cinq sous-modules, chacun avec son `index.ts` public.

## contrat/ : le format jdr-global (référence : `docs/format-jdr-global.md`)

| Fichier | Rôle |
|---|---|
| `types/` | Découpé par domaine (`base`, `monde`, `cartes`, `personnages`, `jeu`, `campagne`), réexporté par `types/index.ts`. Interfaces `Campagne` (dont `modules` : réglages par module), `Rencontre` (dont `table` : état de la Table v7), `Univers`, `Carte`, `Repere`, `Personnage`, `Sort`, `Rencontre`, `Quete`, `Seance`, `Fichier`, `Ref`. Constantes `FORMAT`, `VERSION`, `COLLECTIONS`. |
| `creer.ts` | `nouvelId(prefixe)`, `maintenant()`, `nouvelleCampagne`, `nouvelUnivers`, `nouvelleCarte`, `nouveauPersonnage`. |
| `charger.ts` | `chargerCampagne(json) → { campagne, alertes }` : migre, complète, répare ids, garde l'inconnu, signale les liens cassés. |
| `migrations.ts` | `MIGRATIONS[n]` : v n → v n+1 (vide en v1). |
| `references.ts` | `trouver(c, ref)`, `estRef`, `referencesCassees(c)`, `fichiersCites(v, horsMj)`, `parcourirRefs`. |
| `vueJoueurs.ts` | `sansSecrets(v)` (retire les clés `mj`, et les objets `mj.cache`), `vueJoueurs(c)` (idem + fichiers MJ seuls). |

## stockage/

| Fichier | Rôle |
|---|---|
| `idb.ts` | IndexedDB `jdr-global` : magasins `campagnes` (clé id), `fichiers` (clé `idCampagne/idFichier`, Blob), `reglages`. |
| `campagnes.ts` | `listerCampagnes`, `lireCampagne` (tolérant), `sauverCampagne` (majLe), `supprimerCampagne`, `ajouterFichier`, `lireFichier`, `ecrireFichier`, `supprimerFichier`, `fichiersStockes`, `lireReglage`, `ecrireReglage`. |
| `archive.ts` | `construireArchive(c, lire, { joueurs })` → zip `campagne.json` + `fichiers/<id>.<ext>` ; `lireArchive(octets)` (zip ou JSON seul) ; `nomArchive`. Pur, testable sous Node. |
| `navigateur.ts` | `telecharger(contenu, nom)`, `choisirFichier(accepte)`. |

## bus/

- Bus interne : `emettre(type, donnees)`, `ecouter(type, f) → stop`, `prendreCible(page)` (objet à ouvrir à l'arrivée, posé par `naviguer` avec `cible`). Catalogue typé dans `Evenements` (à compléter à chaque nouvel événement) : `naviguer`, `message`.
- Écran joueurs : `montrerAuxJoueurs(scene)` (filtre `sansSecrets`), `preparerDiffusion(nomCampagne)`, `recevoirScenes(f)`, `ouvrirEcranJoueurs()`.
- `Scene` : `vide` | `texte` | `personnage` (portrait Blob) | `image` (Blob). Canal `jdr-global/ecran-joueurs`.

## hasard/

`hashStr`, `mulberry32` (identiques à l'Atlas), `rngFor(graine, cle)`, `pick`, `shuffle`, `entier`.

## regles/

- `types.ts` : `SystemeRegles { id, nom, champs: ChampStat[], statsParDefaut, statsPourProfil(ProfilPnj), resume, initiative, degatsSort(puissance), versTable(stats), depuisTable(stats, jeton) }`. `ChampStat.publicEnnemi` = visible des joueurs pour un ennemi.
- `index.ts` : `regles(id)` (repli 5e), `listeRegles`, `enregistrerRegles`, `lireStat` / `ecrireStat` (chemin `carac.for`).
- `des.ts` : `lancer(formule, rng, critique)`, `d20(mode)`, `formuleValide`.
- `types.ts` (suite) : `SystemeAvecFiche` = `SystemeRegles` + `catalogue` (compétences, caracs, objets, alignements, langues, historiques, monnaies, `source`) + `calculer(p)` → `FicheCalculee` (niveau, maîtrise, caracs, sauvegardes, compétences, dérivés, attaques, `stats` à reporter) ; `aUneFiche(R)`.
- `dnd5e/fiche.ts` + `catalogue.json` (SRD 5.1, CC-BY 4.0 : 36 armes, 13 armures, équipement ; historiques maison) : `calculer`, `bonusMaitrise`, `niveauDe`, `effetsActifs`, `entreeCatalogue`.
- `dnd5e/` : système 5e (`mod`, `signe`) ; `profil.ts` + `archetypes.json` : stats d'un PNJ selon son rôle (archétype, niveau, caractéristiques ordonnées, ajustements de la description, PV, CA, dégâts, bonus d'attaque) ; sorts : 1 point de puissance = 1d6 (max 10d6), valeur moyenne appliquée en combat. Nouveau système = nouveau dossier + `enregistrerRegles`.

## Tests

`contrat.test.ts`, `stockage.test.ts` (fake-indexeddb), `bus/bus.test.ts`, `regles/regles.test.ts`.

## graphe/

Algorithmes purs de graphes et d'arbres (sans React) : `disposerForces` (Fruchterman–Reingold déterministe), `degres`, `intermediarite` (Brandes), `communautes` (propagation d'étiquettes), `disposerArbre` (arbre bien rangé, repli). Vues React : `src/interface/graphe/` (`VueGraphe`, `VueArbre`, `usePanZoom`, couleurs).

Contrat : collection `familles` (`Famille`, `MembreFamille`), `univers.civilisations` (`Civilisation` : fiche pays complète + calendrier + réserve de noms), `campagne.univers` (monde par défaut), `personnage.role`, `rencontre.quete`. Les modules peuvent fournir `preparerCampagne(c)` (appelé par la coquille à l'ouverture).

## Ajouts : dés partagés, écran joueurs, sauvegardes

- `regles/des.ts` : `jeter(formule, mode, rng, qui)` → `JetDes` (dés physiques, dé écarté de l'avantage / désavantage, modificateur, total) ; `texteJet`.
- `bus` : scène `document` (style parchemin / lettre / affiche / note) ; `annoncerJet(jet, cache)` (public : animé en 3D sur l'écran joueurs ; caché : historique MJ seulement), `historiqueJets`, `suivreJets` ; `montrerBandeau(texte | null)` ; côté écran : `recevoirEcran({ scene, jet, historique, bandeau })` (`recevoirScenes` reste).
- `stockage` : magasin `sauvegardes` (base v2) : `faireInstantane`, `listerInstantanes`, `lireInstantane`, `aGarder` (12 récents + 1 par jour sur 30 jours, pur, testé) ; `dossier.ts` : `choisirDossier`, `etatDossier`, `autoriserDossier`, `ecrireDansDossier` (File System Access, Chrome / Edge).
- `contrat` : `campagne.temps`, collections `evenements` et `documents`, `carte.brouillard`, `personnage.relations`, `civilisation.reputation`, `quete.reputation` (voir le format, § 14 et 15).
