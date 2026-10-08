// Inspecteur GLB hors-ligne : lit le chunk JSON binaire d'un .glb et liste
// les meshes, leurs primitives et les materiaux. Utilitaire de dev (Phase 1)
// pour cabler species.json sur les VRAIS noms, sans deviner.
//
// Usage : node scripts/inspect-glb.mjs [chemin/vers/modele.glb]
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const target =
  process.argv[2] ??
  path.join(__dirname, '..', 'public', 'assets', 'species', 'human', 'base.glb')

const buf = readFileSync(target)

// En-tete GLB : magic 'glTF', version, longueur totale (12 octets)
const magic = buf.toString('ascii', 0, 4)
if (magic !== 'glTF') {
  console.error(`Pas un GLB binaire (magic="${magic}"). Fichier : ${target}`)
  process.exit(1)
}

// Premier chunk = JSON
const chunkLength = buf.readUInt32LE(12)
const chunkType = buf.toString('ascii', 16, 20) // "JSON"
const jsonText = buf.toString('utf8', 20, 20 + chunkLength)
const gltf = JSON.parse(jsonText)

console.log(`\n=== Inspection de ${path.basename(target)} ===`)
console.log(`Type du 1er chunk : ${chunkType.trim()}\n`)

const materials = gltf.materials ?? []
const meshes = gltf.meshes ?? []

console.log(`--- MATERIAUX (${materials.length}) ---`)
materials.forEach((m, i) => {
  const pbr = m.pbrMetallicRoughness ?? {}
  const hasBaseTex = pbr.baseColorTexture != null
  console.log(
    `  [${i}] "${m.name ?? '(sans nom)'}"` +
      (m.alphaMode ? `  alphaMode=${m.alphaMode}` : '') +
      (hasBaseTex ? '  baseColorTexture=oui' : ''),
  )
})

console.log(`\n--- MESHES (${meshes.length}) ---`)
meshes.forEach((mesh, i) => {
  const mats = (mesh.primitives ?? [])
    .map((p) => (p.material != null ? materials[p.material]?.name ?? `#${p.material}` : '(aucun)'))
    .join(', ')
  console.log(`  [${i}] "${mesh.name ?? '(sans nom)'}"  -> materiau(x): ${mats}`)
})

// --- MORPH TARGETS par mesh ---
// Le nombre vient de primitive.targets ; les noms vivent dans mesh.extras.targetNames
// (c'est la source de three.js pour mesh.morphTargetDictionary). Si absents, three.js
// nomme les cibles "morphTarget0", "morphTarget1", ... par index.
console.log(`\n--- MORPH TARGETS par mesh ---`)
let totalMorphs = 0
meshes.forEach((mesh, i) => {
  const prim0 = mesh.primitives?.[0]
  const count = prim0?.targets?.length ?? 0
  totalMorphs += count
  const names = mesh.extras?.targetNames ?? null
  console.log(`  [${i}] "${mesh.name ?? '(sans nom)'}" : ${count} morph target(s)`)
  if (count > 0) {
    if (names && names.length) {
      names.forEach((n, k) => console.log(`        ${k}: "${n}"`))
      if (names.length !== count) {
        console.log(`        (!) ${names.length} nom(s) pour ${count} cible(s) — incoherence`)
      }
    } else {
      console.log(`        (aucun nom dans extras.targetNames -> three.js utilisera "morphTarget0".."morphTarget${count - 1}")`)
    }
  }
})
console.log(`\nTotal morph targets (toutes primitives [0]) : ${totalMorphs}`)

// --- SQUELETTE / BONES ---
// Les os sont des noeuds references comme 'joints' dans gltf.skins. On liste leurs
// noms et on met en avant les candidats "tete" (/head/i) pour l'attache d'assets.
{
  const skins = gltf.skins ?? []
  const allNodes = gltf.nodes ?? []
  console.log(`\n--- SQUELETTE (${skins.length} skin) ---`)
  if (skins.length === 0) {
    console.log('  (aucun skin/squelette dans ce GLB)')
  } else {
    const seen = new Set()
    skins.forEach((skin, si) => {
      const joints = skin.joints ?? []
      console.log(`  skin[${si}] "${skin.name ?? '(sans nom)'}" : ${joints.length} bone(s)`)
      joints.forEach((nodeIdx) => {
        const name = allNodes[nodeIdx]?.name ?? `node#${nodeIdx}`
        seen.add(name)
      })
    })
    const names = [...seen]
    const headCandidates = names.filter((n) => /head/i.test(n))
    console.log(`  Candidats "tete" (/head/i) : ${headCandidates.length ? headCandidates.map((n) => `"${n}"`).join(', ') : 'AUCUN'}`)
    // Apercu de la liste des bones (tronquee si longue).
    const preview = names.slice(0, 40)
    console.log(`  Bones (${names.length}) : ${preview.join(', ')}${names.length > preview.length ? ', …' : ''}`)
  }
}

