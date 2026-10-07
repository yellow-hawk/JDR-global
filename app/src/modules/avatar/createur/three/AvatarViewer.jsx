import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import AvatarModel from './AvatarModel'
import { registerThree } from './snapshot'

// Le <Canvas> R3F : camera, lumieres, sol/grille et controles d'orbite.
// Eclairage manuel (pas d'Environment HDR) pour rester 100% hors-ligne et fiable.

// Enregistre le renderer + la scene pour la capture de vignette off-screen
// (cadrage fixe). Composant interne au Canvas : useThree donne gl + scene de
// facon fiable des le montage (contrairement a onCreated, gate par le Suspense).
function SnapshotBridge() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    registerThree(gl, scene)
  }, [gl, scene])
  return null
}

export default function AvatarViewer() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 1.3, 3.2], fov: 45, near: 0.1, far: 100 }}
      // preserveDrawingBuffer : utile pour le repli "canvas visible" de la capture.
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <SnapshotBridge />
      {/* --- Eclairage : ciel/sol doux + key light (ombres) + fill --- */}
      <hemisphereLight args={['#cdd6e0', '#33373d', 0.6]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[3, 5, 2]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={4}
        shadow-camera-bottom={-1}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.5} />

      {/* --- Le personnage (vrai GLB ou placeholder) --- */}
      <AvatarModel />

      {/* --- Sol : plan invisible qui recoit les ombres + grille de reperage --- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <shadowMaterial transparent opacity={0.3} />
      </mesh>
      <Grid
        position={[0, 0.001, 0]}
        args={[20, 20]}
        cellSize={0.25}
        cellThickness={0.6}
        cellColor="#3a3f47"
        sectionSize={1}
        sectionThickness={1.1}
        sectionColor="#566173"
        fadeDistance={18}
        fadeStrength={1}
        infiniteGrid
        followCamera={false}
      />

      {/* --- Controles : orbite autour du buste/visage --- */}
      <OrbitControls
        makeDefault
        target={[0, 0.95, 0]}
        enableDamping
        dampingFactor={0.08}
        minDistance={1}
        maxDistance={10}
        maxPolarAngle={Math.PI / 1.9}
      />
    </Canvas>
  )
}
