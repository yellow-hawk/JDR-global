// En-tête (MJ) : programme de la séance. On prépare la liste de ce qu'on montrera (dans les modules qui savent
// montrer quelque chose), puis « Suivant » l'envoie sur l'écran joueurs, dans l'ordre. Alt+N : suivant.
import { useEffect, useState } from 'react';
import { emettre } from '../noyau/bus';
import { useCampagne } from './etat';
import { MODULES } from './registre';
import {
  ajouterAuProgramme, deplacerDansProgramme, montreDansProgramme, programmeDe, recommencerProgramme, retirerDuProgramme, viderProgramme,
} from './programmeSeance';

const MONTRABLES = MODULES.filter((m) => m.montrables);

export function Programme() {
  const { campagne, modifier } = useCampagne();
  const [ouvert, setOuvert] = useState(false);
  const [choix, setChoix] = useState('');
  const p = campagne ? programmeDe(campagne) : { liste: [], position: 0 };

  const montrer = async (i: number) => {
    const e = p.liste[i], m = MONTRABLES.find((x) => x.id === e?.module);
    if (!campagne || !e || !m) return;
    const ok = await m.montrables!.montrer(campagne, e.id);
    if (!ok) { emettre('message', { texte: `« ${e.nom} » n’existe plus ou n’a rien à montrer.`, sorte: 'erreur' }); return; }
    modifier((x) => montreDansProgramme(x, i));
    emettre('message', { texte: `Programme : « ${e.nom} » sur l’écran joueurs.`, sorte: 'succes' });
  };
  const suivant = () => { if (p.position < p.liste.length) void montrer(p.position); };

  useEffect(() => {
    const touche = (ev: KeyboardEvent) => { if (ev.altKey && ev.key.toLowerCase() === 'n' && campagne) { ev.preventDefault(); suivant(); } };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  });

  if (!campagne || !MONTRABLES.length) return null;
  const prochain = p.liste[p.position];
  return (
    <>
      <button className={`btn btn-petit ${ouvert ? 'btn-principal' : ''}`} onClick={() => setOuvert(!ouvert)} title="Programme de la séance : ce que tu montreras, dans l'ordre (Alt+N : suivant)">
        🎬{p.liste.length ? ` ${p.position}/${p.liste.length}` : ''}
      </button>
      {prochain && (
        <button className="btn btn-petit btn-mj" onClick={suivant} title={`Montrer « ${prochain.nom} » (Alt+N)`}>▶ {prochain.nom.length > 18 ? `${prochain.nom.slice(0, 17)}…` : prochain.nom}</button>
      )}
      {ouvert && (
        <div className="des-flottant carte-ui programme" role="dialog" aria-label="Programme de la séance">
          <div className="ligne"><strong style={{ flex: 1 }}>Programme de la séance</strong><button className="des-fermer" onClick={() => setOuvert(false)} aria-label="Fermer">×</button></div>
          <div className="ligne">
            <select value={choix} onChange={(e) => setChoix(e.target.value)} style={{ flex: 1, minWidth: 0 }}>
              <option value="">Ajouter…</option>
              {MONTRABLES.map((m) => {
                const liste = m.montrables!.lister(campagne);
                return liste.length ? <optgroup key={m.id} label={m.montrables!.titre}>{liste.map((x) => <option key={x.id} value={`${m.id}|${x.id}`}>{x.nom}</option>)}</optgroup> : null;
              })}
            </select>
            <button className="btn btn-petit btn-principal" disabled={!choix} onClick={() => {
              const [module, id] = choix.split('|');
              const nom = MONTRABLES.find((m) => m.id === module)?.montrables!.lister(campagne).find((x) => x.id === id)?.nom ?? id;
              modifier((x) => ajouterAuProgramme(x, { module, id, nom })); setChoix('');
            }}>Ajouter</button>
          </div>
          {!p.liste.length && <p className="discret" style={{ margin: 0 }}>Prépare ici ce que tu montreras ce soir : cartes, personnages, documents, quêtes, peuples. Pendant la séance, « ▶ » dans l’en-tête (ou Alt+N) montre le suivant.</p>}
          <ol className="programme-liste">
            {p.liste.map((e, i) => (
              <li key={`${e.module}-${e.id}-${i}`} className={i < p.position ? 'fait' : i === p.position ? 'prochain' : ''}>
                <span className="programme-nom" title={MONTRABLES.find((m) => m.id === e.module)?.montrables?.titre}>{e.nom}</span>
                <button className="combat-oeil" title="Montrer maintenant" onClick={() => void montrer(i)}>▶</button>
                <button className="combat-oeil" title="Plus tôt" disabled={i === 0} onClick={() => modifier((x) => deplacerDansProgramme(x, i, -1))}>↑</button>
                <button className="combat-oeil" title="Plus tard" disabled={i === p.liste.length - 1} onClick={() => modifier((x) => deplacerDansProgramme(x, i, 1))}>↓</button>
                <button className="combat-oeil" title="Retirer" onClick={() => modifier((x) => retirerDuProgramme(x, i))}>×</button>
              </li>
            ))}
          </ol>
          {p.liste.length > 0 && (
            <div className="ligne">
              <button className="btn btn-petit btn-mj" disabled={p.position >= p.liste.length} onClick={suivant}>Suivant ▶</button>
              <button className="btn btn-petit" onClick={() => modifier(recommencerProgramme)}>Recommencer</button>
              <span style={{ flex: 1 }} />
              <button className="btn btn-petit" onClick={() => window.confirm('Vider le programme ?') && modifier(viderProgramme)}>Vider</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
