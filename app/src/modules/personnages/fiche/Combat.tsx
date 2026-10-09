// Onglet Combat : statistiques du système de règles (formulaire généré), attaques calculées, défense.
import { Champ } from '../../../interface/composants';
import type { FicheCalculee } from '../../../noyau/regles';
import { ecrireStat, lireStat } from '../../../noyau/regles';
import { champsVisibles } from '../logique';
import { majFiche, type PropsOnglet } from './types';

export function Combat({ p, R, role, lectureSeule, maj, calcul }: PropsOnglet & { calcul: FicheCalculee | null }) {
  // Les caractéristiques ont leur onglet quand le système calcule la fiche.
  const champs = champsVisibles(p, R, role).filter((c) => !calcul || !c.cle.startsWith('carac.'));
  const groupes = [...new Set(champs.map((c) => c.groupe ?? ''))];
  const d = p.fiche?.defense ?? {};
  const ecrireDef = (cle: string, v: unknown) => majFiche(maj, 'defense', (x) => ({ ...(x ?? {}), [cle]: v }));
  const auto = new Set(Object.keys(calcul?.stats ?? {}));

  return (
    <div className="pile">
      {groupes.map((g) => (
        <fieldset key={g} disabled={lectureSeule} className="perso-groupe">
          {g && <legend>{g}</legend>}
          <div className="champs">
            {champs.filter((c) => (c.groupe ?? '') === g).map((c) => {
              const v = lireStat(p.combat.stats, c.cle);
              const calcule = auto.has(c.cle);
              return (
                <Champ key={c.cle} libelle={calcule ? `${c.libelle} (auto)` : c.libelle}>
                  <input
                    type={c.sorte === 'nombre' ? 'number' : 'text'} min={c.min} max={c.max} disabled={calcule}
                    title={calcule ? 'Calculé d’après l’équipement et le niveau' : undefined}
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

      {calcul && calcul.attaques.length > 0 && (
        <section>
          <h3>Attaques</h3>
          <table className="perso-table">
            <thead><tr><th>Arme</th><th>Attaque</th><th>Dégâts</th><th>Portée</th><th>Propriétés</th></tr></thead>
            <tbody>
              {calcul.attaques.map((a, i) => (
                <tr key={i}><td>{a.nom}</td><td>{a.bonus >= 0 ? `+${a.bonus}` : a.bonus}</td><td>{a.degats}</td><td>{a.portee ? `${a.portee} cases` : 'contact'}</td><td>{a.proprietes?.join(', ')}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {calcul && calcul.attaques.length === 0 && role === 'mj' && (
        <p className="discret">Équipez une arme dans l’onglet Inventaire pour calculer les attaques.</p>
      )}

      {(role === 'mj' || p.sorte === 'pj' || p.sorte === 'allie') && (
        <fieldset disabled={lectureSeule} className="perso-groupe">
          <legend>Santé et résistances</legend>
          <div className="champs">
            <Champ libelle="PV temporaires"><input type="number" min={0} value={d.pvTemp ?? ''} onChange={(e) => ecrireDef('pvTemp', e.target.value === '' ? undefined : Number(e.target.value))} /></Champ>
            <Champ libelle="Dés de vie restants"><input type="number" min={0} value={d.desVie ?? ''} onChange={(e) => ecrireDef('desVie', e.target.value === '' ? undefined : Number(e.target.value))} /></Champ>
            <Champ libelle="Jets contre la mort ✓"><input type="number" min={0} max={3} value={d.mortSucces ?? 0} onChange={(e) => ecrireDef('mortSucces', Number(e.target.value))} /></Champ>
            <Champ libelle="Jets contre la mort ✗"><input type="number" min={0} max={3} value={d.mortEchecs ?? 0} onChange={(e) => ecrireDef('mortEchecs', Number(e.target.value))} /></Champ>
          </div>
          <div className="perso-champs">
            <Champ libelle="Résistances"><input value={d.resistances ?? ''} placeholder="feu, poison…" onChange={(e) => ecrireDef('resistances', e.target.value)} /></Champ>
            <Champ libelle="Immunités"><input value={d.immunites ?? ''} onChange={(e) => ecrireDef('immunites', e.target.value)} /></Champ>
            <Champ libelle="Vulnérabilités"><input value={d.vulnerabilites ?? ''} onChange={(e) => ecrireDef('vulnerabilites', e.target.value)} /></Champ>
          </div>
        </fieldset>
      )}
      {p.combat.conditions?.length ? <p className="discret">États en cours : {p.combat.conditions.join(', ')}</p> : null}
      {role === 'joueurs' && champsVisibles(p, R, role).length < R.champs.length && <p className="discret">Les autres statistiques ne sont pas visibles par les joueurs.</p>}
    </div>
  );
}
