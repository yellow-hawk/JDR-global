import { useCharacter } from './useCharacter'

// Module centralisant la (de)serialisation des personnages (presets).
//
// Principe : un personnage est ENTIEREMENT decrit par l'etat du store. Sauvegarder
// = snapshot du store -> preset JSON. Charger = preset -> store (la 3D se
// reconstruit seule via les hooks). Tout est generique : on serialise ce que le
// store contient, aucune cle "human"/morph/couleur en dur ici.

// Version du format. A incrementer si la structure de 'data' change.
export const PRESET_VERSION = 1

// =====================================================================
//  SERIALISATION : store -> preset
// =====================================================================

// Snapshot du bloc 'data' depuis un etat de store.
function snapshotData(state) {
  return {
    species: state.speciesId,
    gender: state.gender,
    colors: { ...state.colors },
    morphs: {
      values: { ...state.morphs },
      asymmetry: !!state.asymmetry,
      lr: JSON.parse(JSON.stringify(state.morphsLR ?? {})),
    },
    assets: { ...state.assets },
  }
}

// Construit un preset complet a partir de l'etat courant du store.
// opts.thumbnail (string base64) est optionnel et reserve au futur (vignettes).
export function buildPresetFromCurrent(name, opts = {}) {
  const state = useCharacter.getState()
  const now = new Date().toISOString()
  return {
    presetVersion: PRESET_VERSION,
    name: (typeof name === 'string' && name.trim()) || 'Sans nom',
    createdAt: opts.createdAt ?? now,
    updatedAt: now,
    thumbnail: opts.thumbnail ?? null, // optionnel, futur
    data: snapshotData(state),
  }
}

// =====================================================================
//  DESERIALISATION TOLERANTE : preset -> patch de store
// =====================================================================

// Filtre/repare le contenu d'un preset contre la config species.json courante.
// Tout element devenu inconnu (morph/couleur/asset renomme ou supprime) est
// IGNORE proprement (valeur par defaut) et liste dans 'warnings' — jamais de crash.
export function sanitizePreset(preset) {
  const warnings = []
  const state = useCharacter.getState()
  const speciesList = state.speciesList

  // --- Version ---
  const v = preset?.presetVersion
  if (typeof v !== 'number') {
    warnings.push("presetVersion absent ou invalide : chargement best-effort")
  } else if (v > PRESET_VERSION) {
    warnings.push(`presetVersion ${v} superieure a ${PRESET_VERSION} (supportee) : chargement best-effort`)
  }

  const data = preset?.data ?? {}

  // --- Espece ---
  let speciesId = data.species
  let species = speciesList.find((s) => s.id === speciesId)
  if (!species) {
    if (speciesId != null) warnings.push(`espece "${speciesId}" inconnue : conservation de l'espece courante`)
    species = speciesList.find((s) => s.id === state.speciesId) ?? speciesList[0]
    speciesId = species.id
  }

  // --- Genre ---
  let gender = data.gender
  if (!species.genders?.[gender]) {
    if (gender != null) warnings.push(`genre "${gender}" inconnu : genre par defaut`)
    gender = species.defaultGender ?? Object.keys(species.genders ?? { male: 1 })[0]
  }

  // --- Couleurs : on part des defauts puis on superpose ce qui existe encore ---
  const colorRoles = (species.materials ?? []).filter((m) => !m._example)
  const colors = {}
  colorRoles.forEach((r) => {
    colors[r.id] = r.default ?? '#ffffff'
  })
  Object.entries(data.colors ?? {}).forEach(([id, val]) => {
    if (id in colors) colors[id] = val
    else warnings.push(`couleur "${id}" inconnue : ignoree`)
  })

  // --- Morphs (valeurs symetriques) ---
  const morphRolesAll = (species.morphTargets ?? []).filter((m) => !m._example)
  const morphIds = new Set(morphRolesAll.map((r) => r.id))
  const pairIds = new Set(morphRolesAll.filter((r) => r.pair).map((r) => r.id))
  const morphs = {}
  morphRolesAll.forEach((r) => {
    morphs[r.id] = r.default ?? 0
  })
  Object.entries(data.morphs?.values ?? {}).forEach(([id, val]) => {
    if (morphIds.has(id)) morphs[id] = val
    else warnings.push(`morph "${id}" inconnu : ignore`)
  })

  // --- Morphs L/R (asymetrie) ---
  const asymmetry = !!data.morphs?.asymmetry
  const morphsLR = {}
  morphRolesAll
    .filter((r) => r.pair)
    .forEach((r) => {
      const dv = r.default ?? 0
      morphsLR[r.id] = { left: dv, right: dv }
    })
  Object.entries(data.morphs?.lr ?? {}).forEach(([id, val]) => {
    if (pairIds.has(id) && val && typeof val === 'object') {
      morphsLR[id] = {
        left: val.left ?? morphsLR[id].left,
        right: val.right ?? morphsLR[id].right,
      }
    } else {
      warnings.push(`morph L/R "${id}" inconnu ou non-paire : ignore`)
    }
  })

  // --- Assets ---
  const slots = (species.assetSlots ?? []).filter((sl) => !sl._example)
  const assets = {}
  slots.forEach((slot) => {
    assets[slot.id] = slot.default ?? null
  })
  Object.entries(data.assets ?? {}).forEach(([slotId, optId]) => {
    const slot = slots.find((s) => s.id === slotId)
    if (!slot) {
      warnings.push(`slot d'asset "${slotId}" inconnu : ignore`)
      return
    }
    const opt = (slot.options ?? []).find((o) => o.id === optId)
    if (opt) assets[slotId] = optId
    else warnings.push(`option "${optId}" du slot "${slotId}" inconnue : valeur par defaut`)
  })

  return {
    patch: { speciesId, gender, colors, morphs, asymmetry, morphsLR, assets },
    warnings,
    name: typeof preset?.name === 'string' ? preset.name : 'Sans nom',
  }
}

// Charge un preset dans le store (apres nettoyage tolerant). Retourne les warnings.
export function loadPresetIntoStore(preset) {
  const { patch, warnings } = sanitizePreset(preset)
  if (warnings.length) {
    console.warn(
      '[presets] Chargement tolerant — elements ignores/ajustes :\n  - ' + warnings.join('\n  - '),
    )
  }
  // On bumpe presetEpoch : les panneaux leva (keyed dessus) se remontent et
  // relisent le store a jour. Le store reste l'unique source de verite.
  const epoch = useCharacter.getState().presetEpoch ?? 0
  useCharacter.setState({ ...patch, presetEpoch: epoch + 1 })
  return { warnings }
}

// =====================================================================
//  EXPORT / IMPORT FICHIER .json
// =====================================================================

// Slugifie un nom de perso pour en faire un nom de fichier sur.
function slugify(name) {
  return (
    (name || 'personnage')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // retire les accents combinants
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'personnage'
  )
}

// Declenche le telechargement du preset sous forme de fichier .json.
export function downloadPreset(preset) {
  const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slugify(preset?.name)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Parse + valide la STRUCTURE d'un texte JSON de preset. Leve une Error claire si
// le fichier n'est pas un preset (pas un objet / champ 'data' manquant). La
// compat de version est geree ensuite, en best-effort, par sanitizePreset.
export function parsePresetJson(text) {
  let obj
  try {
    obj = JSON.parse(text)
  } catch {
    throw new Error('Fichier illisible : JSON invalide.')
  }
  if (!obj || typeof obj !== 'object' || typeof obj.data !== 'object' || obj.data === null) {
    throw new Error('Fichier preset invalide : champ "data" manquant.')
  }
  return obj
}
