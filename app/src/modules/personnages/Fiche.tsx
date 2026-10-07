// Fiche d'un personnage : identité, portrait, stats (générées depuis le système de règles), bloc MJ.
import type { Personnage, SortePersonnage } from '../../noyau/contrat';
import type { SystemeRegles } from '../../noyau/regles';
import { ecrireStat, lireStat } from '../../noyau/regles';
import { emettre } from '../../noyau/bus';
import { BlocMj, Champ } from '../../interface/composants';
import { SORTES, champsVisibles } from './logique';
import { Relations } from './PanneauRelations';

interface Props {
  perso: Personnage;
  R: SystemeRegles;
  role: 'mj' | 'joueurs';
  lectureSeule: boolean;
  urlPortrait: string | null;
  maj(f: (p: Personnage) => Personnage): void;
  onPortrait(): void;
  onMontrer(): void;
  onSupprimer(): void;
  onAvatar(): void;
}

export function Fiche({ perso: p, R, role, lectureSeule, urlPortrait, maj, onPortrait, onMontrer, onSupprimer, onAvatar }: Props) {
  const champs = champsVisibles(p, R, role);
  const groupes = [...new Set(champs.map((c) => c.groupe ?? ''))];
  const mj = (p.mj ?? {}) as { notes?: string; cache?: boolean };
  const majMj = (patch: Record<string, unknown>) => maj((x) => ({ ...x, mj: { ...(x.mj ?? {}), ...patch } }));

  return (
    <div className="carte-ui pile perso-fiche">
      <div className="ligne" style={{ alignItems: 'flex-start', gap: 16 }}>
        <button className="perso-portrait" onClick={onPortrait} disabled={lectureSeule} title="Choisir un portrait">
          {urlPortrait ? <img src={urlPortrait} alt="" /> : <span>{p.nom.slice(0, 1).toUpperCase()}</span>}
        </button>
        <div className="pile" style={{ flex: 1, minWidth: 200, gap: 10 }}>
          <fieldset disabled={lectureSeule} className="perso-champs">
            <Champ libelle="Nom">
              <input value={p.nom} onChange={(e) => maj((x) => ({ ...x, nom: e.target.value }))} />
            </Champ>
            <Champ libelle="Sorte">
              <select value={p.sorte} onChange={(e) => maj((x) => ({ ...x, sorte: e.target.value as SortePersonnage }))}>
                {SORTES.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
              </select>
            </Champ>
            <Champ libelle="Rôle ou métier">
              <input value={p.role ?? ''} placeholder="capitaine de la garde, herboriste…" onChange={(e) => maj((x) => ({ ...x, role: e.target.value }))} />
            </Champ>
            {p.sorte === 'pj' && (
              <Champ libelle="Joueur">
                <input value={p.joueur ?? ''} onChange={(e) => maj((x) => ({ ...x, joueur: e.target.value }))} />
              </Champ>
            )}
          </fieldset>
        </div>
      </div>

      {groupes.map((g) => (
        <fieldset key={g} disabled={lectureSeule} className="perso-groupe">
          {g && <legend>{g}</legend>}
          <div className="champs">
            {champs.filter((c) => (c.groupe ?? '') === g).map((c) => {
              const v = lireStat(p.combat.stats, c.cle);
              return (
                <Champ key={c.cle} libelle={c.libelle}>
                  <input
                    type={c.sorte === 'nombre' ? 'number' : 'text'}
                    min={c.min} max={c.max}
                    value={v === undefined || v === null ? '' : String(v)}
                    onChange={(e) => {
                      const brut = e.target.value;
                      const val = c.sorte === 'nombre' ? (brut === '' ? '' : Number(brut)) : brut;
                      maj((x) => ({ ...x, combat: { ...x.combat, stats: ecrireStat(x.combat.stats, c.cle, val) } }));
                    }}
                  />
                </Champ>
              );
            })}
          </div>
        </fieldset>
      ))}
      {role === 'mj' && (
        <button className="btn btn-petit" style={{ alignSelf: 'flex-start' }} onClick={() => emettre('naviguer', { page: 'genealogie', cible: p.id })}>Arbre généalogique</button>
      )}
      {role === 'mj' && !lectureSeule && p.sorte !== 'pj' && (
        <button className="btn btn-petit" style={{ alignSelf: 'flex-start' }}
          title="Recalcule caractéristiques, PV, CA, dégâts et niveau d’après le rôle, la description et la sorte"
          onClick={() => window.confirm('Remplacer les statistiques par celles du rôle ?') && maj((x) => ({ ...x, combat: { ...x.combat, stats: { ...R.statsPourProfil({ role: x.role ?? x.nom, description: x.notes, sorte: x.sorte, antagoniste: !!(x.mj as { antagoniste?: boolean } | undefined)?.antagoniste, graine: x.id }) } } }))}>
          Stats selon le rôle
        </button>
      )}
      {p.combat.conditions?.length ? <p className="discret">États en cours : {p.combat.conditions.join(', ')}</p> : null}
      {role === 'joueurs' && champs.length < R.champs.length && (
        <p className="discret">Les autres statistiques ne sont pas visibles par les joueurs.</p>
      )}

      <fieldset disabled={lectureSeule} className="perso-groupe">
        <Champ libelle="Notes (visibles par les joueurs)">
          <textarea value={p.notes ?? ''} onChange={(e) => maj((x) => ({ ...x, notes: e.target.value }))} />
        </Champ>
      </fieldset>

      <Relations persoId={p.id} />

      {role === 'mj' && (
        <BlocMj>
          <div className="pile" style={{ gap: 10 }}>
            <Champ libelle="Secrets, motivations, tactique">
              <textarea value={mj.notes ?? ''} onChange={(e) => majMj({ notes: e.target.value })} />
            </Champ>
            <label className="ligne discret">
              <input type="checkbox" checked={!!mj.cache} onChange={(e) => majMj({ cache: e.target.checked })} />
              Personnage entièrement caché aux joueurs
            </label>
          </div>
        </BlocMj>
      )}

      {!lectureSeule && (
        <div className="ligne">
          <button className="btn btn-mj" onClick={onMontrer} disabled={!!mj.cache}>Montrer aux joueurs</button>
          <button className="btn" onClick={onAvatar}>{p.apparence ? 'Modifier l’avatar 3D' : 'Créer l’avatar 3D'}</button>
          <span style={{ flex: 1 }} />
          <button className="btn btn-danger" onClick={onSupprimer}>Supprimer</button>
        </div>
      )}
    </div>
  );
}
