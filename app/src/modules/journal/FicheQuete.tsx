// Fiche d'une quête : résumé, étapes (texte joueurs + bloc MJ), PNJ liés, récompenses, statut.
import type { Quete, StatutQuete } from '../../noyau/contrat';
import { emettre, montrerAuxJoueurs } from '../../noyau/bus';
import { useCampagne } from '../../interface/etat';
import { BlocMj, Champ } from '../../interface/composants';
import { appliquerReputationQuete } from '../pays';
import { EffetsReputation } from './EffetsReputation';
import { SORTES_QUETE, STATUTS, modifierQuete, sceneQuete, supprimerQuete } from './logique';

const texte = (v: unknown): string => (Array.isArray(v) ? v.join('\n') : typeof v === 'string' ? v : '');
const LIBELLES_MJ: Record<string, string> = {
  verite: 'La vérité', histoire: 'Histoire', antagoniste: 'Antagoniste', fins: 'Fins possibles', lien: 'Lien avec la quête principale',
  adversaire: 'Adversaire', danger: 'Danger', choix: 'Choix et conséquences', notes: 'Notes', titre: 'Vrai titre', lieu: 'Vrai lieu',
  texte: 'Pour le MJ', joueurs: 'Ce que vivent les joueurs', obstacle: 'Obstacle',
};
const champsMj = (mj: Record<string, unknown> | undefined, sauf: string[] = []) =>
  Object.entries(mj ?? {}).filter(([k, v]) => !sauf.includes(k) && texte(v));

export function FicheQuete({ quete: q, onFermer }: { quete: Quete; onFermer(): void }) {
  const { vue, role, lectureSeule, modifier } = useCampagne();
  const c = vue!;
  const maj = (f: (x: Quete) => Quete) => modifier((x) => modifierQuete(x, q.id, f));
  const pnj = q.personnages.map((r) => c.personnages.find((p) => p.id === r.id)).filter(Boolean);
  const notes = String((q.mj as { notes?: string } | undefined)?.notes ?? '');

  return (
    <div className="carte-ui pile journal-fiche">
      <div className="ligne">
        <button className="btn btn-petit" onClick={onFermer}>← Quêtes</button>
        <span style={{ flex: 1 }} />
        {!lectureSeule && (
          <button className="btn btn-petit btn-mj" onClick={() => { montrerAuxJoueurs(sceneQuete(q)); emettre('message', { texte: 'Quête affichée sur l’écran joueurs.', sorte: 'succes' }); }}>
            Montrer aux joueurs
          </button>
        )}
      </div>
      <fieldset disabled={lectureSeule} className="journal-champs">
        <Champ libelle="Titre"><input value={q.titre} onChange={(e) => maj((x) => ({ ...x, titre: e.target.value }))} /></Champ>
        <Champ libelle="Statut">
          <select value={q.statut ?? 'a-venir'} onChange={(e) => {
            const statut = e.target.value as StatutQuete;
            modifier((x) => appliquerReputationQuete(modifierQuete(x, q.id, (y) => ({ ...y, statut })), q.id, new Date().toISOString()));
            if (statut === 'terminee' && q.reputation?.length) emettre('message', { texte: 'Réputation mise à jour auprès des peuples concernés.', sorte: 'succes' });
          }}>
            {STATUTS.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
          </select>
        </Champ>
        <Champ libelle="Sorte">
          <select value={q.sorte ?? 'secondaire'} onChange={(e) => maj((x) => ({ ...x, sorte: e.target.value }))}>
            {SORTES_QUETE.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Champ>
      </fieldset>
      <fieldset disabled={lectureSeule} className="journal-champs-1">
        <Champ libelle="Ce que les joueurs savent"><textarea value={q.resume ?? ''} onChange={(e) => maj((x) => ({ ...x, resume: e.target.value }))} /></Champ>
      </fieldset>
      {q.lieuxTexte?.length ? <p className="discret">Lieux : {q.lieuxTexte.join(' · ')}</p> : null}
      {pnj.length > 0 && (
        <p className="discret">PNJ : {pnj.map((p, i) => (
          <button key={p!.id} className="journal-lien" onClick={() => emettre('naviguer', { page: 'personnages', cible: p!.id })}>{p!.nom}{i < pnj.length - 1 ? ',' : ''}</button>
        ))}</p>
      )}

      {q.etapes?.length ? (
        <div className="pile" style={{ gap: 8 }}>
          <h3>Étapes</h3>
          {q.etapes.map((e, i) => (
            <div key={i} className="journal-etape">
              <strong>{i + 1}. {e.titre}</strong>{e.lieu ? <span className="discret"> · {e.lieu}</span> : null}
              <p>{e.joueurs}</p>
              {role === 'mj' && champsMj(e.mj).length > 0 && (
                <BlocMj>{champsMj(e.mj).map(([k, v]) => <p key={k}><em>{LIBELLES_MJ[k] ?? k} :</em> {texte(v)}</p>)}</BlocMj>
              )}
            </div>
          ))}
        </div>
      ) : null}
      {q.recompenses?.length ? <p><strong>Récompenses :</strong> {q.recompenses.join(' · ')}</p> : null}

      {role === 'mj' && <EffetsReputation c={c} q={q} ro={lectureSeule} maj={maj} />}
      {role === 'mj' && (
        <BlocMj>
          <div className="pile" style={{ gap: 6 }}>
            {champsMj(q.mj, ['notes', 'pnjSecrets', 'cache']).map(([k, v]) => <p key={k} style={{ whiteSpace: 'pre-wrap' }}><em>{LIBELLES_MJ[k] ?? k} :</em> {texte(v)}</p>)}
            <Champ libelle="Notes du MJ">
              <textarea value={notes} onChange={(e) => maj((x) => ({ ...x, mj: { ...(x.mj ?? {}), notes: e.target.value } }))} />
            </Champ>
            <label className="ligne discret">
              <input type="checkbox" checked={!!(q.mj as { cache?: boolean } | undefined)?.cache} onChange={(e) => maj((x) => ({ ...x, mj: { ...(x.mj ?? {}), cache: e.target.checked } }))} />
              Quête cachée aux joueurs
            </label>
          </div>
        </BlocMj>
      )}
      {!lectureSeule && (
        <button className="btn btn-danger btn-petit" style={{ alignSelf: 'flex-start' }}
          onClick={() => { if (window.confirm(`Supprimer « ${q.titre} » ?`)) { modifier((x) => supprimerQuete(x, q.id)); onFermer(); } }}>
          Supprimer la quête
        </button>
      )}
    </div>
  );
}
