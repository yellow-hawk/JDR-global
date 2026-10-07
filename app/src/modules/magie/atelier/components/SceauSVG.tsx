import type { MouseEvent } from 'react';
import type { Placement, Sceau } from '../engine/types';
import { polar, rayons, svgTransform } from '../engine/geometry';
import { GlyphPaths } from './Glyph';

export const STAGE = 600;
export const rayonTaille = (t: 1 | 2 | 3) => [0, 170, 212, 250][t];
/** Rayon de cerne effectif d'un sceau dans la scène 600×600 (tient compte de la double cerne) */
export const rayonScene = (s: Sceau) => rayons(rayonTaille(s.taille), !!s.couronne).R;
/** Position des deux sceaux d'une greffe dans la scène */
export const PAIRE = { gauche: { x: 150, y: 300 }, droite: { x: 450, y: 300 }, base: 120 };

export type Selection = { kind: 'coeur' } | { kind: 'rameau' | 'noeud' | 'crameau' | 'cnoeud'; index: number } | null;

interface Props {
  sceau: Sceau;
  selection?: Selection;
  actif?: boolean;
  couleur?: string;
  guides?: boolean;
  /** montrer la greffe (deux sceaux côte à côte) */
  paire?: boolean;
  onStageClick?: (angle: number, rFrac: number) => void;
  onSelect?: (s: Selection) => void;
  className?: string;
  ariaLabel?: string;
}

interface DessinProps { s: Sceau; cx: number; cy: number; base: number; ink: string; selection?: Selection; onSelect?: (s: Selection) => void; guides?: boolean }

/** Un sceau (cerne, double cerne, fente, signes) centré en (cx, cy) */
function Dessin({ s, cx, cy, base, ink, selection, onSelect, guides }: DessinProps) {
  const inv = 'var(--inv)';
  const { R, R2, Rc } = rayons(base, !!s.couronne);
  const sel = (x: Selection) => (e: MouseEvent) => { if (onSelect) { e.stopPropagation(); onSelect(x); } };
  const isSel = (kind: string, index?: number) => !!selection && selection.kind === kind && (kind === 'coeur' || (selection as { index: number }).index === index);
  const coupures = s.fendu ? [s.fendu.axe, s.fendu.axe + 180] : s.entaille !== null ? [s.entaille] : [];
  const arcs = (r: number, cuts: number[]) => {
    if (!cuts.length) return <circle cx={cx} cy={cy} r={r} fill="none" stroke={ink} strokeWidth={4} />;
    const tri = [...cuts].map((c) => ((c % 360) + 360) % 360).sort((a, b) => a - b);
    return tri.map((c, i) => {
      const suivant = i + 1 < tri.length ? tri[i + 1] : tri[0] + 360;
      const a = polar(cx, cy, r, c + 10), b = polar(cx, cy, r, suivant - 10);
      const large = suivant - c - 20 > 180 ? 1 : 0;
      return <path key={i} d={`M${a.x} ${a.y} A${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`} fill="none" stroke={ink} strokeWidth={4} strokeLinecap="round" />;
    });
  };
  const signe = (p: Placement, kind: 'rameau' | 'noeud', sk: 'rameau' | 'noeud' | 'crameau' | 'cnoeud', i: number, rayon?: number) => (
    <g key={sk + i} transform={svgTransform(kind, p.angle, p.inv, cx, cy, R, rayon)} onClick={sel({ kind: sk, index: i })} className={`signe ${isSel(sk, i) ? 'sel' : ''}`}>
      {kind === 'rameau' ? <rect x={10} y={10} width={80} height={80} className="hit" /> : <rect x={20} y={12} width={60} height={46} className="hit" />}
      <GlyphPaths id={p.id} color={p.inv ? inv : ink} width={kind === 'rameau' ? 7 : 8} />
    </g>
  );
  return (
    <g>
      {guides && (
        <g className="guides">
          <circle cx={cx} cy={cy} r={R * 0.6} fill="none" strokeDasharray="3 7" />
          <circle cx={cx} cy={cy} r={R * 0.3} fill="none" strokeDasharray="3 7" />
          {s.couronne && <circle cx={cx} cy={cy} r={Rc} fill="none" strokeDasharray="3 7" />}
          {Array.from({ length: 24 }, (_, i) => { const r0 = (s.couronne ? R2 : R) * 1.08; const p = polar(cx, cy, r0, i * 15), q = polar(cx, cy, r0 * (i % 6 === 0 ? 1.07 : 1.04), i * 15); return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} />; })}
        </g>
      )}
      {arcs(R, coupures)}
      {s.couronne && arcs(R2, [])}
      {s.fendu && (() => { const a = polar(cx, cy, R * 1.1, s.fendu.axe), b = polar(cx, cy, R * 1.1, s.fendu.axe + 180); return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={inv} strokeWidth={1.5} strokeDasharray="6 6" />; })()}
      {s.coeur && (
        <g transform={svgTransform('coeur', 0, s.coeur.inv, cx, cy, R)} onClick={sel({ kind: 'coeur' })} className={`signe ${isSel('coeur') ? 'sel' : ''}`}>
          <rect x={5} y={5} width={90} height={90} className="hit" />
          <GlyphPaths id={s.coeur.id} color={s.coeur.inv ? inv : ink} width={6} gerce={s.coeur.inv} gerceColor={inv} />
        </g>
      )}
      {s.rameaux.map((r, i) => signe(r, 'rameau', 'rameau', i))}
      {s.noeuds.map((n, i) => signe(n, 'noeud', 'noeud', i))}
      {s.couronne?.rameaux.map((r, i) => signe(r, 'rameau', 'crameau', i, Rc))}
      {s.couronne?.noeuds.map((n, i) => signe(n, 'noeud', 'cnoeud', i, R2))}
    </g>
  );
}

