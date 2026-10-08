# Chaîne Blender de l'avatar

Tout l'avatar humain (corps, morphs, coiffures, sourcils, cils, tenues) est **reconstruit par script** depuis MPFB (MakeHuman pour Blender) : aucune manipulation à la main, résultat reproductible.

## Prérequis

- Blender 5.x avec l'extension **MPFB** et les assets système MakeHuman (peaux, yeux, coiffures, sourcils, cils).
- Node.js (pour l'optimisation) : `cd blender && npm install`.

## Reconstruire

1. Dans Blender (console Python, ou via Claude Code et le MCP Blender) :
   ```python
   exec(open(r"D:\projet claude\projet JDR Global\blender\scripts\construire_avatar.py", encoding="utf-8").read())
   ```
   La scène courante est remplacée (rien n'est enregistré). Durée : environ 1 minute. GLB bruts dans `blender/export/` (ignoré par git).
2. Optimiser et mettre à jour l'application :
   ```bash
   cd blender && npm run tout
   ```
   `optimiser` : morphs creux, quantification, meshopt, textures WebP → `app/public/avatar/assets/species/human/` + `manifeste.json`.
   `species` : régénère `app/src/modules/avatar/createur/data/species.json` (rôles de morph, couleurs, emplacements) et vérifie que chaque morph existe.

## Configuration : `avatar.json`

| Section | Contenu |
|---|---|
| `humain` | squelette (`game_engine_with_breast`, 55 os), peau, yeux, dents, langue |
| `morphs` | `macro` (genre, âge, muscle, poids, stature, poitrine : réglages MakeHuman 0..1) ou `cible` (fichier `targets/…` de MPFB). Le nom devient le morph du GLB. |
| `assets` | coiffures, sourcils, cils MakeHuman (`.mhclo`), ajustés au corps par MPFB |
| `tenues` | vêtements découpés dans les aides du corps (`helper-tights`, `helper-skirt`) : os dominants, hauteurs, `dos`, `ecart` à la peau, `couche`, `drape`, `metal` |

## Principe : tout suit le corps

- Chaque morph est calculé comme un **delta** par rapport au corps neutre ; le même delta est calculé pour chaque asset (MPFB réajuste l'asset au corps déformé) et chaque tenue (sommets des aides MakeHuman, qui suivent toutes les cibles).
- Les assets sont exportés avec **le même squelette** : dans l'app, `useAssets` (mode `skinned`) relie leurs os à ceux du corps par nom, et `useMorphs` leur applique les mêmes influences.
- Textures des tenues : `scripts/textures_tenues.py` (tissu, cuir, mailles, métal, 512 px, couleur grise teintée par l'app + normal map), UV en projection cubique à l'échelle réelle.

## Ajouter…

- **un réglage** : un morph dans `avatar.json` (`macro` ou `cible`), puis un rôle dans `scripts/generer_species.cjs` (`r(...)` ou `paire(...)`), reconstruire.
- **une coiffure / des sourcils MakeHuman** : une ligne dans `assets` (`source` = dossier MPFB), un libellé dans `LIBELLES` de `generer_species.cjs`.
- **une tenue** : une entrée dans `tenues` ; sa couleur est celle de son emplacement.

`avatar-maitre.blend` : ancien fichier de travail (avant la chaîne scriptée), gardé pour mémoire.
