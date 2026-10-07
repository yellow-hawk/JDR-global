// Calque du brouillard sur la visionneuse : opaque pour les joueurs, voilé pour le MJ ; peint au pinceau avec l'outil « brouillard ».
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as PE } from 'react';
import { ajouterTrait, dessinerMasque, type Trait } from './brouillard';

interface Props {
  l: number; h: number;
  traits: Trait[];
  /** 'joueurs' : opaque ; 'mj' : voilé. */
  vue: 'joueurs' | 'mj';
  /** Pinceau actif : rayon (pixels de l'image) et mode ; null = pas d'édition. */
  pinceau: { r: number; revele: boolean } | null;
  onTrace(traits: Trait[]): void;
}

const MAX_TOILE = 1600;

export function CalqueBrouillard({ l, h, traits, vue, pinceau, onTrace }: Props) {
  const toile = useRef<HTMLCanvasElement>(null);
  const [trace, setTrace] = useState<Trait[] | null>(null);
  const [survol, setSurvol] = useState<{ x: number; y: number } | null>(null);
  const k = Math.min(1, MAX_TOILE / Math.max(l, h));
  const tous = trace ? [...traits, ...trace] : traits;

  useEffect(() => {
    const cv = toile.current;
    if (!cv) return;
    cv.width = Math.round(l * k); cv.height = Math.round(h * k);
    const ctx = cv.getContext('2d')!;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    dessinerMasque(ctx, tous, l, h, vue === 'mj' ? '#1a1010' : '#0b0906');
  }, [tous, l, h, k, vue]);

  const point = (e: PE): { x: number; y: number } => {
    const r = toile.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * l, y: ((e.clientY - r.top) / r.height) * h };
  };
  const bas = (e: PE) => {
    if (!pinceau) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = point(e);
    setTrace([{ ...p, ...pinceau }]);
  };
  const bouge = (e: PE) => {
    const p = point(e);
    setSurvol(p);
    if (pinceau && trace) setTrace((t) => ajouterTrait(t ?? [], { ...p, ...pinceau }));
  };
  const haut = () => { if (trace) { onTrace(trace); setTrace(null); } };

  return (
    <>
      <canvas ref={toile} className={`cartes-brouillard ${vue} ${pinceau ? 'edition' : ''}`}
        onPointerDown={bas} onPointerMove={bouge} onPointerUp={haut} onPointerLeave={() => setSurvol(null)} />
      {pinceau && survol && (
        <svg className="cartes-pinceau" viewBox={`0 0 ${l} ${h}`} aria-hidden="true">
          <circle cx={survol.x} cy={survol.y} r={pinceau.r} className={pinceau.revele ? 'revele' : 'cache'} />
        </svg>
      )}
    </>
  );
}
