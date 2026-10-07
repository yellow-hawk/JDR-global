// Mannequin primitif fait de geometries Three.js de base.
//
// Role : s'afficher tant qu'aucun GLB de base n'est fourni (ou s'il echoue a
// charger), afin de pouvoir valider IMMEDIATEMENT la camera, les lumieres et la
// boucle de rendu. Des qu'un vrai base.glb est depose au bon endroit, AvatarModel
// le charge a la place — ce composant n'a pas a etre modifie.
//
// Proportions approximatives d'un humain debout (~1.8 m), pieds au sol (y = 0).

const PLACEHOLDER_COLOR = '#8a8f98'

function Part({ children, position = [0, 0, 0], rotation = [0, 0, 0] }) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      {children}
      <meshStandardMaterial color={PLACEHOLDER_COLOR} roughness={0.65} metalness={0.1} />
    </mesh>
  )
}

export default function PlaceholderMannequin() {
  return (
    <group name="placeholder-mannequin">
      {/* Tete */}
      <Part position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.13, 24, 24]} />
      </Part>

      {/* Cou */}
      <Part position={[0, 1.52, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.12, 16]} />
      </Part>

      {/* Torse (capsule) : s'etend ~0.9 -> ~1.45 */}
      <Part position={[0, 1.18, 0]}>
        <capsuleGeometry args={[0.19, 0.4, 8, 16]} />
      </Part>

      {/* Bassin */}
      <Part position={[0, 0.88, 0]}>
        <capsuleGeometry args={[0.16, 0.12, 6, 16]} />
      </Part>

      {/* Bras gauche / droit (legerement ecartes) */}
      <Part position={[-0.3, 1.18, 0]} rotation={[0, 0, 0.12]}>
        <capsuleGeometry args={[0.06, 0.5, 6, 12]} />
      </Part>
      <Part position={[0.3, 1.18, 0]} rotation={[0, 0, -0.12]}>
        <capsuleGeometry args={[0.06, 0.5, 6, 12]} />
      </Part>

      {/* Jambe gauche / droite : center 0.44 -> pieds a y ~ 0 */}
      <Part position={[-0.11, 0.44, 0]}>
        <capsuleGeometry args={[0.09, 0.6, 6, 12]} />
      </Part>
      <Part position={[0.11, 0.44, 0]}>
        <capsuleGeometry args={[0.09, 0.6, 6, 12]} />
      </Part>
    </group>
  )
}
