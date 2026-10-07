// Réputation du groupe auprès d'un peuple : jauge, niveau, boutons ± avec raison, derniers changements.
import { useState } from 'react';
import type { Campagne, Civilisation } from '../../noyau/contrat';
import { PAS, changerReputation, niveauReputation } from './reputation';

interface Props { univers: string; civ: Civilisation; ro: boolean; modifier(f: (c: Campagne) => Campagne): void }

export function JaugeReputation({ univers, civ, ro, modifier }: Props) {
  const [raison, setRaison] = useState('');
  const v = civ.reputation ?? 0;
  const n = niveauReputation(v);
  const journal = [...(civ.reputationJournal ?? [])].reverse().slice(0, 5);
  return (
    <div className="pays-reputation">
      <div className="ligne"><strong style={{ color: n.couleur }}>{n.libelle}</strong><span className="discret">{v > 0 ? `+${v}` : v} / 100</span></div>
      <div className="pays-jauge" role="meter" aria-valuemin={-100} aria-valuemax={100} aria-valuenow={v} aria-label="Réputation">
        <i className="pays-jauge-zero" />
        <i className="pays-jauge-valeur" style={{ left: `${v < 0 ? 50 + v / 2 : 50}%`, width: `${Math.abs(v) / 2}%`, background: n.couleur }} />
      </div>
      {!ro && (
        <div className="ligne" style={{ flexWrap: 'wrap', gap: 4 }}>
          {PAS.map((p) => (
            <button key={p} className="btn btn-petit" onClick={() => { modifier((x) => changerReputation(x, univers, civ.cle, p, raison.trim() || 'Ajustement du MJ', new Date().toISOString())); setRaison(''); }}>
              {p > 0 ? `+${p}` : p}
            </button>
          ))}
          <input className="pays-raison" placeholder="Raison (facultatif)" value={raison} onChange={(e) => setRaison(e.target.value)} />
        </div>
      )}
      {journal.length > 0 && (
        <ul className="pays-liste discret">
          {journal.map((j, i) => <li key={i}>{j.delta > 0 ? `+${j.delta}` : j.delta} · {j.raison}</li>)}
        </ul>
      )}
    </div>
  );
}
