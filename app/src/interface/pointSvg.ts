// Point d'un dessin SVG (viewBox l × h, preserveAspectRatio « xMidYMid meet ») sous la souris ou le doigt. Calculé
// avec la boîte réelle de l'élément : juste même quand une zone de zoom l'agrandit (transform CSS), dans tous les
// navigateurs (getScreenCTM ignore parfois ces transformations).
export function pointSvg(svg: SVGSVGElement, clientX: number, clientY: number, l: number, h: number): [number, number] {
  const r = svg.getBoundingClientRect();
  const k = Math.min(r.width / l, r.height / h);
  const ox = (r.width - l * k) / 2, oy = (r.height - h * k) / 2;
  return [(clientX - r.left - ox) / k, (clientY - r.top - oy) / k];
}