// --- BOUNDING BOX en espace MONDE ---
// On compose les transforms de noeuds (glTF bake souvent la conversion Z-up ->
// Y-up de Blender dans une rotation de noeud), donc on ne lit pas seulement les
// min/max des accessors (espace local) : on transforme les 8 coins de chaque AABB
// locale par la matrice monde du noeud. Repere glTF : +Y vers le haut.
const accessors = gltf.accessors ?? []
const nodes = gltf.nodes ?? []
const scenes = gltf.scenes ?? []

// Matrices colonne-major (convention glTF / three.js).
function fromTRS(t = [0, 0, 0], q = [0, 0, 0, 1], s = [1, 1, 1]) {
  const [qx, qy, qz, qw] = q
  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz
  const xx = qx * x2, xy = qx * y2, xz = qx * z2
  const yy = qy * y2, yz = qy * z2, zz = qz * z2
  const wx = qw * x2, wy = qw * y2, wz = qw * z2
  const [sx, sy, sz] = s
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    t[0], t[1], t[2], 1,
  ]
}
function multiply(a, b) {
  const r = new Array(16)
  for (let c = 0; c < 4; c++)
    for (let row = 0; row < 4; row++) {
      let sum = 0
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[c * 4 + k]
      r[c * 4 + row] = sum
    }
  return r
}
function transformPoint(m, [x, y, z]) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ]
}
function nodeLocalMatrix(node) {
  if (node.matrix) return node.matrix
  return fromTRS(node.translation, node.rotation, node.scale)
}

const gMin = [Infinity, Infinity, Infinity]
const gMax = [-Infinity, -Infinity, -Infinity]
let corners = 0
function walk(nodeIndex, parentMat) {
  const node = nodes[nodeIndex]
  if (!node) return
  const world = multiply(parentMat, nodeLocalMatrix(node))
  if (node.mesh != null) {
    for (const prim of meshes[node.mesh]?.primitives ?? []) {
      const posIdx = prim.attributes?.POSITION
      const acc = posIdx != null ? accessors[posIdx] : null
      if (!acc?.min || !acc?.max) continue
      for (const cx of [acc.min[0], acc.max[0]])
        for (const cy of [acc.min[1], acc.max[1]])
          for (const cz of [acc.min[2], acc.max[2]]) {
            const p = transformPoint(world, [cx, cy, cz])
            for (let a = 0; a < 3; a++) {
              if (p[a] < gMin[a]) gMin[a] = p[a]
              if (p[a] > gMax[a]) gMax[a] = p[a]
            }
            corners++
          }
    }
  }
  for (const c of node.children ?? []) walk(c, world)
}

const IDENT = fromTRS()
const rootNodes = scenes[gltf.scene ?? 0]?.nodes ?? nodes.map((_, i) => i)
rootNodes.forEach((i) => walk(i, IDENT))

const fmt = (v) => (Number.isFinite(v) ? v.toFixed(3) : 'n/a')
const fmt3 = (a) => `[${fmt(a[0])}, ${fmt(a[1])}, ${fmt(a[2])}]`
console.log(`\n--- BOUNDING BOX (espace monde, +Y = haut) ---`)
if (corners === 0) {
  console.log('  (aucune AABB : accessors POSITION sans min/max ?)')
} else {
  const size = [gMax[0] - gMin[0], gMax[1] - gMin[1], gMax[2] - gMin[2]]
  const center = [(gMin[0] + gMax[0]) / 2, (gMin[1] + gMax[1]) / 2, (gMin[2] + gMax[2]) / 2]
  console.log(`  min    X/Y/Z : ${fmt3(gMin)}`)
  console.log(`  max    X/Y/Z : ${fmt3(gMax)}`)
  console.log(`  taille X/Y/Z : ${fmt3(size)}`)
  console.log(`  centre X/Y/Z : ${fmt3(center)}`)
}
console.log('')
