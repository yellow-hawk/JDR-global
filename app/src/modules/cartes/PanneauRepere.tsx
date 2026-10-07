// Édition d'un repère posé sur une carte.
import type { Carte, Repere } from '../../noyau/contrat';
import { emettre } from '../../noyau/bus';
import { useCampagne } from '../../interface/etat';
import { BlocMj, Champ } from '../../interface/composants';
import { SORTES_REPERE, modifierRepere, supprimerRepere } from './logique';

export function PanneauRepere({ carte, repere: r, onFermer, onOuvrir }: { carte: Carte; repere: Repere; onFermer(): void; onOuvrir(id: string): void }) {
  const { campagne, role, lectureSeule, modifier } = useCampagne();
  const maj = (f: (x: Repere) => Repere) => modifier((c) => modifierRepere(c, carte.id, r.id, f));
  const mj = (r.mj ?? {}) as { desc?: string; cache?: boolean };
  const lien = r.lien && (r.lien.type === 'carte' || r.lien.type === 'rencontre') ? `${r.lien.type}:${r.lien.id}` : '';

  return (
    <fieldset disabled={lectureSeule} className="pile cartes-champs">
      <div className="ligne"><h3 style={{ margin: 0, flex: 1 }}>Repère</h3><button type="button" className="btn btn-petit" onClick={onFermer}>Fermer</button></div>
      <Champ libelle="Nom"><input value={r.nom} onChange={(e) => maj((x) => ({ ...x, nom: e.target.value }))} /></Champ>
      <Champ libelle="Sorte">
        <select value={r.sorte} onChange={(e) => maj((x) => ({ ...x, sorte: e.target.value }))}>
          {SORTES_REPERE.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
        </select>
      </Champ>
      <Champ libelle="Ce que les joueurs savent"><textarea value={r.desc ?? ''} onChange={(e) => maj((x) => ({ ...x, desc: e.target.value }))} /></Champ>
      <Champ libelle="Lien">
        <select value={lien} onChange={(e) => {
          const [type, id] = e.target.value.split(':');
          maj((x) => ({ ...x, lien: id ? { type: type as 'carte' | 'rencontre', id } : null }));
        }}>
          <option value="">Aucun</option>
          <optgroup label="Carte">
            {(campagne?.cartes ?? []).filter((k) => k.id !== carte.id).map((k) => <option key={k.id} value={`carte:${k.id}`}>{k.nom}</option>)}
          </optgroup>
          <optgroup label="Rencontre (combat)">
            {(campagne?.rencontres ?? []).map((x) => <option key={x.id} value={`rencontre:${x.id}`}>{x.nom}</option>)}
          </optgroup>
        </select>
      </Champ>
      {r.lien?.type === 'carte' && <button type="button" className="btn btn-petit btn-principal" onClick={() => onOuvrir(r.lien!.id)}>Ouvrir la carte liée</button>}
      {r.lien?.type === 'rencontre' && (
        <button type="button" className="btn btn-petit btn-principal" onClick={() => emettre('naviguer', { page: 'combat', cible: r.lien!.id })}>Lancer le combat</button>
      )}
      {role === 'mj' && (
        <BlocMj>
          <div className="pile" style={{ gap: 8 }}>
            <Champ libelle="Secret du lieu"><textarea value={mj.desc ?? ''} onChange={(e) => maj((x) => ({ ...x, mj: { ...(x.mj ?? {}), desc: e.target.value } }))} /></Champ>
            <label className="ligne discret">
              <input type="checkbox" checked={!!mj.cache} onChange={(e) => maj((x) => ({ ...x, mj: { ...(x.mj ?? {}), cache: e.target.checked } }))} />
              Repère caché aux joueurs
            </label>
          </div>
        </BlocMj>
      )}
      <button type="button" className="btn btn-danger btn-petit" onClick={() => { modifier((c) => supprimerRepere(c, carte.id, r.id)); onFermer(); }}>Supprimer le repère</button>
    </fieldset>
  );
}
