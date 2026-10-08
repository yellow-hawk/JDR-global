import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { clone as cloneSquelette } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { useCharacter } from '../store/useCharacter'
import { lirePlages, masquerCorps } from './masqueCorps'

// Hook : monte/demonte les assets (coiffures, sourcils, cils, vetements) sur le
// modele de base, selon les selections du store.
//
// Data-driven : on ne connait AUCUN chemin ni nom de bone en dur. On lit la
// section 'assetSlots' de species.json (slot -> attachMode, attachBone, options).
//
// Approche : chargement IMPERATIF (GLTFLoader) plutot que le hook useGLTF, car les
// URLs sont dynamiques et conditionnelles par slot (les Rules of Hooks interdisent
// d'appeler useGLTF dans une boucle a longueur variable). Le chargement est async
// avec garde d'annulation : le reste de la scene s'affiche immediatement, l'asset
// apparait quand il est pret — pas de Suspense bloquant, pas de flash ni de crash.
//
// attachMode :
//  - "skinned" (JDR Global, 08/10) : l'asset est exporte avec le meme squelette que le
//    corps et les MEMES morphs (blender/scripts/construire_avatar.py). Ses SkinnedMesh
//    sont relies aux os du corps (par nom) : il suit la morphologie et, plus tard, les poses.
//  - "head-bone" : le mesh (non skinne) est attache au bone via bone.attach(), qui
//    PRESERVE la transform monde (l'asset est deja au bon endroit dans son
//    referentiel) — aucun repositionnement manuel. Ne suit pas les morphs.
//
// Renvoie un numero de version, incremente a chaque asset attache ou retire : useMorphs et
// useMaterials s'en servent pour reindexer les nouveaux meshes.

// Cache module : url -> Promise<Group template> (parse une seule fois par fichier).
// Les GLB sont compresses (meshopt + textures WebP) : le decodeur meshopt est obligatoire.
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
const templateCache = new Map()

// Chargements en cours (tous visualiseurs confondus) : la fabrique de portraits attend 0.
let enCours = 0
export const chargementsEnCours = () => enCours

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
// SkeletonUtils.clone garde les SkinnedMesh relies a leurs os clones.
function ownClone(template) {
  const instance = cloneSquelette(template)
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

// Relie chaque SkinnedMesh de l'asset aux os du corps portant le meme nom.
// Les boneInverses de l'asset sont conserves : asset et corps partagent la pose de repos.
// Renvoie un Group contenant les meshes relies (a ajouter sous la racine du corps), ou null.
function relierAuSquelette(baseRoot, instance, slotId) {
  const osDuCorps = new Map()
  baseRoot.traverse((o) => { if (o.isBone) osDuCorps.set(o.name, o) })
  const meshes = []
  instance.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o) })
  if (!meshes.length) {
    console.warn(`[useAssets] slot "${slotId}" : aucun SkinnedMesh dans l'asset (attachMode "skinned").`)
    return null
  }
  const groupe = new THREE.Group()
  for (const mesh of meshes) {
    const os = mesh.skeleton.bones.map((b) => osDuCorps.get(b.name))
    const manquant = mesh.skeleton.bones.find((b, i) => !os[i])
    if (manquant) {
      console.warn(`[useAssets] slot "${slotId}" : os "${manquant.name}" absent du corps (mesh ignore).`)
      continue
    }
    mesh.removeFromParent()
    mesh.bind(new THREE.Skeleton(os, mesh.skeleton.boneInverses), mesh.bindMatrix)
    mesh.frustumCulled = false // la boite englobante de repos ne suit pas les morphs
    groupe.add(mesh)
  }
  return groupe.children.length ? groupe : null
}

export function useAssets(baseRoot) {
  const speciesList = useCharacter((s) => s.speciesList)
  const speciesId = useCharacter((s) => s.speciesId)
  const assets = useCharacter((s) => s.assets)
  const [version, setVersion] = useState(0)

  const species = speciesList.find((s) => s.id === speciesId)
  const slots = (species?.assetSlots ?? []).filter((sl) => !sl._example)

  // slotId -> Object3D actuellement attache (avec __file pour deduplication).
  const attachedRef = useRef({})

  useEffect(() => {
    if (!baseRoot) return
    let cancelled = false
    const changer = () => setVersion((v) => v + 1)

    // Emplacements caches par une option portee (option.masque, ex. capuche -> coiffure).
    const masques = new Set()
    slots.forEach((sl) => {
      const o = (sl.options ?? []).find((x) => x.id === (assets?.[sl.id] ?? null))
      ;(o?.masque ?? []).forEach((m) => masques.add(m))
    })

    slots.forEach((slot) => {
      const selectedId = assets?.[slot.id] ?? null
      const option = (slot.options ?? []).find((o) => o.id === selectedId) ?? null
      const file = masques.has(slot.id) ? null : option?.file ?? null
      const current = attachedRef.current[slot.id]

      // Rien a faire si l'asset attache correspond deja au fichier voulu.
      if ((current?.__file ?? null) === file) return

      // 1) Detacher + disposer l'ancien (pas d'empilement, pas de fuite).
      if (current) {
        current.removeFromParent()
        disposeInstance(current)
        delete attachedRef.current[slot.id]
        changer()
      }

      // 2) "Aucun" / pas de fichier -> rien a attacher.
      if (!file) return

      // 3) Mode d'attache.
      const mode = slot.attachMode
      if (mode !== 'skinned' && mode !== 'head-bone') {
        console.warn(`[useAssets] slot "${slot.id}" : attachMode "${mode}" inconnu (asset ignore).`)
        return
      }
      const bone = mode === 'head-bone' ? findBone(baseRoot, slot.attachBone) : null
      if (mode === 'head-bone' && !bone) {
        console.warn(`[useAssets] slot "${slot.id}" : bone "${slot.attachBone}" introuvable dans le squelette.`)
        return
      }

      // 4) Charger (async) puis attacher.
      enCours++
      loadTemplate(file)
        .then((template) => {
          if (cancelled) return
          // La selection a-t-elle change pendant le chargement ?
          if ((useCharacter.getState().assets?.[slot.id] ?? null) !== selectedId) return
          // Deja attache le bon fichier ? (course possible)
          if ((attachedRef.current[slot.id]?.__file ?? null) === file) return

          const instance = ownClone(template)
          const attache = mode === 'skinned' ? relierAuSquelette(baseRoot, instance, slot.id) : instance
          if (!attache) return
          attache.name = `asset:${slot.id}:${selectedId}`
          attache.__file = file
          if (mode === 'skinned') baseRoot.add(attache)
          else bone.attach(attache) // preserve la position monde de l'asset
          attachedRef.current[slot.id] = attache
          changer()
        })
        .catch((err) => {
          if (!cancelled) {
            console.error(`[useAssets] echec de chargement "${file}" :`, err?.message ?? err)
          }
        })
        .finally(() => { enCours-- })
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseRoot, speciesId, assets])

  // Peau cachee sous les assets portes (option.cacheCorps), recalculee a chaque changement.
  useEffect(() => {
    if (!baseRoot) return
    const caches = new Set()
    slots.forEach((slot) => {
      const o = (slot.options ?? []).find((x) => x.id === (assets?.[slot.id] ?? null))
      if (o?.cacheCorps && attachedRef.current[slot.id]) lirePlages(o.cacheCorps).forEach((i) => caches.add(i))
    })
    masquerCorps(baseRoot, caches)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseRoot, assets, version])

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

  return version
}
