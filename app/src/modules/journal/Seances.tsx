// Journal des séances : date réelle, date du monde, résumé, quêtes liées, notes MJ.
import type { DateMonde, Seance } from '../../noyau/contrat';
import { emettre, montrerAuxJoueurs } from '../../noyau/bus';
import { useCampagne } from '../../interface/etat';
import { BlocMj, Champ } from '../../interface/composants';
import { dateLisible, reference, tempsDe } from '../chronologie';
import { modifierSeance, nouvelleSeance, sceneSeance, supprimerSeance } from './logique';

export function Seances() {
  const { vue, role, lectureSeule, modifier } = useCampagne();
  const c = vue!;
  const seances = [...c.seances].sort((a, b) => b.numero - a.numero);
  const cal = reference(c).cal;
  const maj = (id: string, f: (s: Seance) => Seance) => modifier((x) => modifierSeance(x, id, f));
  const majDate = (s: Seance, k: keyof DateMonde, v: string) =>
    maj(s.id, (x) => ({ ...x, dateMonde: { ...(x.dateMonde ?? { an: 1, mois: 1, jour: 1 }), [k]: Number(v) || 0 } }));

  return (
    <div className="pile">
      {!lectureSeule && (
        <button className="btn btn-principal" style={{ alignSelf: 'flex-start' }}
          onClick={() => modifier((x) => nouvelleSeance(x, new Date().toISOString().slice(0, 10), tempsDe(x).date).campagne)}>
          + Nouvelle séance
        </button>
      )}
      {seances.length === 0 && <div className="vide">Aucune séance notée.</div>}
      {seances.map((s) => (
        <details key={s.id} className="carte-ui journal-seance" open={s === seances[0]}>
          <summary>Séance {s.numero} · {s.date}{s.dateMonde ? ` · ${dateLisible(s.dateMonde, cal)}` : ''}</summary>
          <fieldset disabled={lectureSeule} className="pile journal-champs-1">
            <div className="ligne">
              <Champ libelle="Date"><input type="date" value={s.date} onChange={(e) => maj(s.id, (x) => ({ ...x, date: e.target.value }))} /></Champ>
              <Champ libelle="An (monde)"><input type="number" className="journal-nb" value={s.dateMonde?.an ?? ''} onChange={(e) => majDate(s, 'an', e.target.value)} /></Champ>
              <Champ libelle="Mois"><input type="number" className="journal-nb" value={s.dateMonde?.mois ?? ''} onChange={(e) => majDate(s, 'mois', e.target.value)} /></Champ>
              <Champ libelle="Jour"><input type="number" className="journal-nb" value={s.dateMonde?.jour ?? ''} onChange={(e) => majDate(s, 'jour', e.target.value)} /></Champ>
            </div>
            <Champ libelle="Résumé (visible des joueurs)"><textarea value={s.resume ?? ''} onChange={(e) => maj(s.id, (x) => ({ ...x, resume: e.target.value }))} /></Champ>
            {c.quetes.length > 0 && (
              <div className="ligne discret">
                Quêtes :
                {c.quetes.map((q) => {
                  const lie = s.liens.some((l) => l.type === 'quete' && l.id === q.id);
                  return (
                    <label key={q.id} className="ligne" style={{ gap: 4 }}>
                      <input type="checkbox" checked={lie} onChange={() => maj(s.id, (x) => ({
                        ...x, liens: lie ? x.liens.filter((l) => !(l.type === 'quete' && l.id === q.id)) : [...x.liens, { type: 'quete', id: q.id }],
                      }))} />{q.titre}
                    </label>
                  );
                })}
              </div>
            )}
            {role === 'mj' && (
              <BlocMj>
                <Champ libelle="Notes du MJ (à préparer, ce qui s'est vraiment passé…)">
                  <textarea value={String((s.mj as { notes?: string } | undefined)?.notes ?? '')} onChange={(e) => maj(s.id, (x) => ({ ...x, mj: { ...(x.mj ?? {}), notes: e.target.value } }))} />
                </Champ>
              </BlocMj>
            )}
            {!lectureSeule && (
              <div className="ligne">
                <button type="button" className="btn btn-petit btn-mj" onClick={() => { montrerAuxJoueurs(sceneSeance(s, c.quetes)); emettre('message', { texte: 'Résumé affiché sur l’écran joueurs.', sorte: 'succes' }); }}>
                  Montrer le résumé aux joueurs
                </button>
                <span style={{ flex: 1 }} />
                <button type="button" className="btn btn-petit btn-danger" onClick={() => window.confirm(`Supprimer la séance ${s.numero} ?`) && modifier((x) => supprimerSeance(x, s.id))}>Supprimer</button>
              </div>
            )}
          </fieldset>
        </details>
      ))}
    </div>
  );
}
