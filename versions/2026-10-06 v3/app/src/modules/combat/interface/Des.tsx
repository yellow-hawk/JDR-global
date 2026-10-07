// Lanceur de dés : d4 à d100, formule libre, avantage / désavantage. Les jets sont notés au journal de la table.
import { useState } from 'react';
import { d20, formuleValide, lancer } from '../../../noyau/regles';
import { journaliser } from '../moteur';
import { SONS } from './sons';
import type { Controleur } from './types';

export function Des({ ctl }: { ctl: Controleur }) {
  const [formule, setFormule] = useState('');
  const [dernier, setDernier] = useState<string | null>(null);
  const noter = (texte: string) => {
    setDernier(texte);
    if (ctl.ui.sons) SONS.des();
    if (!ctl.lectureSeule) ctl.faire((e) => journaliser(e, `🎲 ${texte}`), true);
  };
  const jet = (f: string) => {
    if (!formuleValide(f)) { ctl.dire(`Formule invalide : « ${f} »`, 'erreur'); return; }
    const r = lancer(f);
    noter(`${f} → ${r.termes.map((t) => (t.des.length ? `[${t.des.join(',')}]` : t.texte)).join(' ')} = ${r.total}`);
  };
  const avantage = (mode: 'avantage' | 'desavantage') => { const r = d20(mode); noter(`d20 ${mode === 'avantage' ? 'avantage' : 'désavantage'} [${r.des.join(', ')}] → ${r.garde}`); };
  return (
    <div className="combat-onglet">
      <div className="combat-des">
        {[4, 6, 8, 10, 12, 20, 100].map((d) => <button key={d} className="combat-de" onClick={() => jet(`1d${d}`)}>d{d}</button>)}
      </div>
      <form className="ligne" onSubmit={(ev) => { ev.preventDefault(); if (formule.trim()) jet(formule.trim()); }}>
        <input value={formule} onChange={(ev) => setFormule(ev.target.value)} placeholder="2d6+4" style={{ flex: 1 }} />
        <button className="btn btn-petit btn-principal">Lancer</button>
      </form>
      <div className="ligne">
        <button className="btn btn-petit" onClick={() => avantage('avantage')}>Avantage</button>
        <button className="btn btn-petit" onClick={() => avantage('desavantage')}>Désavantage</button>
      </div>
      {dernier && <div className="combat-resultat">🎲 {dernier}</div>}
    </div>
  );
}
