// Côté MJ : le sceau qu'un joueur trace pendant son tour, en direct (lui seul et le MJ le voient).
import { STAGE } from '../../magie';
import type { TraceEnCours } from './useTourJoueurs';

type Pt = { x: number; y: number };
const chemin = (s: Pt[]) => (s.length === 1 ? `M${s[0].x} ${s[0].y} l0.1 0` : `M${s.map((p) => `${p.x.toFixed(0)} ${p.y.toFixed(0)}`).join(' L')}`);

export function SuiviTrace({ trace, fermer }: { trace: TraceEnCours; fermer: () => void }) {
  const traits = trace.traits as Pt[][];
  return (
    <div className="combat-suivi-trace">
      <div className="ligne">
        <strong style={{ flex: 1 }}>✍ {trace.nom} trace un sceau</strong>
        <button className="combat-oeil" title={trace.fini ? 'Fermer' : 'Annuler le tracé'} onClick={fermer}>×</button>
      </div>
      <svg viewBox={`0 0 ${STAGE} ${STAGE}`}>
        {traits.map((s, i) => <path key={i} d={chemin(s)} fill="none" stroke="#2a1b0e" strokeWidth={6} strokeLinecap="round" />)}
      </svg>
      <span className="discret">{trace.fini ? 'Terminé : lu avec les signes que connaît le personnage.' : `${traits.length} trait(s)${trace.demande.duree ? ` · ${trace.demande.duree} s dès le premier trait` : ''}`}</span>
    </div>
  );
}
