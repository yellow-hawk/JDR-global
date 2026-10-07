import { useEffect, useRef } from 'react'
import { useCharacter } from '../store/useCharacter'

// Hook : applique les couleurs du store aux materiaux du modele charge.
//
// Principe (data-driven) : on ne connait AUCUN nom de materiau en dur. On lit la
// section 'materials' de species.json (roles -> noms reels), on retrouve le(s)
// materiau(x) correspondant(s) dans la scene chargee, et on applique la teinte.
//
// La couleur est une TEINTE MULTIPLICATIVE : dans Three.js, material.color
// multiplie la texture (map). Blanc (#ffffff) = neutre = texture d'origine intacte.
//
// 'forceOpaque' (par role, depuis le JSON) corrige les materiaux MPFB exportes en
// alphaMode=BLEND qui apparaissent transparents (ex: les yeux).

function asArray(v) {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}

export function useMaterials(root) {
  const speciesList = useCharacter((s) => s.speciesList)
  const speciesId = useCharacter((s) => s.speciesId)
  const colors = useCharacter((s) => s.colors)

  const species = speciesList.find((s) => s.id === speciesId)
  // Roles de couleur reels (on ignore les entrees de documentation _example).
  const roles = (species?.materials ?? []).filter((m) => !m._example)

  // roleId -> THREE.Material[] (rempli a l'indexation, relu a chaque teinte).
  const roleMatsRef = useRef({})

  // 1) INDEXATION + OPACITE : quand le modele (root) ou l'espece change.
  useEffect(() => {
    roleMatsRef.current = {}
    if (!root) return

    // Recense tous les materiaux de la scene par nom.
    const byName = new Map()
    root.traverse((obj) => {
      if (!obj.isMesh) return
      asArray(obj.material).forEach((mat) => {
        if (!mat?.name) return
        if (!byName.has(mat.name)) byName.set(mat.name, [])
        byName.get(mat.name).push(mat)
      })
    })

    roles.forEach((role) => {
      const found = []
      asArray(role.target).forEach((name) => {
        const mats = byName.get(name)
        if (mats) found.push(...mats)
      })
      roleMatsRef.current[role.id] = found

      // Correction opacite (ex: yeux MPFB exportes en BLEND).
      if (role.forceOpaque) {
        found.forEach((mat) => {
          mat.transparent = false
          mat.depthWrite = true
          mat.alphaTest = 0
          mat.needsUpdate = true
        })
      }
    })
    // roles depend de species ; on resync l'indexation a chaque changement de modele.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, speciesId])

  // 2) TEINTE : a chaque changement de couleur dans le store.
  useEffect(() => {
    roles.forEach((role) => {
      const hex = colors?.[role.id] ?? role.default ?? '#ffffff'
      ;(roleMatsRef.current[role.id] ?? []).forEach((mat) => {
        if (mat.color) mat.color.set(hex)
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors, speciesId])
}
