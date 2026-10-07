// Monde fait main : nom, carte du monde (choisie dans Cartes) enroulée sur le globe, peuples.
import type { Projection, Univers } from '../../noyau/contrat';
import { nouvelId } from '../../noyau/contrat';
import { useCampagne } from '../../interface/etat';
import { BlocMj, Champ, useUrlFichier } from '../../interface/composants';
import { Globe } from './Globe';
import { modifierUnivers } from './logique';

const PROJ_DEFAUT: Projection = { sorte: 'equirectangulaire', lonMin: -180, lonMax: 180, latMin: -70, latMax: 70, remplissagePoles: 'glace' };

export function UniversFaitMain({ univers: u, onFermer }: { univers: Univers; onFermer(): void }) {
  const { vue, role, lectureSeule, modifier } = useCampagne();
  const c = vue!;
  const maj = (f: (x: Univers) => Univers) => modifier((x) => modifierUnivers(x, u.id, f));
  const monde = u.monde ?? { carte: null, peuples: [] };
  const carte = c.cartes.find((k) => k.id === monde.carte?.id) ?? null;
  const url = useUrlFichier(c.campagne.id, carte?.images.joueurs);
  const proj = carte?.projection?.sorte === 'equirectangulaire' ? carte.projection : PROJ_DEFAUT;
  const majProj = (p: Partial<Projection>) => carte && modifier((x) => ({
    ...x, cartes: x.cartes.map((k) => (k.id === carte.id ? { ...k, projection: { ...proj, ...p } } : k)),
  }));
  const majMonde = (f: (m: typeof monde) => typeof monde) => maj((x) => ({ ...x, monde: f(x.monde ?? { carte: null, peuples: [] }) }));

  return (
    <div className="pile monde-fait-main">
      <div className="ligne"><h2 style={{ margin: 0, flex: 1 }}>{u.nom}</h2><button className="btn btn-petit" onClick={onFermer}>Revenir à l'Atlas</button></div>
      <fieldset disabled={lectureSeule} className="monde-champs">
        <Champ libelle="Nom du monde"><input value={u.nom} onChange={(e) => maj((x) => ({ ...x, nom: e.target.value }))} /></Champ>
        <Champ libelle="Carte du monde (module Cartes)">
          <select value={monde.carte?.id ?? ''} onChange={(e) => majMonde((m) => ({ ...m, carte: e.target.value ? { type: 'carte', id: e.target.value } : null }))}>
            <option value="">Aucune</option>
            {c.cartes.map((k) => <option key={k.id} value={k.id}>{k.nom}{k.type === 'monde' ? '' : ` (${k.type})`}</option>)}
          </select>
        </Champ>
      </fieldset>

      {carte && url ? (
        <>
          <Globe url={url} projection={proj} />
          {!lectureSeule && (
            <div className="ligne discret">
              Latitudes couvertes par la carte :
              <input type="number" className="monde-nb" value={proj.latMin} min={-90} max={0} onChange={(e) => majProj({ latMin: Number(e.target.value) })} /> à
              <input type="number" className="monde-nb" value={proj.latMax} min={0} max={90} onChange={(e) => majProj({ latMax: Number(e.target.value) })} />°
              · pôles :
              <select value={proj.remplissagePoles} onChange={(e) => majProj({ remplissagePoles: e.target.value as Projection['remplissagePoles'] })}>
                <option value="glace">glace</option><option value="ocean">océan</option><option value="couleur">terre</option>
              </select>
            </div>
          )}
        </>
      ) : <div className="vide">Choisis une carte du monde (format 2:1 conseillé) pour la voir sur le globe.</div>}

      <h3>Peuples</h3>
      {monde.peuples.map((p) => (
        <fieldset key={p.id} disabled={lectureSeule} className="monde-peuple">
          <input type="color" value={p.couleur ?? '#b07a2e'} aria-label="Couleur" onChange={(e) => majMonde((m) => ({ ...m, peuples: m.peuples.map((x) => (x.id === p.id ? { ...x, couleur: e.target.value } : x)) }))} />
          <input value={p.nom} aria-label="Nom du peuple" onChange={(e) => majMonde((m) => ({ ...m, peuples: m.peuples.map((x) => (x.id === p.id ? { ...x, nom: e.target.value } : x)) }))} />
          <input value={p.desc ?? ''} placeholder="Description" aria-label="Description" onChange={(e) => majMonde((m) => ({ ...m, peuples: m.peuples.map((x) => (x.id === p.id ? { ...x, desc: e.target.value } : x)) }))} />
          <button type="button" className="btn btn-petit btn-danger" onClick={() => majMonde((m) => ({ ...m, peuples: m.peuples.filter((x) => x.id !== p.id) }))}>×</button>
        </fieldset>
      ))}
      {!lectureSeule && (
        <button className="btn btn-petit" style={{ alignSelf: 'flex-start' }}
          onClick={() => majMonde((m) => ({ ...m, peuples: [...m.peuples, { id: nouvelId('peuple'), nom: 'Nouveau peuple', couleur: '#b07a2e', desc: '' }] }))}>
          + Peuple
        </button>
      )}

      {role === 'mj' && (
        <BlocMj>
          <Champ libelle="Notes MJ sur ce monde">
            <textarea value={String((u.mj as { notes?: string } | undefined)?.notes ?? '')} onChange={(e) => maj((x) => ({ ...x, mj: { ...(x.mj ?? {}), notes: e.target.value } }))} />
          </Champ>
        </BlocMj>
      )}
    </div>
  );
}
