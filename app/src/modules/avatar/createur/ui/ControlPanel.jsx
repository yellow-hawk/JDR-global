import { useCharacter } from '../store/useCharacter'

// Panneau de controle, entierement genere depuis species.json
// (aucun role/nom en dur).
//  - Phase 1 : dossier "Couleurs" = un color picker par role de materiau.
//  - Phase 2 : un dossier par categorie de species.json (morphCategories : Silhouette,
//    Visage, Corps…) = un slider par role de morph, + toggle "Asymetrie (avance)" qui
//    dedouble les sliders des paires L/R.
//  - Phase 3 : dossier "Assets" = un menu deroulant par slot.
//
// Version JDR Global : leva est remplace par des controles React natifs (classes
// .avatar-*), aux couleurs de l'application. Les controles sont pilotes par le store
// (valeurs controlees) : apres chargement d'un preset, ils se resynchronisent
// d'eux-memes, sans l'astuce presetEpoch qu'imposait leva.

function Curseur({ libelle, valeur, min, max, onChange }) {
  return (
    <label className="avatar-curseur">
      <span>{libelle}</span>
      <input type="range" min={min} max={max} step={0.01} value={valeur} onChange={(e) => onChange(+e.target.value)} />
      <output>{valeur.toFixed(2)}</output>
    </label>
  )
}

function Dossier({ titre, ouvert = true, reinitialiser, children }) {
  return (
    <details className="avatar-dossier" open={ouvert}>
      <summary>
        {titre}
        {reinitialiser && (
          <button className="avatar-reinit" title="Valeurs par défaut" onClick={(e) => { e.preventDefault(); reinitialiser() }}>↺</button>
        )}
      </summary>
      <div className="avatar-dossier-corps">{children}</div>
    </details>
  )
}

export default function ControlPanel() {
  const speciesList = useCharacter((s) => s.speciesList)
  const speciesId = useCharacter((s) => s.speciesId)

  const setColor = useCharacter((s) => s.setColor)
  const setMorph = useCharacter((s) => s.setMorph)
  const setMorphSide = useCharacter((s) => s.setMorphSide)
  const setAsymmetry = useCharacter((s) => s.setAsymmetry)
  const setAsset = useCharacter((s) => s.setAsset)
  const resetColors = useCharacter((s) => s.resetColors)
  const resetMorphs = useCharacter((s) => s.resetMorphs)

  const colors = useCharacter((s) => s.colors)
  const morphs = useCharacter((s) => s.morphs)
  const morphsLR = useCharacter((s) => s.morphsLR)
  const asymmetry = useCharacter((s) => s.asymmetry)
  const assets = useCharacter((s) => s.assets)

  const species = speciesList.find((s) => s.id === speciesId)

  // --- Phase 1 : Couleurs ---
  const colorRoles = (species?.materials ?? []).filter((m) => !m._example)

  // --- Phase 2 : Morphologie ---
  const morphRoles = (species?.morphTargets ?? []).filter((m) => !m._example)

  // Sliders d'un dossier (Visage/Corps) pour une liste de roles.
  const sliders = (roles) =>
    roles.map((role) => {
      const min = role.min ?? 0
      const max = role.max ?? 1
      if (asymmetry && role.pair) {
        // Deux sliders independants : Gauche / Droite.
        return (
          <div key={role.id}>
            <Curseur libelle={`${role.label} (G)`} min={min} max={max}
              valeur={morphsLR[role.id]?.left ?? role.default ?? 0} onChange={(v) => setMorphSide(role.id, 'left', v)} />
            <Curseur libelle={`${role.label} (D)`} min={min} max={max}
              valeur={morphsLR[role.id]?.right ?? role.default ?? 0} onChange={(v) => setMorphSide(role.id, 'right', v)} />
          </div>
        )
      }
      // Un seul slider symetrique.
      return <Curseur key={role.id} libelle={role.label} min={min} max={max}
        valeur={morphs[role.id] ?? role.default ?? 0} onChange={(v) => setMorph(role.id, v)} />
    })

  // Categories declarees dans species.json (repli : visage + corps).
  const categories = species?.morphCategories ?? [{ id: 'visage', label: 'Visage' }, { id: 'corps', label: 'Corps' }]

  // --- Phase 3 : Assets (menu deroulant par slot) ---
  // Le select HTML ne connait pas null : "Aucun" est mappe sur un sentinel
  // a la frontiere UI, et reconverti en null vers le store.
  const NONE = '__none__'
  const assetSlots = (species?.assetSlots ?? []).filter((sl) => !sl._example)

  return (
    <div className="avatar-panneau">
      <Dossier titre="Couleurs" reinitialiser={resetColors}>
        {colorRoles.map((role) => (
          <label key={role.id} className="avatar-couleur">
            <span>{role.label}</span>
            <input type="color" value={colors[role.id] ?? role.default ?? '#ffffff'} onChange={(e) => setColor(role.id, e.target.value)} />
            <code>{colors[role.id] ?? role.default}</code>
          </label>
        ))}
      </Dossier>

      <Dossier titre="Morphologie" reinitialiser={resetMorphs}>
        <label className="avatar-coche">
          <input type="checkbox" checked={asymmetry} onChange={(e) => setAsymmetry(e.target.checked)} />
          Asymétrie (avancé)
        </label>
      </Dossier>
      {categories.map((c) => {
        const roles = morphRoles.filter((r) => r.category === c.id)
        return roles.length ? <Dossier key={c.id} titre={c.label} ouvert={c.id === categories[0].id}>{sliders(roles)}</Dossier> : null
      })}

      <Dossier titre="Coiffure, pilosité et tenue">
        {assetSlots.map((slot) => (
          <label key={slot.id} className="avatar-choix">
            <span>{slot.label}</span>
            <select value={assets[slot.id] ?? NONE} onChange={(e) => setAsset(slot.id, e.target.value === NONE ? null : e.target.value)}>
              {slot.options.map((o) => <option key={o.id ?? NONE} value={o.id ?? NONE}>{o.label}</option>)}
            </select>
          </label>
        ))}
      </Dossier>
    </div>
  )
}
