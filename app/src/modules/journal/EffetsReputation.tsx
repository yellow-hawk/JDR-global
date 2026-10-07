// Effets d'une quête sur la réputation du groupe : appliqués automatiquement quand la quête passe à « Terminée ».
import type { Campagne, Quete } from '../../noyau/contrat';
import { niveauReputation, peuplesDeCampagne } from '../pays';

interface Props { c: Campagne; q: Quete; ro: boolean; maj(f: (x: Quete) => Quete): void }

export function EffetsReputation({ c, q, ro, maj }: Props) {
  const peuples = peuplesDeCampagne(c);
  const effets = q.reputation ?? [];
  const applique = !!(q.mj as { reputationAppliquee?: boolean } | undefined)?.reputationAppliquee;
  if (!peuples.length) return null;
  const changer = (i: number, e: Partial<NonNullable<Quete['reputation']>[number]>) =>
    maj((x) => ({ ...x, reputation: (x.reputation ?? []).map((y, j) => (j === i ? { ...y, ...e } : y)) }));
  return (
    <div className="pile" style={{ gap: 6 }}>
      <h3 style={{ margin: 0 }}>Réputation à la fin de la quête</h3>
      <p className="discret" style={{ margin: 0 }}>{applique ? 'Déjà appliquée (la quête est terminée).' : 'Appliquée automatiquement quand la quête passe à « Terminée ».'}</p>
      {effets.map((e, i) => {
        const civ = peuples.find((p) => p.univers.id === e.univers && String(p.civ.cle) === String(e.peuple))?.civ;
        return (
          <div key={i} className="ligne">
            <select disabled={ro || applique} value={`${e.univers}|${String(e.peuple)}`} onChange={(ev) => { const [univers, peuple] = ev.target.value.split('|'); changer(i, { univers, peuple }); }}>
              {peuples.map((p) => <option key={`${p.univers.id}|${String(p.civ.cle)}`} value={`${p.univers.id}|${String(p.civ.cle)}`}>{p.civ.nom.replace(/^les /, '')}</option>)}
            </select>
            <input type="number" className="journal-nb" disabled={ro || applique} value={e.delta} onChange={(ev) => changer(i, { delta: Number(ev.target.value) || 0 })} />
            {civ && <span className="discret" style={{ color: niveauReputation(civ.reputation).couleur }}>actuellement {niveauReputation(civ.reputation).libelle.toLowerCase()}</span>}
            {!ro && !applique && <button className="btn btn-petit" onClick={() => maj((x) => ({ ...x, reputation: (x.reputation ?? []).filter((_, j) => j !== i) }))}>×</button>}
          </div>
        );
      })}
      {!ro && !applique && (
        <button className="btn btn-petit" style={{ alignSelf: 'flex-start' }}
          onClick={() => maj((x) => ({ ...x, reputation: [...(x.reputation ?? []), { univers: peuples[0].univers.id, peuple: peuples[0].civ.cle, delta: 10 }] }))}>
          + Effet sur un peuple
        </button>
      )}
    </div>
  );
}
