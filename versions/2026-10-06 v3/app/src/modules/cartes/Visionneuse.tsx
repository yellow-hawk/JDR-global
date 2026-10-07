// Affiche une image de carte avec zoom, repères, zones des cartes enfants, et outils de clic.
// Toutes les coordonnées échangées sont en pixels de l'image d'origine.
import { useRef, useState } from 'react';
import type { PointerEvent as PE } from 'react';
import type { Carte, Repere } from '../../noyau/contrat';

export type Outil = 'voir' | 'repere' | 'echelle' | 'zone';

interface Props {
  url: string | null;
  carte: Carte;
  reperes: Repere[];
  zonesEnfants: { id: string; nom: string; zone: [number, number, number, number] }[];
  outil: Outil;
  pointsEchelle: [number, number][];
  repereActif: string | null;
  onPoint(x: number, y: number): void;
  onZone(z: [number, number, number, number]): void;
  onRepere(id: string): void;
  onEnfant(id: string): void;
}

export function Visionneuse(p: Props) {
  const [zoom, setZoom] = useState(1);
  const [trace, setTrace] = useState<[number, number, number, number] | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const { l, h } = p.carte.taille ?? { l: 1000, h: 1000 };
  const rayon = Math.max(l, h) / 120;

  const versImage = (e: PE): [number, number] => {
    const r = svg.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * l, ((e.clientY - r.top) / r.height) * h];
  };
  const bas = (e: PE) => {
    if (p.outil === 'zone') { const [x, y] = versImage(e); setTrace([x, y, x, y]); (e.target as Element).setPointerCapture?.(e.pointerId); }
  };
  const bouge = (e: PE) => { if (trace) { const [x, y] = versImage(e); setTrace([trace[0], trace[1], x, y]); } };
  const haut = (e: PE) => {
    if (p.outil === 'zone' && trace) {
      const [x0, y0, x1, y1] = trace;
      setTrace(null);
      if (Math.abs(x1 - x0) > 4 && Math.abs(y1 - y0) > 4) {
        p.onZone([Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)].map(Math.round) as [number, number, number, number]);
      }
      return;
    }
    if (p.outil === 'repere' || p.outil === 'echelle') { const [x, y] = versImage(e); p.onPoint(x, y); }
  };

  return (
    <div className="cartes-vision">
      <div className="ligne cartes-zoom">
        <span className="discret">Zoom</span>
        <input type="range" min={1} max={6} step={0.25} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" />
        <span className="discret">{Math.round(zoom * 100)} %</span>
      </div>
      <div className="cartes-cadre">
        <div className="cartes-pile" style={{ width: `${zoom * 100}%`, aspectRatio: `${l} / ${h}` }}>
          {p.url ? <img src={p.url} alt={p.carte.nom} draggable={false} /> : <div className="vide">Image introuvable.</div>}
          <svg
            ref={svg} viewBox={`0 0 ${l} ${h}`} className={`cartes-calque outil-${p.outil}`}
            onPointerDown={bas} onPointerMove={bouge} onPointerUp={haut}
          >
            {p.zonesEnfants.map((z) => (
              <g key={z.id} className="cartes-enfant" onPointerUp={(e) => { if (p.outil === 'voir') { e.stopPropagation(); p.onEnfant(z.id); } }}>
                <rect x={z.zone[0]} y={z.zone[1]} width={z.zone[2]} height={z.zone[3]} />
                <text x={z.zone[0] + rayon * 0.6} y={z.zone[1] + rayon * 2} fontSize={rayon * 1.6}>{z.nom}</text>
              </g>
            ))}
            {p.reperes.map((r) => (
              <g key={r.id} className={`cartes-repere ${r.id === p.repereActif ? 'actif' : ''} ${(r.mj as { cache?: boolean } | undefined)?.cache ? 'cache' : ''}`}
                onPointerUp={(e) => { if (p.outil === 'voir') { e.stopPropagation(); p.onRepere(r.id); } }}>
                <circle cx={r.x} cy={r.y} r={rayon} />
                <text x={r.x + rayon * 1.4} y={r.y + rayon * 0.5} fontSize={rayon * 1.8}>{r.nom}</text>
              </g>
            ))}
            {p.pointsEchelle.map(([x, y], i) => <circle key={i} className="cartes-point" cx={x} cy={y} r={rayon * 0.7} />)}
            {p.pointsEchelle.length === 2 && (
              <line className="cartes-ligne" x1={p.pointsEchelle[0][0]} y1={p.pointsEchelle[0][1]} x2={p.pointsEchelle[1][0]} y2={p.pointsEchelle[1][1]} strokeWidth={rayon * 0.4} />
            )}
            {trace && (
              <rect className="cartes-trace" x={Math.min(trace[0], trace[2])} y={Math.min(trace[1], trace[3])}
                width={Math.abs(trace[2] - trace[0])} height={Math.abs(trace[3] - trace[1])} strokeWidth={rayon * 0.3} />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
