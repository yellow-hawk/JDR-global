// Écran joueurs : zone de tracé de l'Atelier, au doigt, au stylet ou à la souris. Le chrono part au premier trait ;
// à la fin du temps (ou sur « Terminer »), le tracé part au MJ qui le lit et montre l'effet.
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { PropsVueJoueurs } from '../../../interface/types';
import type { Stroke } from '../atelier/engine/geometry';
import { STAGE } from '../atelier/components/SceauSVG';
import type { DemandeTrace } from '../partage';
import './joueurs.css';

const chemin = (s: Stroke) => (s.length === 1 ? `M${s[0].x} ${s[0].y} l0.1 0` : `M${s.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L')}`);
const enSecondes = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

export default function Trace({ donnees, envoyer }: PropsVueJoueurs) {
  const d = donnees as unknown as DemandeTrace;
  const [traits, setTraits] = useState<Stroke[]>([]);
  const [enCours, setEnCours] = useState<Stroke | null>(null);
  const [debut, setDebut] = useState<number | null>(null);
  const [fini, setFini] = useState(false);
  const [maintenant, setMaintenant] = useState(Date.now());
  const svg = useRef<SVGSVGElement>(null);
  const derniers = useRef<Stroke[]>([]);
  derniers.current = traits;

  // Nouvelle demande du MJ : feuille vierge.
  useEffect(() => { setTraits([]); setEnCours(null); setDebut(null); setFini(false); }, [d.id]);
  const temps = debut === null ? 0 : maintenant - debut;
  const reste = d.duree > 0 ? Math.max(0, d.duree * 1000 - temps) : null;

  const terminer = (horsDelai = false) => {
    if (fini) return;
    setFini(true);
    envoyer({ id: d.id, traits: derniers.current, fini: true, temps: debut === null ? 0 : Date.now() - debut, horsDelai });
  };
  useEffect(() => {
    if (debut === null || fini) return;
    const t = window.setInterval(() => setMaintenant(Date.now()), 100);
    return () => window.clearInterval(t);
  }, [debut, fini]);
  useEffect(() => { if (reste === 0 && !fini) terminer(true); }); // eslint-disable-line react-hooks/exhaustive-deps

  const pos = (e: PointerEvent) => {
    const p = svg.current!.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(svg.current!.getScreenCTM()!.inverse());
    return { x: q.x, y: q.y };
  };
  const bas = (e: PointerEvent<SVGSVGElement>) => {
    if (fini) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointeur sans capture (simulé) */ }
    setEnCours([pos(e)]);
    if (debut === null) { setDebut(Date.now()); setMaintenant(Date.now()); }
  };
  const bouge = (e: PointerEvent<SVGSVGElement>) => {
    if (!enCours) return;
    const p = pos(e), l = enCours[enCours.length - 1];
    if (Math.hypot(p.x - l.x, p.y - l.y) > 1.5) setEnCours([...enCours, p]);
  };
  const haut = () => {
    if (!enCours) return;
    const t = [...traits, enCours];
    setTraits(t); setEnCours(null);
    envoyer({ id: d.id, traits: t, fini: false, temps: debut === null ? 0 : Date.now() - debut });
  };
  const changer = (t: Stroke[]) => { setTraits(t); envoyer({ id: d.id, traits: t, fini: false, temps }); };

  return (
    <div className="trace-joueurs">
      <div className="trace-barre">
        <strong>{d.titre}</strong>
        <span className={`trace-chrono ${reste !== null && reste < 10000 ? 'urgent' : ''}`}>
          ⏱ {reste !== null ? enSecondes(reste) : enSecondes(temps)}{debut === null && d.duree > 0 ? ' · le temps part au premier trait' : ''}
        </span>
        <span style={{ flex: 1 }} />
        {!fini && <button className="btn" disabled={!traits.length} onClick={() => changer(traits.slice(0, -1))}>Annuler le trait</button>}
        {!fini && <button className="btn" disabled={!traits.length} onClick={() => changer([])}>Effacer</button>}
        {!fini && <button className="btn btn-principal" disabled={!traits.length} onClick={() => terminer()}>Terminer</button>}
      </div>
      <svg ref={svg} viewBox={`0 0 ${STAGE} ${STAGE}`} className={`trace-feuille ${fini ? 'fini' : ''}`}
        onPointerDown={bas} onPointerMove={bouge} onPointerUp={haut} onPointerCancel={haut}>
        {d.guide && (
          <g className="trace-guides">
            <circle cx={300} cy={300} r={212} /><circle cx={300} cy={300} r={127} /><circle cx={300} cy={300} r={60} />
          </g>
        )}
        {traits.map((s, i) => <path key={i} d={chemin(s)} className="trace-encre" />)}
        {enCours && <path d={chemin(enCours)} className="trace-encre" />}
      </svg>
      {fini && <div className="trace-message">Tracé envoyé au maître du jeu… le sceau s’éveille.</div>}
    </div>
  );
}
