// Page Pays : les peuples de la campagne (Atlas ou faits main), leur fiche complète et leur calendrier.
import { useState } from 'react';
import { prendreCible } from '../../noyau/bus';
import { useCampagne } from '../../interface/etat';
import { FichePays } from './FichePays';
import { ajouterPeuple, cleDe, peuplesDeCampagne } from './logique';
import './pays.css';

export function Page() {
  const { vue, role, lectureSeule, modifier } = useCampagne();
  const c = vue!;
  const peuples = peuplesDeCampagne(c);
  const [courant, setCourant] = useState<string | null>(() => {
    const cible = prendreCible('pays');
    if (cible) { try { const o = JSON.parse(cible) as { univers: string; cle: number | string }; return `${o.univers}:${String(o.cle)}`; } catch { return cible; } }
    return peuples[0] ? cleDe(peuples[0]) : null;
  });
  const p = peuples.find((x) => cleDe(x) === courant) ?? peuples[0];
  const parUnivers = c.univers.map((u) => ({ u, liste: peuples.filter((x) => x.univers.id === u.id) }));

  return (
    <div className="pays-page">
      <aside className="pays-cote">
        <h1 style={{ margin: 0 }}>Pays</h1>
        {parUnivers.map(({ u, liste }) => (
          <div key={u.id}>
            <h3>{c.campagne.univers?.id === u.id ? '★ ' : ''}{u.nom}</h3>
            {liste.map((x) => (
              <button key={cleDe(x)} className="pays-ligne" aria-current={p && cleDe(x) === cleDe(p) ? 'true' : undefined} onClick={() => setCourant(cleDe(x))}>
                <i style={{ background: x.civ.couleur ?? 'var(--accent)' }} />{x.civ.nom.replace(/^les /, '')}
                <span className="discret">{x.civ.regime ?? ''}</span>
              </button>
            ))}
            {!lectureSeule && (
              <button className="btn btn-petit" onClick={() => {
                const nom = window.prompt('Nom du peuple ou du pays :', 'Nouveau peuple');
                if (!nom) return;
                let cle = '';
                modifier((x) => { const r = ajouterPeuple(x, u.id, nom); cle = r.cle; return r.campagne; });
                window.setTimeout(() => setCourant(`${u.id}:${cle}`), 0);
              }}>+ Peuple</button>
            )}
          </div>
        ))}
        {!c.univers.length && <p className="discret">Aucun monde. Installe un monde depuis Monde (« Ajouter le ciel affiché ») ou crée un monde fait main.</p>}
      </aside>
      <section className="pays-centre">
        {p ? <FichePays key={cleDe(p)} c={c} p={p} mj={role === 'mj'} ro={lectureSeule} modifier={modifier} choisir={setCourant} />
          : <div className="vide">Aucun peuple dans la campagne.</div>}
      </section>
    </div>
  );
}
