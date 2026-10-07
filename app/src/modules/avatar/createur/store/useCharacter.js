import { create } from 'zustand'
import speciesData from '../data/species.json'

// Source de verite unique du personnage (zustand).
// La 3D ne fait que REFLETER ce store ; elle ne le pilote jamais.
//
// Le store est volontairement data-driven : il ne connait aucune espece en dur,
// il lit simplement la liste fournie par species.json. Ajouter une espece dans
// le JSON la rend immediatement disponible ici, sans toucher a ce fichier.

const speciesList = speciesData.species
const defaultSpecies = speciesList[0]

// Construit l'etat couleur initial d'une espece : { roleId: teinte } a partir des
// 'default' de species.json. Reste data-driven : aucune couleur/role en dur.
// Les entrees marquees _example (documentation) sont ignorees.
function buildDefaultColors(species) {
  const colors = {}
  ;(species?.materials ?? [])
    .filter((m) => !m._example)
    .forEach((role) => {
      colors[role.id] = role.default ?? '#ffffff'
    })
  return colors
}

// Liste des roles de morph reels (hors entrees de documentation _example).
function morphRoles(species) {
  return (species?.morphTargets ?? []).filter((m) => !m._example)
}

// Etat morph symetrique initial : { roleId: influence } (defaut 0). Data-driven.
function buildDefaultMorphs(species) {
  const morphs = {}
  morphRoles(species).forEach((role) => {
    morphs[role.id] = role.default ?? 0
  })
  return morphs
}

// Etat morph gauche/droite initial pour les roles a paire L/R uniquement :
// { roleId: { left, right } } (defaut = default du role). Sert au mode asymetrie.
function buildDefaultMorphsLR(species) {
  const lr = {}
  morphRoles(species)
    .filter((role) => role.pair)
    .forEach((role) => {
      const v = role.default ?? 0
      lr[role.id] = { left: v, right: v }
    })
  return lr
}

// Etat asset initial : { slotId: optionId } depuis le 'default' de chaque slot
// (null = Aucun). Data-driven : aucun slot/option en dur.
function buildDefaultAssets(species) {
  const assets = {}
  ;(species?.assetSlots ?? [])
    .filter((sl) => !sl._example)
    .forEach((slot) => {
      assets[slot.id] = slot.default ?? null
    })
  return assets
}

export const useCharacter = create((set, get) => ({
  // --- Catalogue (lecture seule, vient de species.json) ---
  speciesList,

  // --- Etat courant du personnage (Phase 0 : espece + genre) ---
  speciesId: defaultSpecies.id,
  gender: defaultSpecies.defaultGender ?? 'male',

  // --- Couleurs (Phase 1) : teinte par role logique. Source de verite unique. ---
  colors: buildDefaultColors(defaultSpecies),

  // --- Morphs (Phase 2) : influence par role logique. Source de verite unique. ---
  morphs: buildDefaultMorphs(defaultSpecies),
  // Mode asymetrie : quand true, les roles a paire L/R sont pilotes cote par cote.
  asymmetry: false,
  // Valeurs gauche/droite par role a paire L/R (utilisees seulement si asymmetry).
  morphsLR: buildDefaultMorphsLR(defaultSpecies),

  // --- Assets (Phase 3) : option choisie par slot. Source de verite unique. ---
  assets: buildDefaultAssets(defaultSpecies),

  // Compteur incremente a chaque chargement de preset (local/import). Sert de 'key'
  // React pour remonter les panneaux leva afin qu'ils se resynchronisent sur le
  // store apres une mise a jour externe (leva ne relit pas 'value' apres montage).
  presetEpoch: 0,

  // --- Actions ---
  setSpecies: (speciesId) =>
    set(() => {
      const sp = speciesList.find((s) => s.id === speciesId)
      // Au changement d'espece : genre + couleurs + morphs + assets par defaut.
      return sp
        ? {
            speciesId,
            gender: sp.defaultGender ?? 'male',
            colors: buildDefaultColors(sp),
            morphs: buildDefaultMorphs(sp),
            morphsLR: buildDefaultMorphsLR(sp),
            asymmetry: false,
            assets: buildDefaultAssets(sp),
          }
        : {}
    }),

  setGender: (gender) => set({ gender }),

  // Teinte un role (ecrit dans la source de verite ; la 3D suit via useMaterials).
  setColor: (roleId, value) =>
    set((state) => ({ colors: { ...state.colors, [roleId]: value } })),

  // Remet toutes les couleurs aux valeurs par defaut de l'espece courante.
  resetColors: () =>
    set((state) => {
      const sp = speciesList.find((s) => s.id === state.speciesId)
      return { colors: buildDefaultColors(sp) }
    }),

  // --- Morphs (Phase 2) ---

  // Regle l'influence symetrique d'un role (les deux cotes d'une paire ensemble).
  setMorph: (roleId, value) =>
    set((state) => ({ morphs: { ...state.morphs, [roleId]: value } })),

  // Regle un cote (gauche/droite) d'un role a paire L/R (mode asymetrie).
  setMorphSide: (roleId, side, value) =>
    set((state) => ({
      morphsLR: {
        ...state.morphsLR,
        [roleId]: { ...(state.morphsLR[roleId] ?? {}), [side]: value },
      },
    })),

  // Active/desactive l'asymetrie. A l'activation, on initialise les valeurs L/R
  // des paires depuis la valeur symetrique courante (pas de saut visuel).
  setAsymmetry: (asymmetry) =>
    set((state) => {
      if (!asymmetry) return { asymmetry: false }
      const sp = speciesList.find((s) => s.id === state.speciesId)
      const morphsLR = { ...state.morphsLR }
      morphRoles(sp)
        .filter((role) => role.pair)
        .forEach((role) => {
          const v = state.morphs[role.id] ?? role.default ?? 0
          morphsLR[role.id] = { left: v, right: v }
        })
      return { asymmetry: true, morphsLR }
    }),

  // Remet tous les morphs (symetriques et L/R) aux valeurs par defaut de l'espece.
  resetMorphs: () =>
    set((state) => {
      const sp = speciesList.find((s) => s.id === state.speciesId)
      return { morphs: buildDefaultMorphs(sp), morphsLR: buildDefaultMorphsLR(sp) }
    }),

  // --- Assets (Phase 3) ---

  // Selectionne une option (optionId, null = Aucun) pour un slot. La 3D suit
  // via useAssets (charge/attache ou retire l'asset).
  setAsset: (slotId, optionId) =>
    set((state) => ({ assets: { ...state.assets, [slotId]: optionId } })),

  // --- Selecteurs derives ---
  getSpecies: () => get().speciesList.find((s) => s.id === get().speciesId),

  // Chemin du GLB de base pour (espece, genre) courants, ou null si non defini.
  getModelPath: () => {
    const sp = get().speciesList.find((s) => s.id === get().speciesId)
    return sp?.genders?.[get().gender]?.model ?? null
  },
}))
