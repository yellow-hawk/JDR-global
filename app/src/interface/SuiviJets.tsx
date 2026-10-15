// En-tête (MJ) : les jets des joueurs, faciles à suivre. Chaque nouveau jet apparaît en grand en bas de l'écran
// (nom, ce qui est lancé, total, réussi ou raté contre le DD demandé) ; le bouton 🎲 garde l'historique par joueur.
import { useEffect, useRef, useState } from 'react';
import { historiqueJets, suivreJets } from '../noyau/bus';
import { texteJet, type JetDes } from '../noyau/regles';

const nomDe = (j: JetDes) => (j.qui ?? '').split(' · ')[0] || 'Joueur';
const verdict = (j: JetDes) => (j.dd ? (j.total >= j.dd ? 'reussi' : 'rate') : null);
const critique = (j: JetDes) => { const d = j.des.find((x) => x.faces === 20 && !x.ecarte); return d?.valeur === 20 ? '20 naturel !' : d?.valeur === 1 ? '1 naturel…' : null; };

function Carte({ j, onFermer }: { j: JetDes; onFermer?: () => void }) {
  const v = verdict(j), c = critique(j);
  return (
    <div className={`jet-joueur ${v ?? ''}`} onClick={onFermer}>
      <div className="jet-joueur-tete"><b>{nomDe(j)}</b><span>{j.libelle ?? j.formule}</span></div>
      <div className="jet-joueur-total">{j.total}</div>
      <div className="jet-joueur-detail">
        {v && <b>{v === 'reussi' ? '✔ Réussi' : '✘ Raté'} (DD {j.dd})</b>}
        {c && <b className="jet-joueur-critique">{c}</b>}
        <span>{texteJet({ ...j, qui: undefined })}</span>
      </div>
    </div>
  );
}

export function SuiviJets() {
  const [jets, setJets] = useState<JetDes[]>(() => historiqueJets().filter((j) => j.joueur));
  const [recents, setRecents] = useState<JetDes[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [filtre, setFiltre] = useState('');
  const vus = useRef(new Set(historiqueJets().map((j) => j.id)));

  useEffect(() => suivreJets((h) => {
    const nouveaux = h.filter((j) => j.joueur && !vus.current.has(j.id));
    h.forEach((j) => vus.current.add(j.id));
    setJets(h.filter((j) => j.joueur));
    if (nouveaux.length) setRecents((r) => [...nouveaux, ...r].slice(0, 4));
  }), []);
  // Chaque jet reste 12 s en grand.
  useEffect(() => {
    if (!recents.length) return;
    const t = window.setTimeout(() => setRecents((r) => r.slice(0, -1)), 12000);
    return () => window.clearTimeout(t);
  }, [recents]);

  const noms = [...new Set(jets.map(nomDe))];
  const liste = jets.filter((j) => !filtre || nomDe(j) === filtre);
  return (
    <>
      <button className={`btn btn-petit ${ouvert ? 'btn-principal' : ''}`} onClick={() => setOuvert(!ouvert)} title="Jets des joueurs (historique)">
        🎲{jets.length ? ` ${jets.length}` : ''}
      </button>
      {recents.length > 0 && (
        <div className="jets-joueurs-recents" aria-live="polite">
          {recents.map((j) => <Carte key={j.id} j={j} onFermer={() => setRecents((r) => r.filter((x) => x.id !== j.id))} />)}
        </div>
      )}
      {ouvert && (
        <div className="des-flottant carte-ui jets-joueurs-panneau" role="dialog" aria-label="Jets des joueurs">
          <div className="ligne"><strong style={{ flex: 1 }}>Jets des joueurs</strong><button className="des-fermer" onClick={() => setOuvert(false)} aria-label="Fermer">×</button></div>
          {noms.length > 1 && (
            <div className="ligne">
              <button className={`btn btn-petit ${!filtre ? 'btn-principal' : ''}`} onClick={() => setFiltre('')}>Tous</button>
              {noms.map((n) => <button key={n} className={`btn btn-petit ${filtre === n ? 'btn-principal' : ''}`} onClick={() => setFiltre(n)}>{n}</button>)}
            </div>
          )}
          {!liste.length && <p className="discret" style={{ margin: 0 }}>Aucun jet de joueur pour l’instant. Ils lancent depuis l’onglet Dés de leur écran ; tu peux leur demander un jet dans la page Joueurs.</p>}
          <div className="jets-joueurs-liste">{liste.map((j) => <Carte key={j.id} j={j} />)}</div>
        </div>
      )}
    </>
  );
}
