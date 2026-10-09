// Édition d'un talent : nom, texte, rang, niveau, coût, prérequis, effets chiffrés, magie des sceaux.
import type { NoeudTalent } from '../../../noyau/talents';
import { Champ } from '../../../interface/composants';

const CIBLES: [string, string][] = [
  ['ca', 'CA'], ['attaque', 'Attaque'], ['degats', 'Dégâts'], ['initiative', 'Initiative'], ['vitesse', 'Vitesse'], ['pvParNiveau', 'PV par niveau'],
  ['dd', 'DD des sorts'], ['attaque.sort', 'Attaque de sort'],
  ...['for', 'dex', 'con', 'int', 'sag', 'cha'].map((c) => [`sauvegarde.${c}`, `Sauv. ${c.toUpperCase()}`] as [string, string]),
  ...['for', 'dex', 'con', 'int', 'sag', 'cha'].map((c) => [`carac.${c}`, c.toUpperCase()] as [string, string]),
];

export function EditeurNoeud({ n, autres, competences, onChange, onSupprimer }: {
  n: NoeudTalent; autres: NoeudTalent[]; competences: { id: string; libelle: string }[];
  onChange(n: NoeudTalent): void; onSupprimer(): void;
}) {
  const set = (patch: Partial<NoeudTalent>) => onChange({ ...n, ...patch });
  const cibles = [...CIBLES, ...competences.map((c) => [`competence.${c.id}`, c.libelle] as [string, string])];
  return (
    <div className="pile perso-editeur-noeud" style={{ gap: 6 }}>
      <div className="ligne">
        <input value={n.nom} placeholder="Nom du talent" style={{ flex: 1, fontWeight: 600 }} onChange={(e) => set({ nom: e.target.value })} />
        <button className="btn btn-petit btn-danger" onClick={onSupprimer}>Supprimer</button>
      </div>
      <textarea rows={2} value={n.texte} placeholder="Ce que fait le talent" onChange={(e) => set({ texte: e.target.value })} />
      <div className="champs">
        <Champ libelle="Rang (ligne)"><input type="number" min={1} max={8} value={n.rang} onChange={(e) => set({ rang: Number(e.target.value) })} /></Champ>
        <Champ libelle="Niveau requis"><input type="number" min={1} max={20} value={n.niveau} onChange={(e) => set({ niveau: Number(e.target.value) })} /></Champ>
        <Champ libelle="Coût (points)"><input type="number" min={0} max={10} value={n.cout} onChange={(e) => set({ cout: Number(e.target.value) })} /></Champ>
      </div>
      <Champ libelle="Prérequis (Ctrl + clic pour plusieurs)">
        <select multiple size={Math.min(5, Math.max(2, autres.length))} value={n.requis}
          onChange={(e) => set({ requis: [...e.target.selectedOptions].map((o) => o.value) })}>
          {autres.map((a) => <option key={a.id} value={a.id}>{a.nom} (rang {a.rang})</option>)}
        </select>
      </Champ>
      <div className="ligne">
        <span className="discret">Effets :</span>
        {(n.effets ?? []).map((x, i) => (
          <span key={i} className="ligne">
            <select value={x.cible} onChange={(e) => set({ effets: n.effets!.map((y, j) => (j === i ? { ...y, cible: e.target.value } : y)) })}>
              {cibles.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
            </select>
            <input type="number" style={{ width: 56 }} value={x.valeur} onChange={(e) => set({ effets: n.effets!.map((y, j) => (j === i ? { ...y, valeur: Number(e.target.value) } : y)) })} />
            <button className="btn btn-petit" onClick={() => set({ effets: n.effets!.filter((_, j) => j !== i) })}>✕</button>
          </span>
        ))}
        <button className="btn btn-petit" onClick={() => set({ effets: [...(n.effets ?? []), { cible: 'ca', valeur: 1 }] })}>+ Effet</button>
      </div>
      <details>
        <summary className="discret">Magie des sceaux (Atelier)</summary>
        <div className="champs">
          <Champ libelle="Signes appris (ids, virgules)">
            <input value={(n.magie?.signes ?? []).join(', ')} placeholder="braise, dard…"
              onChange={(e) => set({ magie: { ...(n.magie ?? {}), signes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })} />
          </Champ>
          <Champ libelle="Rang de magie"><input type="number" min={0} max={3} value={n.magie?.rang ?? 0} onChange={(e) => set({ magie: { ...(n.magie ?? {}), rang: Number(e.target.value) || undefined } })} /></Champ>
          <Champ libelle="Emplacements +"><input type="number" min={0} value={n.magie?.emplacements ?? 0} onChange={(e) => set({ magie: { ...(n.magie ?? {}), emplacements: Number(e.target.value) || undefined } })} /></Champ>
        </div>
      </details>
    </div>
  );
}
