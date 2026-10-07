import { useControls, folder } from 'leva'
import { useCharacter } from '../store/useCharacter'

// Panneau de controle (proto leva), entierement genere depuis species.json
// (aucun role/nom en dur).
//  - Phase 1 : dossier "Couleurs" = un color picker par role de materiau.
//  - Phase 2 : dossiers "Visage" / "Corps" = un slider par role de morph,
//    + toggle "Asymetrie (avance)" qui dedouble les sliders des paires L/R.
//  - Phase 3 : dossier "Assets" = un menu deroulant par slot.
//
// Resync apres chargement de preset (Phase 4) : leva memorise ses valeurs dans un
// store global indexe par CHEMIN, et ne relit pas 'value' tant que le chemin existe.
// On suffixe donc toutes les cles par presetEpoch (incremente a chaque chargement) :
// les chemins deviennent neufs -> leva les initialise forcement sur le store a jour.
// Les 'label' restent stables (c'est eux qui s'affichent, pas la cle).

export default function ControlPanel() {
  const speciesList = useCharacter((s) => s.speciesList)
  const speciesId = useCharacter((s) => s.speciesId)
  const presetEpoch = useCharacter((s) => s.presetEpoch)

  const setColor = useCharacter((s) => s.setColor)
  const setMorph = useCharacter((s) => s.setMorph)
  const setMorphSide = useCharacter((s) => s.setMorphSide)
  const setAsymmetry = useCharacter((s) => s.setAsymmetry)
  const setAsset = useCharacter((s) => s.setAsset)

  const colors = useCharacter((s) => s.colors)
  const morphs = useCharacter((s) => s.morphs)
  const morphsLR = useCharacter((s) => s.morphsLR)
  const asymmetry = useCharacter((s) => s.asymmetry)
  const assets = useCharacter((s) => s.assets)

  const species = speciesList.find((s) => s.id === speciesId)

  // Suffixe de cle unique par chargement de preset (force leva a relire le store).
  const k = (base) => `${base}__e${presetEpoch}`

  // --- Phase 1 : Couleurs ---
  const colorRoles = (species?.materials ?? []).filter((m) => !m._example)
  const colorSchema = {}
  colorRoles.forEach((role) => {
    colorSchema[k(role.id)] = {
      label: role.label,
      value: colors[role.id] ?? role.default ?? '#ffffff',
      onChange: (value) => setColor(role.id, value),
    }
  })
  useControls('Couleurs', colorSchema, [speciesId, presetEpoch])

  // --- Phase 2 : Morphologie ---
  const morphRoles = (species?.morphTargets ?? []).filter((m) => !m._example)

  // Construit le schema d'un dossier (Visage/Corps) pour une liste de roles.
  const buildFolder = (roles) => {
    const schema = {}
    roles.forEach((role) => {
      const min = role.min ?? 0
      const max = role.max ?? 1
      if (asymmetry && role.pair) {
        // Deux sliders independants : Gauche / Droite.
        schema[k(`${role.id}__L`)] = {
          label: `${role.label} (G)`,
          value: morphsLR[role.id]?.left ?? role.default ?? 0,
          min,
          max,
          step: 0.01,
          onChange: (v) => setMorphSide(role.id, 'left', v),
        }
        schema[k(`${role.id}__R`)] = {
          label: `${role.label} (D)`,
          value: morphsLR[role.id]?.right ?? role.default ?? 0,
          min,
          max,
          step: 0.01,
          onChange: (v) => setMorphSide(role.id, 'right', v),
        }
      } else {
        // Un seul slider symetrique.
        schema[k(role.id)] = {
          label: role.label,
          value: morphs[role.id] ?? role.default ?? 0,
          min,
          max,
          step: 0.01,
          onChange: (v) => setMorph(role.id, v),
        }
      }
    })
    return schema
  }

  const faceRoles = morphRoles.filter((r) => r.category === 'visage')
  const bodyRoles = morphRoles.filter((r) => r.category === 'corps')

  // Toggle d'asymetrie.
  useControls(
    'Morphologie',
    {
      [k('asymmetry')]: {
        label: 'Asymetrie (avance)',
        value: asymmetry,
        onChange: (v) => setAsymmetry(v),
      },
    },
    [presetEpoch],
  )

  // Sliders : se regenerent quand l'espece, le mode asymetrie OU un preset change.
  useControls(
    'Morphologie',
    {
      Visage: folder(buildFolder(faceRoles)),
      Corps: folder(buildFolder(bodyRoles)),
    },
    [speciesId, asymmetry, presetEpoch],
  )

  // --- Phase 3 : Assets (menu deroulant par slot) ---
  // leva n'aime pas la valeur null en select : on mappe "Aucun" sur un sentinel
  // a la frontiere UI, et on reconvertit en null vers le store.
  const NONE = '__none__'
  const assetSlots = (species?.assetSlots ?? []).filter((sl) => !sl._example)
  const assetSchema = {}
  assetSlots.forEach((slot) => {
    const optionsObj = {}
    slot.options.forEach((o) => {
      optionsObj[o.label] = o.id ?? NONE
    })
    assetSchema[k(slot.id)] = {
      label: slot.label,
      options: optionsObj,
      value: assets[slot.id] ?? NONE,
      onChange: (v) => setAsset(slot.id, v === NONE ? null : v),
    }
  })
  useControls('Assets', assetSchema, [speciesId, presetEpoch])

  return null
}
