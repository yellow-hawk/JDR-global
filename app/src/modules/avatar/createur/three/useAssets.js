import { useEffect, useRef } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useCharacter } from '../store/useCharacter'

// Hook : monte/demonte les assets "poses" (coiffures, sourcils, cils) sur le
// squelette du modele de base, selon les selections du store.
//
// Data-driven : on ne connait AUCUN chemin ni nom de bone en dur. On lit la
// section 'assetSlots' de species.json (slot -> attachBone, attachMode, options).
//
// Approche : chargement IMPERATIF (GLTFLoader) plutot que le hook useGLTF, car les
// URLs sont dynamiques et conditionnelles par slot (les Rules of Hooks interdisent
// d'appeler useGLTF dans une boucle a longueur variable). Le chargement est async
// avec garde d'annulation : le reste de la scene s'affiche immediatement, l'asset
// apparait quand il est pret — pas de Suspense bloquant, pas de flash ni de crash.
//
// attachMode :
//  - "head-bone" : le mesh (non skinne) est attache au bone via bone.attach(), qui
//    PRESERVE la transform monde (l'asset est deja au bon endroit dans son
//    referentiel) — aucun repositionnement manuel.
//  - "skinned" : reserve au futur (assets rigges) -> warning, non implemente.

// Cache module : url -> Promise<Group template> (parse une seule fois par fichier).
const loader = new GLTFLoader()
const templateCache = new Map()

function loadTemplate(url) {
  if (!templateCache.has(url)) {
    templateCache.set(
      url,
      new Promise((resolve, reject) => {
        loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject)
      }),
    )
  }
  return templateCache.get(url)
}

// Clone profond qui POSSEDE ses geometries/materiaux (pour pouvoir les disposer
// sans corrompre le template en cache). Les textures restent partagees avec le
// cache (bornees, non disposees) -> pas de fuite, pas de re-decodage.
function ownClone(template) {
  const instance = template.clone(true)
  instance.traverse((o) => {
    if (!o.isMesh) return
    o.geometry = o.geometry.clone()
    o.material = Array.isArray(o.material)
      ? o.material.map((m) => m.clone())
      : o.material.clone()
  })
  return instance
}

function disposeInstance(obj) {
  obj.traverse((o) => {
    if (!o.isMesh) return
    o.geometry?.dispose?.()
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    mats.forEach((m) => m?.dispose?.()) // textures partagees avec le cache : non disposees
  })
}

function findBone(root, name) {
  let found = null
  root.traverse((o) => {
    if (found) return
    if (o.isBone && o.name === name) found = o
  })
  if (!found) {
    // Repli : n'importe quel objet portant ce nom.
    root.traverse((o) => {
      if (!found && o.name === name) found = o
    })
  }
  return found
}

export function useAssets(baseRoot) {
  const speciesList = useCharacter((s) => s.speciesList)
  const speciesId = useCharacter((s) => s.speciesId)
  const assets = useCharacter((s) => s.assets)

  const species = speciesList.find((s) => s.id === speciesId)
  const slots = (species?.assetSlots ?? []).filter((sl) => !sl._example)

  // slotId -> Object3D actuellement attache (avec __file pour deduplication).
  const attachedRef = useRef({})

  useEffect(() => {
    if (!baseRoot) return
    let cancelled = false

    slots.forEach((slot) => {
      const selectedId = assets?.[slot.id] ?? null
      const option = (slot.options ?? []).find((o) => o.id === selectedId) ?? null
      const file = option?.file ?? null
      const current = attachedRef.current[slot.id]

      // Rien a faire si l'asset attache correspond deja au fichier voulu.
      if ((current?.__file ?? null) === file) return

      // 1) Detacher + disposer l'ancien (pas d'empilement, pas de fuite).
      if (current) {
        current.removeFromParent()
        disposeInstance(current)
        delete attachedRef.current[slot.id]
      }

      // 2) "Aucun" / pas de fichier -> rien a attacher.
      if (!file) return

      // 3) Mode d'attache.
      if (slot.attachMode === 'skinned') {
        console.warn(
          `[useAssets] slot "${slot.id}" : attachMode "skinned" non supporte pour l'instant (asset ignore).`,
        )
        return
      }
      if (slot.attachMode !== 'head-bone') {
        console.warn(
          `[useAssets] slot "${slot.id}" : attachMode "${slot.attachMode}" inconnu (asset ignore).`,
        )
        return
      }

      // 4) Retrouver le bone d'attache dans le squelette du base.
      const bone = findBone(baseRoot, slot.attachBone)
      if (!bone) {
        console.warn(
          `[useAssets] slot "${slot.id}" : bone "${slot.attachBone}" introuvable dans le squelette.`,
        )
        return
      }

      // 5) Charger (async) puis attacher en preservant la transform monde.
      loadTemplate(file)
        .then((template) => {
          if (cancelled) return
          // La selection a-t-elle change pendant le chargement ?
          if ((useCharacter.getState().assets?.[slot.id] ?? null) !== selectedId) return
          // Deja attache le bon fichier ? (course possible)
          if ((attachedRef.current[slot.id]?.__file ?? null) === file) return

          const instance = ownClone(template)
          instance.name = `asset:${slot.id}:${selectedId}`
          instance.__file = file
          bone.attach(instance) // preserve la position monde de l'asset
          attachedRef.current[slot.id] = instance
        })
        .catch((err) => {
          if (!cancelled) {
            console.error(`[useAssets] echec de chargement "${file}" :`, err?.message ?? err)
          }
        })
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseRoot, speciesId, assets])

  // Nettoyage complet quand le modele de base change/se demonte.
  useEffect(() => {
    const attached = attachedRef.current
    return () => {
      Object.values(attached).forEach((obj) => {
        obj.removeFromParent()
        disposeInstance(obj)
      })
      attachedRef.current = {}
    }
  }, [baseRoot])
}
