// Masque du corps sous les vetements (delete groups MakeHuman) : les triangles du corps dont un
// sommet est cache par un asset porte ne sont plus dessines (la peau ne traverse plus le tissu).
//
// Le corps exporte l'index MakeHuman de chaque sommet dans l'attribut '_id'
// (blender/scripts/construire_avatar.py) ; chaque option d'asset peut porter 'cacheCorps' :
// ces index en plages compactes "12-45,78,…" (generes depuis les .mhclo).

/** "12-14,20" -> Set {12, 13, 14, 20}. */
export function lirePlages(texte) {
  const res = new Set()
  if (!texte) return res
  for (const morceau of texte.split(',')) {
    const [a, b] = morceau.split('-').map(Number)
    if (Number.isNaN(a)) continue
    for (let i = a; i <= (b === undefined || Number.isNaN(b) ? a : b); i++) res.add(i)
  }
  return res
}

/** Applique le masque (ensemble d'index MakeHuman caches) a tous les meshes du corps portant '_id'. */
export function masquerCorps(baseRoot, caches) {
  baseRoot?.traverse((o) => {
    const geo = o.isMesh ? o.geometry : null
    const ids = geo?.attributes?._id
    if (!ids || !geo.index) return
    if (!geo.userData.indexComplet) geo.userData.indexComplet = geo.index.array.slice()
    const complet = geo.userData.indexComplet
    if (!caches.size) {
      geo.index.array.set(complet)
      geo.setDrawRange(0, complet.length)
      geo.index.needsUpdate = true
      return
    }
    const cache = new Uint8Array(ids.count)
    for (let i = 0; i < ids.count; i++) if (caches.has(Math.round(ids.getX(i)))) cache[i] = 1
    let n = 0
    const tableau = geo.index.array
    for (let t = 0; t < complet.length; t += 3) {
      const a = complet[t], b = complet[t + 1], c = complet[t + 2]
      if (cache[a] || cache[b] || cache[c]) continue
      tableau[n++] = a; tableau[n++] = b; tableau[n++] = c
    }
    geo.setDrawRange(0, n)
    geo.index.needsUpdate = true
  })
}
