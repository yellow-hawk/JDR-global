// Zone zoomable de l'écran joueurs : molette ou pincement à deux doigts pour zoomer, glisser pour se déplacer,
// double appui pour revenir à la vue d'ensemble. Le contenu (image, dessin) est centré et tient dans la zone.
// Un appui sans glisser reste au contenu (viser une case sur la table de combat) : le geste ne commence qu'au-delà
// de quelques pixels. Boutons + / − pour zoomer sans molette ni pincement.
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Vue { k: number; x: number; y: number }
const DEPART: Vue = { k: 1, x: 0, y: 0 };

export function Zoomable({ children, cle }: { children: ReactNode; cle?: unknown }) {
  const [v, setV] = useState<Vue>(DEPART);
  const boite = useRef<HTMLDivElement>(null);
  const pointeurs = useRef(new Map<number, { x: number; y: number }>());
  /** Le geste a vraiment commencé (le doigt a glissé, ou deux doigts). */
  const parti = useRef(false);
  const depart = useRef<{ x: number; y: number } | null>(null);
  const geste = useRef<{ v: Vue; d: number; cx: number; cy: number } | null>(null);
  useEffect(() => setV(DEPART), [cle]);

  // Zoom autour d'un point de l'écran (px relatifs à la boîte).
  const zoomer = (base: Vue, facteur: number, px: number, py: number): Vue => {
    const k = Math.min(8, Math.max(1, base.k * facteur));
    const f = k / base.k;
    return k === 1 ? DEPART : { k, x: px - (px - base.x) * f, y: py - (py - base.y) * f };
  };
  const auCentre = (b: Vue, f: number) => { const r = boite.current!.getBoundingClientRect(); return zoomer(b, f, r.width / 2, r.height / 2); };
  const relatif = (x: number, y: number) => { const r = boite.current!.getBoundingClientRect(); return [x - r.left, y - r.top] as const; };

  const surMolette = (ev: React.WheelEvent) => {
    const [px, py] = relatif(ev.clientX, ev.clientY);
    setV((b) => zoomer(b, ev.deltaY < 0 ? 1.2 : 1 / 1.2, px, py));
  };
  // Nouveau geste à chaque doigt posé ou levé : on repart de la vue actuelle.
  const recommencer = (base: Vue) => {
    const ps = [...pointeurs.current.values()];
    if (!ps.length) { geste.current = null; return; }
    const [cx, cy] = relatif(ps.reduce((s, p) => s + p.x, 0) / ps.length, ps.reduce((s, p) => s + p.y, 0) / ps.length);
    geste.current = { v: base, d: ps.length > 1 ? Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) : 0, cx, cy };
  };
  const capturer = (el: HTMLElement) => { for (const id of pointeurs.current.keys()) try { el.setPointerCapture(id); } catch { /* pointeur sans capture */ } };
  const debut = (ev: React.PointerEvent) => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    pointeurs.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointeurs.current.size === 1) { parti.current = false; depart.current = { x: ev.clientX, y: ev.clientY }; }
    else { parti.current = true; capturer(ev.currentTarget as HTMLElement); }
    recommencer(v);
  };
  const bouge = (ev: React.PointerEvent) => {
    if (!pointeurs.current.has(ev.pointerId) || !geste.current) return;
    pointeurs.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (!parti.current) {
      const d = depart.current;
      if (d && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 8) return;
      parti.current = true; capturer(ev.currentTarget as HTMLElement);
    }
    const ps = [...pointeurs.current.values()], g = geste.current;
    const [cx, cy] = relatif(ps.reduce((s, p) => s + p.x, 0) / ps.length, ps.reduce((s, p) => s + p.y, 0) / ps.length);
    let n = { ...g.v, x: g.v.x + cx - g.cx, y: g.v.y + cy - g.cy };
    if (ps.length > 1 && g.d > 0) n = zoomer(n, Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) / g.d, cx, cy);
    setV(n.k === 1 ? DEPART : n);
  };
  const fin = (ev: React.PointerEvent) => {
    pointeurs.current.delete(ev.pointerId);
    recommencer(v);
  };

  return (
    <div ref={boite} className="ecran-zoom" onWheel={surMolette} onPointerDown={debut} onPointerMove={bouge} onPointerUp={fin} onPointerCancel={fin}
      onDoubleClick={(ev) => { ev.stopPropagation(); setV(DEPART); }}>
      <div className="ecran-zoom-contenu" style={{ transform: `translate(${v.x}px, ${v.y}px) scale(${v.k})` }}>{children}</div>
      <div className="ecran-zoom-commandes" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
        <button className="btn btn-petit" title="Zoomer" onClick={() => setV((b) => auCentre(b, 1.5))}>+</button>
        <button className="btn btn-petit" title="Dézoomer" disabled={v.k === 1} onClick={() => setV((b) => auCentre(b, 1 / 1.5))}>−</button>
        {v.k > 1 && <button className="btn btn-petit" onClick={() => setV(DEPART)}>Vue d’ensemble</button>}
      </div>
    </div>
  );
}
