// Écran joueurs : action demandée par le MJ (viser un sort, se déplacer). Les joueurs touchent ou survolent la carte,
// l'aperçu suit (zone du sort, case d'arrivée) et part au MJ en direct ; « Valider » joue l'action sur la table.
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { PropsVueJoueurs } from '../../../interface/types';
import { caseVisee, casesDeZone, coteCaseImage, versImage, zoneVisee, type DemandeAction } from '../actions';
import type { Cellule } from '../moteur';
import './joueurs.css';

function useUrl(b: Blob): string {
  const url = useMemo(() => URL.createObjectURL(b), [b]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return url;
}

export default function Action({ donnees, envoyer }: PropsVueJoueurs) {
  const d = donnees as unknown as DemandeAction;
  const url = useUrl(d.image);
  const svg = useRef<SVGSVGElement>(null);
  const [vise, setVise] = useState<{ cellule: Cellule; angle: number; monde: [number, number] } | null>(null);
  const [fige, setFige] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const dernier = useRef(0);
  useEffect(() => { setVise(null); setFige(false); setEnvoye(false); }, [d.id]);

  const a = d.action;
  const depart: Cellule = a.sorte === 'sort' ? [a.lanceur.x, a.lanceur.y] : [a.jeton.x, a.jeton.y];
  const cote = coteCaseImage(d);
  const viser = (ev: PointerEvent<SVGSVGElement>, figer: boolean) => {
    if (envoye || (fige && !figer)) return;
    const p = svg.current!.createSVGPoint();
    p.x = ev.clientX; p.y = ev.clientY;
    const q = p.matrixTransform(svg.current!.getScreenCTM()!.inverse());
    const { monde, cellule } = caseVisee(d, q.x, q.y);
    const v = a.sorte === 'sort' ? { ...zoneVisee(d.grille, a, monde), monde } : { cellule, angle: 0, monde };
    setVise({ cellule: v.cellule, angle: v.angle, monde });
    if (figer) setFige(true);
    // Le MJ voit la visée en direct (au plus toutes les 120 ms).
    const t = Date.now();
    if (figer || t - dernier.current > 120) { dernier.current = t; envoyer({ id: d.id, cellule: v.cellule, angle: v.angle, valide: false }); }
  };

  const cases = vise && a.sorte === 'sort' ? casesDeZone(d.grille, zoneVisee(d.grille, a, vise.monde).zone) : vise ? [vise.cellule] : [];
  const couleur = a.sorte === 'sort' ? a.gabarit.couleur : 'rgba(69,168,74,0.55)';
  const [dx, dy] = versImage(d, depart);
  const arrivee = vise ? versImage(d, vise.cellule) : null;
  const valider = () => { if (!vise) return; setEnvoye(true); envoyer({ id: d.id, cellule: vise.cellule, angle: vise.angle, valide: true }); };

  return (
    <div className="action-joueurs">
      <div className="action-barre">
        <strong>{d.titre}</strong>
        <span className="action-aide">{envoye ? 'Action envoyée au maître du jeu…' : fige ? 'Touchez ailleurs pour changer, puis validez.' : a.sorte === 'sort' ? 'Touchez la carte pour viser.' : `Touchez la case d’arrivée (${a.reste} cases de déplacement).`}</span>
        <span style={{ flex: 1 }} />
        {!envoye && <button className="btn" disabled={!fige} onClick={() => { setFige(false); setVise(null); }}>Recommencer</button>}
        {!envoye && <button className="btn btn-principal" disabled={!vise} onClick={valider}>Valider</button>}
        {!envoye && <button className="btn" onClick={() => { setEnvoye(true); envoyer({ id: d.id, cellule: depart, angle: 0, valide: false, annule: true }); }}>Annuler</button>}
      </div>
      <div className="action-carte">
        <img src={url} alt="" draggable={false} />
        <svg ref={svg} viewBox={`0 0 ${d.largeur} ${d.hauteur}`} preserveAspectRatio="xMidYMid meet"
          onPointerMove={(ev) => { if (ev.pointerType === 'mouse' || ev.buttons) viser(ev, false); }}
          onPointerDown={(ev) => { try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* pointeur sans capture */ } setFige(false); viser(ev, true); }}>
          {cases.map(([x, y]) => { const [cx, cy] = versImage(d, [x, y]); return <rect key={`${x},${y}`} x={cx - cote / 2} y={cy - cote / 2} width={cote} height={cote} rx={cote * 0.12} fill={couleur} stroke="rgba(255,255,255,0.7)" strokeWidth={2} />; })}
          {arrivee && <line x1={dx} y1={dy} x2={arrivee[0]} y2={arrivee[1]} stroke="#f2d27a" strokeWidth={4} strokeDasharray="10 8" />}
          <circle cx={dx} cy={dy} r={cote * 0.6} fill="none" stroke="#f2d27a" strokeWidth={4} />
        </svg>
      </div>
    </div>
  );
}
