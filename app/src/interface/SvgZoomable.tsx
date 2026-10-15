// Dessin vectoriel (arbre, organigramme) zoomable sur l'écran joueurs. Le zoom change le cadrage du dessin
// (viewBox) au lieu d'agrandir une image : le texte reste net à tout zoom. Au départ, tout le dessin est visible.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type Boite = [number, number, number, number];

export function SvgZoomable({ svg }: { svg: string }) {
  const hote = useRef<HTMLDivElement>(null);
  // La molette zoome le dessin, jamais la page autour (écouteur non passif).
  const zone = useRef<HTMLDivElement | null>(null);
  const bloquerMolette = (n: HTMLDivElement | null) => {
    const bloquer = (e: WheelEvent) => e.preventDefault();
    if (zone.current === n) return;
    zone.current = n;
    n?.addEventListener('wheel', bloquer, { passive: false });
  };
  const [depart, setDepart] = useState<Boite | null>(null);
  const [vb, setVb] = useState<Boite | null>(null);
  const pointeurs = useRef(new Map<number, { x: number; y: number }>());
  const geste = useRef<{ vb: Boite; d: number; cx: number; cy: number } | null>(null);

  // Le dessin est posé une fois ; il occupe toute la zone, entier (preserveAspectRatio « meet »).
  useLayoutEffect(() => {
    const h = hote.current!;
    h.innerHTML = svg;
    const el = h.querySelector('svg');
    if (!el) return;
    el.removeAttribute('style');
    el.setAttribute('width', '100%'); el.setAttribute('height', '100%');
    el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const b = (el.getAttribute('viewBox') ?? '0 0 100 100').split(/[\s,]+/).map(Number) as Boite;
    setDepart(b); setVb(b);
  }, [svg]);
  useEffect(() => { if (vb) hote.current?.querySelector('svg')?.setAttribute('viewBox', vb.join(' ')); }, [vb]);

  // Point de l'écran → point du dessin, avec le cadrage actuel (zone « meet » centrée).
  const versDessin = (b: Boite, sx: number, sy: number): [number, number] => {
    const r = hote.current!.getBoundingClientRect();
    const k = Math.min(r.width / b[2], r.height / b[3]);
    const ox = (r.width - b[2] * k) / 2, oy = (r.height - b[3] * k) / 2;
    return [b[0] + (sx - r.left - ox) / k, b[1] + (sy - r.top - oy) / k];
  };
  const zoomer = (b: Boite, f: number, sx: number, sy: number): Boite => {
    if (!depart) return b;
    const w = Math.min(depart[2], Math.max(depart[2] / 30, b[2] / f));
    const fx = w / b[2], [px, py] = versDessin(b, sx, sy);
    return [px - (px - b[0]) * fx, py - (py - b[1]) * fx, w, b[3] * fx];
  };
  const recommencer = () => {
    const ps = [...pointeurs.current.values()];
    if (!ps.length || !vb) { geste.current = null; return; }
    const cx = ps.reduce((s, p) => s + p.x, 0) / ps.length, cy = ps.reduce((s, p) => s + p.y, 0) / ps.length;
    geste.current = { vb, d: ps.length > 1 ? Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) : 0, cx, cy };
  };

  return (
    <div className="ecran-svg-zoom" ref={bloquerMolette}
      onWheel={(e) => vb && setVb(zoomer(vb, e.deltaY < 0 ? 1.25 : 1 / 1.25, e.clientX, e.clientY))}
      onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointeur sans capture */ } pointeurs.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); recommencer(); }}
      onPointerMove={(e) => {
        const g = geste.current;
        if (!pointeurs.current.has(e.pointerId) || !g) return;
        pointeurs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const ps = [...pointeurs.current.values()];
        const cx = ps.reduce((s, p) => s + p.x, 0) / ps.length, cy = ps.reduce((s, p) => s + p.y, 0) / ps.length;
        const [ax, ay] = versDessin(g.vb, g.cx, g.cy), [bx, by] = versDessin(g.vb, cx, cy);
        let n: Boite = [g.vb[0] - (bx - ax), g.vb[1] - (by - ay), g.vb[2], g.vb[3]];
        if (ps.length > 1 && g.d > 0) n = zoomer(n, Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) / g.d, cx, cy);
        setVb(n);
      }}
      onPointerUp={(e) => { pointeurs.current.delete(e.pointerId); recommencer(); }}
      onPointerCancel={(e) => { pointeurs.current.delete(e.pointerId); recommencer(); }}
      onDoubleClick={() => depart && setVb(depart)}>
      <div ref={hote} className="ecran-svg-dessin" />
      {vb && depart && vb[2] < depart[2] * 0.98 && <button className="btn btn-petit ecran-zoom-retour" onPointerDown={(e) => e.stopPropagation()} onClick={() => setVb(depart)}>Vue d’ensemble</button>}
    </div>
  );
}
