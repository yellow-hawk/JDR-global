// Journal de la table (attaques, dégâts, soins, états, tours), le plus récent en haut.
import type { Controleur } from './types';

export function Journal({ ctl }: { ctl: Controleur }) {
  const lignes = [...ctl.etat.journal].reverse();
  return (
    <div className="combat-onglet">
      {!ctl.lectureSeule && lignes.length > 0 && <button className="btn btn-petit" onClick={() => ctl.faire((e) => ({ ...e, journal: [] }))}>Vider le journal</button>}
      <div className="combat-journal">
        {lignes.map((l, i) => <div key={i} className={`combat-log combat-log-${l.cls}`}><span>{l.t}</span>{l.msg}</div>)}
        {!lignes.length && <p className="discret">Rien pour l’instant.</p>}
      </div>
    </div>
  );
}
