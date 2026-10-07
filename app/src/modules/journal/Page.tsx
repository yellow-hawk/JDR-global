// Page Journal : onglets Quêtes et Séances.
import { useState } from 'react';
import { prendreCible } from '../../noyau/bus';
import { useCampagne } from '../../interface/etat';
import { FicheQuete } from './FicheQuete';
import { Seances } from './Seances';
import { Preparer } from './Preparer';
import { STATUTS, nouvelleQuete, trierQuetes } from './logique';
import './journal.css';

export function Page() {
  const { vue, role, lectureSeule, modifier } = useCampagne();
  const [onglet, setOnglet] = useState<'quetes' | 'seances' | 'preparer'>('quetes');
  const [ouverte, setOuverte] = useState<string | null>(() => prendreCible('journal') ?? null);
  const c = vue!;
  const quete = c.quetes.find((q) => q.id === ouverte);
  const liste = trierQuetes(c.quetes);

  return (
    <div className="pile" style={{ maxWidth: 920 }}>
      <div className="ligne">
        <h1 style={{ margin: 0, flex: 1 }}>Journal</h1>
        <button className={`btn btn-petit ${onglet === 'quetes' ? 'btn-principal' : ''}`} onClick={() => setOnglet('quetes')}>Quêtes ({c.quetes.length})</button>
        <button className={`btn btn-petit ${onglet === 'seances' ? 'btn-principal' : ''}`} onClick={() => setOnglet('seances')}>Séances ({c.seances.length})</button>
        {role === 'mj' && <button className={`btn btn-petit ${onglet === 'preparer' ? 'btn-mj' : ''}`} onClick={() => setOnglet('preparer')}>Préparer la séance</button>}
      </div>

      {onglet === 'seances' && <Seances />}
      {onglet === 'preparer' && role === 'mj' && <Preparer versSeances={() => setOnglet('seances')} />}

      {onglet === 'quetes' && quete && <FicheQuete key={quete.id} quete={quete} onFermer={() => setOuverte(null)} />}

      {onglet === 'quetes' && !quete && (
        <>
          <div className="ligne">
            <p className="discret" style={{ flex: 1, margin: 0 }}>Quêtes importées depuis l'Atlas (Monde → Importer les quêtes) ou écrites à la main.</p>
            {!lectureSeule && (
              <button className="btn btn-principal" onClick={() => { let id = ''; modifier((x) => { const r = nouvelleQuete(x); id = r.id; return r.campagne; }); window.setTimeout(() => setOuverte(id), 0); }}>
                + Quête
              </button>
            )}
          </div>
          {liste.length === 0 && <div className="vide">Aucune quête pour l'instant.</div>}
          {STATUTS.map((st) => {
            const qs = liste.filter((q) => (q.statut ?? 'a-venir') === st.id);
            if (!qs.length) return null;
            return (
              <div key={st.id}>
                <h3 className="journal-groupe">{st.libelle}</h3>
                <div className="grille-cartes">
                  {qs.map((q) => (
                    <button key={q.id} className="carte-ui journal-tuile" onClick={() => setOuverte(q.id)}>
                      <span className="discret">{q.sorte ?? ''}{q.source.sorte === 'atlas' ? ' · Atlas' : ''}{(q.mj as { cache?: boolean } | undefined)?.cache ? ' · cachée' : ''}</span>
                      <strong>{q.titre}</strong>
                      <span className="journal-resume">{q.resume}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
