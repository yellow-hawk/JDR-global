import { useEffect, useRef } from 'react'
import { useCharacter } from '../store/useCharacter'

// Hook : applique les influences de morph du store au modele charge.
//
// Data-driven : on ne connait AUCUN nom de morph en dur. On lit la section
// 'morphTargets' de species.json (roles -> cibles reelles), on retrouve chaque
// cible via mesh.morphTargetDictionary, et on ecrit sur mesh.morphTargetInfluences.
//
// Comportement :
//  - Mode symetrique (defaut) : la valeur d'un role est ecrite sur TOUTES ses
//    cibles (les deux cotes d'une paire L/R bougent ensemble).
//  - Mode asymetrie : pour les roles a paire, la valeur gauche pilote pair.left
//    et la valeur droite pilote pair.right, independamment.
//
// IMPORTANT : seules les cibles listees dans species.json sont touchees. Tout
// morph non mappe (macros MakeHuman, etc.) garde son influence par defaut.
//
// Une cible est soit un nom de morph (valeur ecrite telle quelle, eventuellement
// negative), soit { neg, pos } (bipolaire) : valeur < 0 -> 'neg' recoit |v| et 'pos' 0,
// valeur > 0 -> l'inverse. Les assets "skinned" portent les memes noms de morph : ils
// sont indexes a chaque nouvelle 'version' (asset attache ou retire, voir useAssets).

function asArray(v) {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}

export function useMorphs(root, version = 0) {
  const speciesList = useCharacter((s) => s.speciesList)
  const speciesId = useCharacter((s) => s.speciesId)
  const morphs = useCharacter((s) => s.morphs)
  const morphsLR = useCharacter((s) => s.morphsLR)
  const asymmetry = useCharacter((s) => s.asymmetry)

  const species = speciesList.find((s) => s.id === speciesId)
  const roles = (species?.morphTargets ?? []).filter((m) => !m._example)

  // nom de cible -> [{ mesh, index }] (une meme cible peut exister sur plusieurs meshes)
  const targetIndexRef = useRef({})

  // 1) INDEXATION : quand le modele (root) ou l'espece change.
  useEffect(() => {
    const index = {}
    if (root) {
      root.traverse((obj) => {
        if (!obj.isMesh || !obj.morphTargetDictionary || !obj.morphTargetInfluences) return
        for (const [name, idx] of Object.entries(obj.morphTargetDictionary)) {
          if (!index[name]) index[name] = []
          index[name].push({ mesh: obj, index: idx })
        }
      })
    }
    targetIndexRef.current = index
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, speciesId, version])

  // 2) APPLICATION : a chaque changement d'influence dans le store.
  useEffect(() => {
    const index = targetIndexRef.current
    const ecrire = (name, value) => {
      ;(index[name] ?? []).forEach(({ mesh, index: i }) => {
        mesh.morphTargetInfluences[i] = value
      })
    }
    const apply = (cible, value) => {
      if (cible == null) return
      if (typeof cible === 'string') return ecrire(cible, value)
      ecrire(cible.neg, Math.max(0, -value))
      ecrire(cible.pos, Math.max(0, value))
    }

    roles.forEach((role) => {
      if (asymmetry && role.pair) {
        const lr = morphsLR[role.id] ?? {}
        apply(role.pair.left, lr.left ?? role.default ?? 0)
        apply(role.pair.right, lr.right ?? role.default ?? 0)
      } else {
        const v = morphs[role.id] ?? role.default ?? 0
        asArray(role.targets).forEach((cible) => apply(cible, v))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, morphs, morphsLR, asymmetry, speciesId, version])
}
