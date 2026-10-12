// Page Livre de campagne : choix des sections et des éléments, version MJ ou joueurs, puis création du livre
// (page imprimable : « Enregistrer au format PDF » dans la fenêtre d'impression du navigateur).
import { useState } from 'react';
import { emettre } from '../../noyau/bus';
import { useCampagne } from '../../interface/etat';
import { assemblerLivre, type Progres } from './assembler';
import { choixParDefaut, elementsDe, SECTIONS, type ChoixLivre, type SectionId } from './selection';
import './livre.css';

export function Page() {
  const { campagne, role, modifier } = useCampagne();
  const c = campagne!;
  const enregistre = (c.modules?.livre as { choix?: ChoixLivre } | undefined)?.choix;
  const choix: ChoixLivre = { ...choixParDefaut(), ...enregistre, sections: { ...choixParDefaut().sections, ...enregistre?.sections } };
  const [progres, setProgres] = useState<Progres | null>(null);
  const ecrire = (f: (x: ChoixLivre) => ChoixLivre) => modifier((x) => ({ ...x, modules: { ...x.modules, livre: { ...x.modules?.livre, choix: f(choix) } } }));
  const basculer = (id: string, garder: boolean) => ecrire((x) => ({ ...x, exclus: garder ? x.exclus.filter((y) => y !== id) : [...x.exclus, id] }));
  const tous = (s: SectionId, garder: boolean) => {
    const ids = elementsDe(c, s).map((x) => x.id);
    ecrire((x) => ({ ...x, exclus: garder ? x.exclus.filter((y) => !ids.includes(y)) : [...new Set([...x.exclus, ...ids])] }));
  };

  const creer = async (imprimer: boolean) => {
    // La fenêtre s'ouvre tout de suite (sinon le navigateur la bloque), le livre s'y écrit quand il est prêt.
    const w = window.open('', '_blank');
    if (!w) { emettre('message', { texte: 'Le navigateur a bloqué la fenêtre du livre : autorise les fenêtres surgissantes.', sorte: 'erreur' }); return; }
    w.document.write('<p style="font-family:Georgia;padding:2em">Préparation du livre de campagne…</p>');
    try {
      const html = await assemblerLivre(c, choix, { imprimer, progres: setProgres });
      w.document.open(); w.document.write(html); w.document.close();
    } catch (err) {
      w.close();
      emettre('message', { texte: `Livre impossible : ${(err as Error).message}`, sorte: 'erreur' });
    } finally { setProgres(null); }
  };

  if (role !== 'mj') return <div className="vide">Le livre de campagne se prépare en vue MJ.</div>;
  const sections = SECTIONS.filter((s) => !(choix.version === 'joueurs' && s.mjSeulement));
  return (
    <div className="livre-page">
      <div className="carte-ui pile">
        <h1 style={{ margin: 0 }}>Livre de campagne</h1>
        <p className="discret" style={{ margin: 0 }}>Choisis ce qui entre dans le livre, puis « Créer le livre » : une page mise en forme s’ouvre et la fenêtre d’impression aussi ; choisis « Enregistrer au format PDF » comme imprimante.</p>
        <div className="ligne">
          <label className="ligne"><input type="radio" checked={choix.version === 'mj'} onChange={() => ecrire((x) => ({ ...x, version: 'mj' }))} /> Version MJ (secrets compris)</label>
          <label className="ligne"><input type="radio" checked={choix.version === 'joueurs'} onChange={() => ecrire((x) => ({ ...x, version: 'joueurs' }))} /> Version joueurs (sans secrets ni éléments cachés)</label>
          {choix.version === 'mj' && <label className="ligne"><input type="checkbox" checked={choix.cartesMj} onChange={(e) => ecrire((x) => ({ ...x, cartesMj: e.target.checked }))} /> Cartes en version MJ</label>}
        </div>
        <div className="ligne">
          <button className="btn btn-principal" disabled={!!progres} onClick={() => void creer(true)}>Créer le livre (PDF)</button>
          <button className="btn" disabled={!!progres} onClick={() => void creer(false)}>Aperçu sans imprimer</button>
          {progres && <span className="discret">{progres.texte} {progres.total ? `${progres.fait} / ${progres.total}` : ''}…</span>}
        </div>
      </div>
      <div className="livre-sections">
        {sections.map((s) => {
          const els = elementsDe(c, s.id), garde = els.filter((x) => !choix.exclus.includes(x.id)).length;
          const groupes = [...new Set(els.map((x) => x.groupe ?? ''))];
          return (
            <section key={s.id} className={`carte-ui livre-section ${choix.sections[s.id] ? '' : 'livre-off'}`}>
              <label className="livre-titre">
                <input type="checkbox" checked={choix.sections[s.id]} onChange={(e) => ecrire((x) => ({ ...x, sections: { ...x.sections, [s.id]: e.target.checked } }))} />
                <strong>{s.nom}</strong>{els.length > 0 && <span className="discret">{garde} / {els.length}</span>}
              </label>
              <p className="discret">{s.aide}</p>
              {els.length > 0 && choix.sections[s.id] && (
                <details>
                  <summary>Choisir ({garde} sur {els.length})</summary>
                  <div className="ligne"><button className="btn btn-petit" onClick={() => tous(s.id, true)}>Tout</button><button className="btn btn-petit" onClick={() => tous(s.id, false)}>Rien</button></div>
                  {groupes.map((g) => (
                    <div key={g}>
                      {g && <h4>{g}</h4>}
                      {els.filter((x) => (x.groupe ?? '') === g).map((x) => (
                        <label key={x.id} className="livre-element"><input type="checkbox" checked={!choix.exclus.includes(x.id)} onChange={(e) => basculer(x.id, e.target.checked)} /> {x.libelle}</label>
                      ))}
                    </div>
                  ))}
                </details>
              )}
              {els.length === 0 && !['couverture', 'chronologie'].includes(s.id) && <p className="discret">Rien dans la campagne pour l’instant.</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
