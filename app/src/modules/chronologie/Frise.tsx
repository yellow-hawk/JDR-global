// Frise chronologique en SVG : une ligne par source (événements, séances, histoire de chaque peuple),
// zoom à la molette autour du curseur, glisser pour se déplacer, clic sur un point pour le détail.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ElementFrise } from './logique';

interface Props {
  elements: ElementFrise[];
  lignes: string[];
  maintenant: number;
  choisi: string | null;
  onChoisir(id: string | null): void;
}

const HAUT_LIGNE = 54, GAUCHE = 130, HAUT_AXE = 28;

export function Frise({ elements, lignes, maintenant, choisi, onChoisir }: Props) {
  const boite = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(900);
  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setLargeur(el.clientWidth));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const visibles = lignes.filter((l) => elements.some((e) => e.ligne === l) || l === 'Événements');
  const [min, max] = useMemo(() => {
    const ts = elements.map((e) => e.t).concat(maintenant);
    const a = Math.min(...ts), b = Math.max(...ts);
    const marge = Math.max(2, (b - a) * 0.05);
    return [a - marge, b + marge];
  }, [elements, maintenant]);
  const utile = Math.max(100, largeur - GAUCHE - 20);
  // vue : années par pixel et début ; cadrée sur tout au départ
  const [vue, setVue] = useState<{ debut: number; parPx: number } | null>(null);
  const v = vue ?? { debut: min, parPx: (max - min) / utile };
  const x = (t: number) => GAUCHE + (t - v.debut) / v.parPx;
  const glisse = useRef<{ x: number; debut: number } | null>(null);

  const molette = (e: React.WheelEvent) => {
    const r = boite.current!.getBoundingClientRect();
    const sous = v.debut + (e.clientX - r.left - GAUCHE) * v.parPx;
    const parPx = Math.min((max - min) / utile * 4, Math.max(0.0005, v.parPx * (e.deltaY > 0 ? 1.2 : 1 / 1.2)));
    setVue({ parPx, debut: sous - (e.clientX - r.left - GAUCHE) * parPx });
  };
  const graduations = useMemo(() => {
    const etendue = utile * v.parPx;
    const pas = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find((p) => etendue / p <= 12) ?? 10000;
    const l: number[] = [];
    for (let a = Math.ceil(v.debut / pas) * pas; a <= v.debut + etendue; a += pas) l.push(a);
    return l;
  }, [v, utile]);
  const hauteur = HAUT_AXE + visibles.length * HAUT_LIGNE + 10;

  return (
    <div ref={boite} className="chrono-frise" onWheel={molette}
      onPointerDown={(e) => { if (!(e.target as Element).closest('[data-element]')) { glisse.current = { x: e.clientX, debut: v.debut }; (e.currentTarget as Element).setPointerCapture(e.pointerId); } }}
      onPointerMove={(e) => { if (glisse.current) setVue({ parPx: v.parPx, debut: glisse.current.debut - (e.clientX - glisse.current.x) * v.parPx }); }}
      onPointerUp={() => { glisse.current = null; }}>
      <svg width={largeur} height={hauteur} onClick={(e) => { if (!(e.target as Element).closest('[data-element]')) onChoisir(null); }}>
        {graduations.map((a) => (
          <g key={a}>
            <line x1={x(a)} x2={x(a)} y1={HAUT_AXE - 6} y2={hauteur} className="chrono-grad" />
            <text x={x(a)} y={HAUT_AXE - 10} className="chrono-an">{a}</text>
          </g>
        ))}
        {visibles.map((l, i) => {
          const y = HAUT_AXE + i * HAUT_LIGNE + HAUT_LIGNE / 2;
          const items = elements.filter((e) => e.ligne === l);
          let dernierX = -Infinity, haut = false;
          return (
            <g key={l}>
              <rect x={0} y={y - HAUT_LIGNE / 2} width={largeur} height={HAUT_LIGNE} className={i % 2 ? 'chrono-bande' : 'chrono-bande impaire'} />
              <line x1={GAUCHE} x2={largeur} y1={y} y2={y} className="chrono-ligne" />
              {items.map((e) => {
                const px = x(e.t);
                if (px < GAUCHE - 10 || px > largeur + 10) return null;
                const place = px - dernierX > 120;
                if (place) { haut = !haut; dernierX = px; }
                return (
                  <g key={e.id} data-element transform={`translate(${px},${y})`} className={`chrono-point ${choisi === e.id ? 'choisi' : ''}`} onClick={() => onChoisir(e.id)}>
                    <circle r={choisi === e.id ? 8 : 6} fill={e.couleur} />
                    {(place || choisi === e.id) && <text y={haut ? -11 : 19} className="chrono-titre">{e.titre.length > 22 ? `${e.titre.slice(0, 21)}…` : e.titre}</text>}
                    <title>{e.titre}</title>
                  </g>
                );
              })}
              <rect x={0} y={y - HAUT_LIGNE / 2} width={GAUCHE - 6} height={HAUT_LIGNE} className="chrono-etiquette-fond" />
              <text x={8} y={y + 4} className="chrono-etiquette">{l.length > 16 ? `${l.slice(0, 15)}…` : l}</text>
            </g>
          );
        })}
        {x(maintenant) >= GAUCHE && (
          <g>
            <line x1={x(maintenant)} x2={x(maintenant)} y1={HAUT_AXE - 4} y2={hauteur} className="chrono-maintenant" />
            <text x={x(maintenant) + 4} y={hauteur - 4} className="chrono-maintenant-texte">maintenant</text>
          </g>
        )}
      </svg>
      <div className="chrono-zoom">
        <button className="btn btn-petit" onClick={() => setVue(null)}>Tout voir</button>
        <button className="btn btn-petit" onClick={() => setVue({ parPx: 30 / utile, debut: maintenant - 25 })}>Autour de maintenant</button>
      </div>
    </div>
  );
}
