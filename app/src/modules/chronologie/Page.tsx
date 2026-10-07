// Page Chronologie : horloge du temps de jeu + frise (histoire des peuples, séances, événements de la campagne).
import { useState } from 'react';
import type { Evenement } from '../../noyau/contrat';
import { emettre } from '../../noyau/bus';
import { useCampagne } from '../../interface/etat';
import { BlocMj, Champ } from '../../interface/composants';
import { Frise } from './Frise';
import { Horloge } from './Horloge';
import { useBandeau } from './EnTete';
import { SORTES_EVENEMENT, ajouterEvenement, elementsFrise, modifierEvenement, reference, supprimerEvenement, tempsDe } from './logique';
import './chronologie.css';

export function Page() {
  const { vue, role, lectureSeule, modifier } = useCampagne();
  const c = vue!;
  const [choisi, setChoisi] = useState<string | null>(null);
  const [bandeau, setBandeau] = useBandeau();
  const { elements, lignes, maintenant } = elementsFrise(c);
  const el = elements.find((e) => e.id === choisi);
  const evt = el?.sorte === 'evenement' ? (c.evenements ?? []).find((e) => e.id === el.id) : undefined;
  const r = reference(c);

  const noter = () => {
    let id = '';
    modifier((x) => { const res = ajouterEvenement(x, { titre: 'Nouvel événement', date: tempsDe(x).date }); id = res.id; return res.campagne; });
    window.setTimeout(() => setChoisi(id), 0);
  };
  const majEvt = (f: (e: Evenement) => Evenement) => evt && modifier((x) => modifierEvenement(x, evt.id, f));

  return (
    <div className="chrono-page">
      <div className="chrono-haut">
        <div className="pile" style={{ gap: 6 }}>
          <h1 style={{ margin: 0 }}>Chronologie</h1>
          <p className="discret" style={{ margin: 0 }}>Le temps du monde avance pendant les séances. Les nouvelles séances prennent la date courante.</p>
          <Horloge c={c} ro={lectureSeule} modifier={modifier} onNoter={noter} bandeau={bandeau} setBandeau={setBandeau} />
        </div>
        <aside className="chrono-detail carte-ui">
          {!el && <p className="discret">Clique un point de la frise pour le détail. Molette : zoom · glisser : se déplacer.</p>}
          {el && !evt && (
            <>
              <span className="discret">{el.ligne}</span>
              <h2 style={{ margin: 0 }}>{el.titre}</h2>
              {el.texte && <p style={{ whiteSpace: 'pre-wrap' }}>{el.texte}</p>}
              {el.cible && <button className="btn btn-petit btn-principal" onClick={() => emettre('naviguer', el.cible!)}>Ouvrir</button>}
            </>
          )}
          {evt && (
            <fieldset disabled={lectureSeule} className="pile" style={{ gap: 8 }}>
              <Champ libelle="Titre"><input value={evt.titre} onChange={(e) => majEvt((x) => ({ ...x, titre: e.target.value }))} /></Champ>
              <div className="ligne">
                <Champ libelle="Jour"><input type="number" className="chrono-nb" value={evt.date.jour} onChange={(e) => majEvt((x) => ({ ...x, date: { ...x.date, jour: Number(e.target.value) || 1 } }))} /></Champ>
                <Champ libelle="Mois">
                  <select value={evt.date.mois} onChange={(e) => majEvt((x) => ({ ...x, date: { ...x.date, mois: Number(e.target.value) } }))}>
                    {r.cal.mois.map((m, i) => <option key={i} value={i + 1}>{m.nom}</option>)}
                  </select>
                </Champ>
                <Champ libelle="An"><input type="number" className="chrono-nb" value={evt.date.an} onChange={(e) => majEvt((x) => ({ ...x, date: { ...x.date, an: Number(e.target.value) || 0 } }))} /></Champ>
              </div>
              <Champ libelle="Sorte">
                <select value={evt.sorte ?? 'événement'} onChange={(e) => majEvt((x) => ({ ...x, sorte: e.target.value }))}>
                  {SORTES_EVENEMENT.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Champ>
              <Champ libelle="Ce qui s’est passé (visible des joueurs)"><textarea rows={4} value={evt.texte ?? ''} onChange={(e) => majEvt((x) => ({ ...x, texte: e.target.value }))} /></Champ>
              {role === 'mj' && (
                <BlocMj>
                  <label className="ligne discret"><input type="checkbox" checked={!!(evt.mj as { cache?: boolean } | undefined)?.cache} onChange={(e) => majEvt((x) => ({ ...x, mj: { ...(x.mj ?? {}), cache: e.target.checked } }))} /> Secret (caché aux joueurs)</label>
                  <Champ libelle="Notes MJ"><textarea rows={2} value={String((evt.mj as { notes?: string } | undefined)?.notes ?? '')} onChange={(e) => majEvt((x) => ({ ...x, mj: { ...(x.mj ?? {}), notes: e.target.value } }))} /></Champ>
                </BlocMj>
              )}
              <button type="button" className="btn btn-petit btn-danger" onClick={() => { modifier((x) => supprimerEvenement(x, evt.id)); setChoisi(null); }}>Supprimer l’événement</button>
            </fieldset>
          )}
        </aside>
      </div>
      <Frise elements={elements} lignes={lignes} maintenant={maintenant} choisi={choisi} onChoisir={setChoisi} />
    </div>
  );
}
