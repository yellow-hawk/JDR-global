// Panoramique et zoom d'une vue SVG (molette centrée sur le curseur, glisser le fond pour déplacer).
import { useCallback, useEffect, useRef, useState } from 'react';

export interface Vue { x: number; y: number; k: number }

const bloquer = (e: WheelEvent) => e.preventDefault();

export function usePanZoom(initiale: Vue = { x: 0, y: 0, k: 1 }) {
  const [vue, setVue] = useState<Vue>(initiale);
  const vueRef = useRef(vue); vueRef.current = vue;
  // Doigts posés (pincement à deux doigts) ; un seul : glisser pour déplacer.
  const doigts = useRef(new Map<number, { x: number; y: number }>());
  const geste = useRef<{ v: Vue; cx: number; cy: number; d: number } | null>(null);
  const el = useRef<SVGSVGElement | null>(null);

  const zoomerAutour = (v: Vue, f: number, mx: number, my: number): Vue => {
    const k = Math.min(6, Math.max(0.08, v.k * f));
    return { k, x: mx - ((mx - v.x) / v.k) * k, y: my - ((my - v.y) / v.k) * k };
  };
  const molette = useCallback((ev: React.WheelEvent<SVGSVGElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    setVue((v) => zoomerAutour(v, ev.deltaY < 0 ? 1.15 : 1 / 1.15, ev.clientX - r.left, ev.clientY - r.top));
  }, []);
  // La molette zoome la vue, jamais la page qui la contient (écouteur non passif pour pouvoir l'en empêcher).
  const ref = useCallback((n: SVGSVGElement | null) => {
    if (el.current) el.current.removeEventListener('wheel', bloquer);
    el.current = n;
    if (n) n.addEventListener('wheel', bloquer, { passive: false });
  }, []);
  const repartir = (svg: SVGSVGElement) => {
    const ps = [...doigts.current.values()], r = svg.getBoundingClientRect();
    if (!ps.length) { geste.current = null; return; }
    const cx = ps.reduce((s, p) => s + p.x, 0) / ps.length - r.left, cy = ps.reduce((s, p) => s + p.y, 0) / ps.length - r.top;
    geste.current = { v: vueRef.current, cx, cy, d: ps.length > 1 ? Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) : 0 };
  };
  const debut = useCallback((ev: React.PointerEvent<SVGSVGElement>) => {
    if (doigts.current.size === 0 && (ev.target as Element).closest('[data-noeud]')) return;
    doigts.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* pointeur sans capture */ }
    repartir(ev.currentTarget);
  }, []);
  const bouge = useCallback((ev: React.PointerEvent<SVGSVGElement>) => {
    const g = geste.current;
    if (!g || !doigts.current.has(ev.pointerId)) return;
    doigts.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const ps = [...doigts.current.values()], r = ev.currentTarget.getBoundingClientRect();
    const cx = ps.reduce((s, p) => s + p.x, 0) / ps.length - r.left, cy = ps.reduce((s, p) => s + p.y, 0) / ps.length - r.top;
    let v = { ...g.v, x: g.v.x + cx - g.cx, y: g.v.y + cy - g.cy };
    if (ps.length > 1 && g.d > 0) v = zoomerAutour(v, Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) / g.d, cx, cy);
    setVue(v);
  }, []);
  const fin = useCallback((ev?: React.PointerEvent<SVGSVGElement>) => {
    if (!ev) { doigts.current.clear(); geste.current = null; return; }
    doigts.current.delete(ev.pointerId);
    repartir(ev.currentTarget);
  }, []);

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

  return { vue, setVue, cadrer, centrerSur, versDessin, gestion: { ref, onWheel: molette, onPointerDown: debut, onPointerMove: bouge, onPointerUp: fin, onPointerCancel: fin } };
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
