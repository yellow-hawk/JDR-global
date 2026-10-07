import React, { Suspense, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { useCharacter } from '../store/useCharacter'
import { useMaterials } from './useMaterials'
import { useMorphs } from './useMorphs'
import { useAssets } from './useAssets'
import PlaceholderMannequin from './PlaceholderMannequin'

// Charge le GLB de base de l'espece/genre courant, lu depuis species.json via le store.
//
// PLACEHOLDER ROBUSTE : si le chemin est absent, ou si le GLB echoue a charger
// (fichier manquant -> 404, ou fichier invalide), on retombe automatiquement sur
// le mannequin primitif. Le passage au vrai modele se fait juste en deposant
// base.glb au bon endroit : AUCUN changement de code requis ici.

// --- Chargement reel du GLB : suspend pendant le fetch, throw si echec. ---
function RealModel({ url }) {
  const { scene } = useGLTF(url)

  // ETAPE 1 — Inspection : logge tous les meshes et noms de materiaux du GLB.
  useEffect(() => {
    const meshes = []
    const materialNames = new Set()
    scene.traverse((obj) => {
      if (!obj.isMesh) return
      meshes.push(obj.name || '(sans nom)')
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      mats.forEach((m) => m?.name && materialNames.add(m.name))
    })
    console.group(`[AvatarModel] Inspection du GLB : ${url}`)
    console.log('Meshes (%d):', meshes.length, meshes)
    console.log('Materiaux (%d):', materialNames.size, [...materialNames])
    console.groupEnd()
  }, [scene, url])

  // Phase 1 — applique les teintes du store aux materiaux (data-driven).
  useMaterials(scene)
  // Phase 2 — applique les influences de morph du store (data-driven).
  useMorphs(scene)
  // Phase 3 — monte/demonte les assets poses sur le squelette (data-driven).
  useAssets(scene)

  return <primitive object={scene} />
}

// --- Frontiere d'erreur : capture l'echec de chargement et bascule sur le fallback. ---
class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) {
      console.warn(
        '[AvatarModel] GLB introuvable ou invalide — mannequin placeholder affiche.',
        error?.message ?? error,
      )
    }
  }

  componentDidUpdate(prevProps) {
    // Si la cible change (changement d'espece/genre), on retente un chargement.
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

export default function AvatarModel() {
  const speciesList = useCharacter((s) => s.speciesList)
  const speciesId = useCharacter((s) => s.speciesId)
  const gender = useCharacter((s) => s.gender)

  const species = speciesList.find((s) => s.id === speciesId)
  const url = species?.genders?.[gender]?.model ?? null

  const placeholder = <PlaceholderMannequin />

  return (
    <ModelErrorBoundary resetKey={url} fallback={placeholder}>
      <Suspense fallback={placeholder}>
        {url ? <RealModel url={url} /> : placeholder}
      </Suspense>
    </ModelErrorBoundary>
  )
}
