// Calendrier d'un peuple : bande des mois (largeur proportionnelle aux jours), fêtes placées dessus, liste détaillée.
import type { Civilisation } from '../../noyau/contrat';
import { positionsCalendrier } from './logique';

export function Calendrier({ cal, an }: { cal: NonNullable<Civilisation['calendrier']>; an?: number }) {
  const { fetes } = positionsCalendrier(cal);
  return (
    <div className="pays-calendrier">
      <p className="discret" style={{ margin: 0 }}>{an ? `An ${an} · ` : ''}{cal.joursParAn} jours, {cal.mois.length} mois.</p>
      <div className="pays-mois">
        {cal.mois.map((m, i) => (
          <div key={i} style={{ flex: m.jours }} className="pays-mois-case" title={`${m.nom} : ${m.jours} jours`}>
            <strong>{m.nom}</strong><span>{m.jours} j</span>
          </div>
        ))}
        {fetes.map((f, i) => <i key={i} className="pays-fete-point" style={{ left: `${f.t * 100}%` }} title={`${f.nom} (${f.jour} ${f.mois})`} />)}
      </div>
      <ul className="pays-fetes">
        {fetes.map((f, i) => (
          <li key={i}><strong>{f.nom}</strong> <span className="discret">{f.jour} {f.mois}</span>{f.texte && <div className="discret">{f.texte}</div>}</li>
        ))}
      </ul>
    </div>
  );
}
