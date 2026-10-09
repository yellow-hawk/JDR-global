// Onglet Histoire : relations, journal du personnage, secrets du MJ.
import { BlocMj, Champ } from '../../../interface/composants';
import { emettre } from '../../../noyau/bus';
import { Relations } from '../PanneauRelations';
import { majFiche, type PropsOnglet } from './types';

type Entree = NonNullable<NonNullable<PropsOnglet['p']['fiche']>['journal']>[number];
const estSecret = (e: Entree) => !!(e.mj as { cache?: boolean } | undefined)?.cache;

export function Histoire({ p, role, lectureSeule, maj }: PropsOnglet) {
  const mj = (p.mj ?? {}) as { notes?: string; cache?: boolean };
  const majMj = (patch: Record<string, unknown>) => maj((x) => ({ ...x, mj: { ...(x.mj ?? {}), ...patch } }));
  const journal = p.fiche?.journal ?? [];
  const majEntree = (i: number, patch: Partial<Entree>) => majFiche(maj, 'journal', (l) => (l ?? []).map((y, j) => (j === i ? { ...y, ...patch } : y)));

  return (
    <div className="pile">
      <Relations persoId={p.id} />
      <section className="pile" style={{ gap: 6 }}>
        <h3>Journal du personnage</h3>
        {journal.map((e, i) => (role === 'mj' || !estSecret(e)) && (
          <fieldset key={i} disabled={lectureSeule} className="perso-groupe ligne" style={{ alignItems: 'flex-start' }}>
            <input value={e.quand} style={{ width: 120 }} onChange={(ev) => majEntree(i, { quand: ev.target.value })} />
            <textarea rows={2} style={{ flex: 1 }} value={e.texte} onChange={(ev) => majEntree(i, { texte: ev.target.value })} />
            {role === 'mj' && (
              <label className="ligne discret" title="Entrée cachée aux joueurs">
                <input type="checkbox" checked={estSecret(e)} onChange={(ev) => majEntree(i, { mj: ev.target.checked ? { cache: true } : undefined })} /> secret
              </label>
            )}
            <button type="button" className="btn btn-petit" onClick={() => majFiche(maj, 'journal', (l) => (l ?? []).filter((_, j) => j !== i))}>✕</button>
          </fieldset>
        ))}
        {!lectureSeule && (
          <button className="btn btn-petit" style={{ alignSelf: 'flex-start' }}
            onClick={() => majFiche(maj, 'journal', (l) => [...(l ?? []), { quand: new Date().toLocaleDateString('fr-FR'), texte: '' }])}>
            + Entrée
          </button>
        )}
      </section>
      {role === 'mj' && (
        <button className="btn btn-petit" style={{ alignSelf: 'flex-start' }} onClick={() => emettre('naviguer', { page: 'genealogie', cible: p.id })}>Arbre généalogique</button>
      )}
      {role === 'mj' && (
        <BlocMj>
          <fieldset disabled={lectureSeule} className="perso-groupe pile" style={{ gap: 10 }}>
            <Champ libelle="Secrets, motivations, tactique">
              <textarea value={mj.notes ?? ''} onChange={(e) => majMj({ notes: e.target.value })} />
            </Champ>
            <label className="ligne discret">
              <input type="checkbox" checked={!!mj.cache} onChange={(e) => majMj({ cache: e.target.checked })} />
              Personnage entièrement caché aux joueurs
            </label>
          </fieldset>
        </BlocMj>
      )}
    </div>
  );
}