/** Rendu d'un sceau complet (composeur, grimoire, modèle de leçon). Repère 600×600. */
export function SceauSVG({ sceau, selection, actif, couleur, guides, paire, onStageClick, onSelect, className, ariaLabel }: Props) {
  const C = STAGE / 2;
  const ink = actif && couleur ? couleur : 'var(--ink)';
  const deux = paire && !!sceau.greffe;
  const base = rayonTaille(sceau.taille);
  const R = rayons(base, !!sceau.couronne).R;

  const click = (e: MouseEvent<SVGSVGElement>) => {
    if (!onStageClick) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const ang = ((Math.atan2(p.x - C, -(p.y - C)) * 180) / Math.PI + 360) % 360;
    onStageClick(ang, Math.hypot(p.x - C, p.y - C) / R);
  };

  return (
    <svg viewBox={`0 0 ${STAGE} ${STAGE}`} className={`sceau ${actif ? 'actif' : ''} ${className ?? ''}`} onClick={click} role="img" aria-label={ariaLabel ?? 'Sceau'}
      style={actif && couleur ? ({ ['--glow' as string]: couleur }) : undefined}>
      {deux ? (
        <>
          <line x1={PAIRE.gauche.x + PAIRE.base} y1={300} x2={PAIRE.droite.x - PAIRE.base} y2={300} stroke={ink} strokeWidth={4} strokeLinecap="round" />
          <Dessin s={sceau} cx={PAIRE.gauche.x} cy={PAIRE.gauche.y} base={PAIRE.base} ink={ink} />
          <Dessin s={sceau.greffe!} cx={PAIRE.droite.x} cy={PAIRE.droite.y} base={PAIRE.base} ink={ink} />
        </>
      ) : (
        <Dessin s={sceau} cx={C} cy={C} base={base} ink={ink} selection={selection} onSelect={onSelect} guides={guides} />
      )}
    </svg>
  );
}
