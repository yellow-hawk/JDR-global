// Ordre d'initiative : jeton actif, PV, actions utilisées (action, bonus, réaction, mouvement).
import { modifierJeton } from '../moteur';
import type { DrapeauxTour } from '../moteur';
import { COULEUR_CAMP, statsVisibles } from '../rendu';
import type { Controleur } from './types';

const DRAPEAUX: [keyof DrapeauxTour, string, string][] = [['action', 'A', 'Action'], ['bonus', 'B', 'Action bonus'], ['reaction', 'R', 'Réaction'], ['mouvement', 'M', 'Mouvement']];

export function Initiative({ ctl, mj }: { ctl: Controleur; mj: boolean }) {
  const { etat: e, ui } = ctl;
  if (!e.combat.actif) return null;
  return (
    <section className="combat-bloc">
      <h3>Initiative · round {e.combat.round}</h3>
      <div className="combat-init">
        {e.combat.ordre.map((id, i) => {
          const j = e.jetons.find((x) => x.id === id);
          if (!j || (!mj && !j.visible)) return null;
          return (
            <div key={id} className={`combat-init-ligne ${i === e.combat.tour ? 'actif' : ''} ${j.pv <= 0 ? 'ko' : ''} ${ui.selection === id ? 'choisi' : ''}`}
              onClick={() => ctl.regler({ selection: id, zoneChoisie: null })}>
              <span className="combat-init-val">{j.initiative}</span>
              <span className="combat-pastille" style={{ background: j.couleur || COULEUR_CAMP[j.camp] }} />
              <span className="combat-nom">{j.nom}</span>
              {statsVisibles(j, mj ? 'mj' : 'joueurs') && <span className="combat-pv">{j.pv}/{j.pvMax}</span>}
              {mj && !ctl.lectureSeule && (
                <span className="combat-drapeaux">
                  {DRAPEAUX.map(([k, l, t]) => (
                    <button key={k} title={t} className={j.drapeaux[k] ? 'utilise' : ''}
                      onClick={(ev) => { ev.stopPropagation(); ctl.faire((x) => modifierJeton(x, id, (y) => ({ ...y, drapeaux: { ...y.drapeaux, [k]: !y.drapeaux[k] } }))); }}>{l}</button>
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
