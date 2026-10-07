// Panoramique et zoom d'une vue SVG (molette centrée sur le curseur, glisser le fond pour déplacer).
import { useCallback, useEffect, useRef, useState } from 'react';

export interface Vue { x: number; y: number; k: number }

export function usePanZoom(initiale: Vue = { x: 0, y: 0, k: 1 }) {
  const [vue, setVue] = useState<Vue>(initiale);
  const glisse = useRef<{ sx: number; sy: number; v: Vue } | null>(null);

  const molette = useCallback((ev: React.WheelEvent<SVGSVGElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const mx = ev.clientX - r.left, my = ev.clientY - r.top;
    setVue((v) => {
      const k = Math.min(6, Math.max(0.08, v.k * (ev.deltaY < 0 ? 1.15 : 1 / 1.15)));
      return { k, x: mx - ((mx - v.x) / v.k) * k, y: my - ((my - v.y) / v.k) * k };
    });
  }, []);
  const debut = useCallback((ev: React.PointerEvent<SVGSVGElement>) => {
    if ((ev.target as Element).closest('[data-noeud]')) return;
    glisse.current = { sx: ev.clientX, sy: ev.clientY, v: vue };
    ev.currentTarget.setPointerCapture(ev.pointerId);
  }, [vue]);
  const bouge = useCallback((ev: React.PointerEvent<SVGSVGElement>) => {
    const g = glisse.current;
    if (g) setVue({ ...g.v, x: g.v.x + ev.clientX - g.sx, y: g.v.y + ev.clientY - g.sy });
  }, []);
  const fin = useCallback(() => { glisse.current = null; }, []);

  /** Cadre le rectangle [x0, y0, x1, y1] dans une vue de l × h pixels. */
  const cadrer = useCallback((x0: number, y0: number, x1: number, y1: number, l: number, h: number, marge = 40) => {
    const k = Math.min(2, Math.max(0.08, Math.min((l - 2 * marge) / Math.max(1, x1 - x0), (h - 2 * marge) / Math.max(1, y1 - y0))));
    setVue({ k, x: (l - (x1 - x0) * k) / 2 - x0 * k, y: (h - (y1 - y0) * k) / 2 - y0 * k });
  }, []);

  /** Centre la vue sur un point du dessin (placé au tiers haut), au zoom k. */
  const centrerSur = useCallback((x: number, y: number, k: number, l: number, h: number) => {
    setVue({ k, x: l / 2 - x * k, y: h * 0.18 - y * k });
  }, []);

  /** Convertit un point écran (relatif au SVG) en coordonnées du dessin. */
  const versDessin = useCallback((sx: number, sy: number) => ({ x: (sx - vue.x) / vue.k, y: (sy - vue.y) / vue.k }), [vue]);

  return { vue, setVue, cadrer, centrerSur, versDessin, gestion: { onWheel: molette, onPointerDown: debut, onPointerMove: bouge, onPointerUp: fin, onPointerLeave: fin } };
}

/** Taille d'un élément, suivie avec ResizeObserver. */
export function useTaille<T extends HTMLElement>(): [React.RefObject<T>, { l: number; h: number }] {
  const ref = useRef<T>(null);
  const [t, setT] = useState({ l: 800, h: 600 });
  useEffect(() => {
    const e = ref.current;
    if (!e) return;
    const maj = () => setT({ l: e.clientWidth || 800, h: e.clientHeight || 600 });
    const ro = new ResizeObserver(maj);
    ro.observe(e); maj();
    return () => ro.disconnect();
  }, []);
  return [ref, t];
}
