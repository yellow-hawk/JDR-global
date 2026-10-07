// Vue d'un graphe en SVG : nœuds colorés, liens (fléchés si orientés), étiquettes, voisinage du nœud choisi en évidence,
// nœuds déplaçables. Les positions sont calculées ailleurs (disposerForces) et passées en props.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Graphe, Position } from '../../noyau/graphe';
import { usePanZoom, useTaille } from './panZoom';
import './graphe.css';

interface Props {
  graphe: Graphe;
  positions: Record<string, Position>;
  couleur: (id: string) => string;
  taille: (id: string) => number;
  etiquette: (id: string, k: number) => boolean;
  choisi: string | null;
  onChoisir: (id: string | null) => void;
  onDeplacer?: (id: string, p: Position) => void;
  oriente?: boolean;
  couleurLien?: (sorte?: string) => string;
}

export function VueGraphe({ graphe, positions, couleur, taille, etiquette, choisi, onChoisir, onDeplacer, oriente, couleurLien }: Props) {
  const [boite, dims] = useTaille<HTMLDivElement>();
  const { vue, cadrer, versDessin, gestion } = usePanZoom();
  const [survol, setSurvol] = useState<string | null>(null);
  const deplace = useRef<string | null>(null);

  // Cadrage quand le graphe change.
  const bornes = useMemo(() => {
    const ps = Object.values(positions);
    if (!ps.length) return [0, 0, 1, 1] as const;
    return [Math.min(...ps.map((p) => p.x)), Math.min(...ps.map((p) => p.y)), Math.max(...ps.map((p) => p.x)), Math.max(...ps.map((p) => p.y))] as const;
  }, [graphe]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { cadrer(bornes[0], bornes[1], bornes[2], bornes[3], dims.l, dims.h); }, [bornes, dims.l, dims.h, cadrer]);

  const voisins = useMemo(() => {
    const f = choisi ?? survol;
    if (!f) return null;
    const s = new Set([f]);
    for (const l of graphe.liens) { if (l.de === f) s.add(l.vers); if (l.vers === f) s.add(l.de); }
    return s;
  }, [choisi, survol, graphe]);

  const bouge = (ev: React.PointerEvent<SVGSVGElement>) => {
    if (deplace.current && onDeplacer) {
      const r = ev.currentTarget.getBoundingClientRect();
      onDeplacer(deplace.current, versDessin(ev.clientX - r.left, ev.clientY - r.top));
    } else gestion.onPointerMove(ev);
  };

  return (
    <div ref={boite} className="graphe-boite">
      <svg className="graphe-svg" {...gestion} onPointerMove={bouge} onPointerUp={() => { deplace.current = null; gestion.onPointerUp(); }}
        onClick={(ev) => { if (!(ev.target as Element).closest('[data-noeud]')) onChoisir(null); }}>
        <defs>
          <marker id="graphe-fleche" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
          </marker>
        </defs>
        <g transform={`translate(${vue.x},${vue.y}) scale(${vue.k})`}>
          {graphe.liens.map((l, i) => {
            const a = positions[l.de], b = positions[l.vers];
            if (!a || !b) return null;
            const actif = !voisins || (voisins.has(l.de) && voisins.has(l.vers) && (l.de === (choisi ?? survol) || l.vers === (choisi ?? survol)));
            // raccourcir pour que la flèche touche le bord du cercle
            const d = Math.hypot(b.x - a.x, b.y - a.y) || 1, r = taille(l.vers) + 2;
            const fx = b.x - ((b.x - a.x) / d) * r, fy = b.y - ((b.y - a.y) / d) * r;
            return (
              <line key={i} x1={a.x} y1={a.y} x2={oriente || l.oriente ? fx : b.x} y2={oriente || l.oriente ? fy : b.y}
                className="graphe-lien" style={{ color: couleurLien?.(l.sorte) ?? '#777', opacity: actif ? 0.75 : 0.08 }}
                stroke="currentColor" strokeWidth={1.4 / Math.sqrt(vue.k)} markerEnd={oriente || l.oriente ? 'url(#graphe-fleche)' : undefined} />
            );
          })}
          {graphe.noeuds.map((n) => {
            const p = positions[n.id];
            if (!p) return null;
            const r = taille(n.id), actif = !voisins || voisins.has(n.id);
            return (
              <g key={n.id} data-noeud transform={`translate(${p.x},${p.y})`} style={{ opacity: actif ? 1 : 0.15, cursor: 'pointer' }}
                onPointerDown={(ev) => { if (onDeplacer) { deplace.current = n.id; (ev.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture(ev.pointerId); } }}
                onClick={(ev) => { ev.stopPropagation(); onChoisir(n.id); }}
                onPointerEnter={() => setSurvol(n.id)} onPointerLeave={() => setSurvol(null)}>
                <circle r={r} fill={couleur(n.id)} className={`graphe-noeud ${choisi === n.id ? 'choisi' : ''}`} />
                {(etiquette(n.id, vue.k) || survol === n.id || choisi === n.id) && (
                  <text y={-r - 4} className="graphe-etiquette" style={{ fontSize: Math.max(10, 12 / vue.k) }}>{n.libelle}</text>
                )}
                <title>{n.libelle}{n.infos ? `\n${n.infos}` : ''}</title>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
