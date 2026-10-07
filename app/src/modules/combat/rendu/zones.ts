// Dessin des zones : terrains (avec motif) et sorts, plus le contour d'une forme de zone quelconque.
import { DEMI_LARGEUR_LIGNE } from '../moteur/formes';
import type { TypeTerrain, Zone } from '../moteur/types';
import { avecAlpha, ecran, OR, type Peintre } from './peintre';

type ZoneDessin = Omit<Zone, 'id'>;

/** Trace la forme (chemin fermé) d'une zone, sans la remplir. */
export function cheminZone(p: Peintre, z: ZoneDessin): void {
  const { ctx, u } = p;
  ctx.beginPath();
  if (z.forme === 'polygone') {
    (z.points ?? []).forEach((pt, i) => { const [x, y] = ecran(p, pt); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.closePath();
    return;
  }
  const [cx, cy] = ecran(p, [z.x, z.y]);
  const r = z.rayon * u, a = z.angle || 0;
  switch (z.forme) {
    case 'cercle': ctx.arc(cx, cy, r, 0, Math.PI * 2); break;
    case 'carre': ctx.rect(cx - r, cy - r, r * 2, r * 2); break;
    case 'cone': ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a - Math.PI / 4, a + Math.PI / 4); ctx.closePath(); break;
    case 'ligne': case 'rectangle': {
      const demi = z.forme === 'ligne' ? DEMI_LARGEUR_LIGNE * u : ((z.largeur ?? 1) * u) / 2;
      const c = Math.cos(a), s = Math.sin(a);
      const pts: [number, number][] = [[0, -demi], [r, -demi], [r, demi], [0, demi]];
      pts.forEach(([lx, ly], i) => { const x = cx + lx * c - ly * s, y = cy + lx * s + ly * c; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.closePath();
      break;
    }
  }
}

function motif(p: Peintre, m: TypeTerrain['motif'], couleur: string): void {
  const { ctx, largeur: w, hauteur: h } = p;
  ctx.strokeStyle = couleur; ctx.fillStyle = couleur; ctx.lineWidth = 1;
  // Motifs ancrés sur la caméra pour qu'ils suivent la carte quand on la déplace.
  const ox = ((p.cam.x % 40) + 40) % 40, oy = ((p.cam.y % 40) + 40) % 40;
  ctx.beginPath();
  if (m === 'hachures' || m === 'croix') {
    for (let i = -h - 40 + ox; i < w + 40; i += 8) { ctx.moveTo(i, -40); ctx.lineTo(i + h + 80, h + 40); }
    if (m === 'croix') for (let i = -40 + ox; i < w + h + 40; i += 10) { ctx.moveTo(i, -40); ctx.lineTo(i - h - 80, h + 40); }
    ctx.stroke();
  } else if (m === 'vagues') {
    for (let j = oy - 40; j < h + 40; j += 12) { ctx.moveTo(0, j); for (let i = 0; i < w; i += 4) ctx.lineTo(i, j + Math.sin((i - ox) * 0.15) * 4); }
    ctx.stroke();
  } else {
    for (let x = ox - 40; x < w; x += 10) for (let y = oy - 40; y < h; y += 10) { ctx.moveTo(x + 6.5, y + 5); ctx.arc(x + 5, y + 5, 1.5, 0, Math.PI * 2); }
    ctx.fill();
  }
}

export function dessinerZone(p: Peintre, z: ZoneDessin, opacite: number, types: TypeTerrain[], choisie = false): void {
  const { ctx } = p;
  const t = z.categorie === 'terrain' ? types.find((x) => x.id === z.terrain) : undefined;
  const couleur = z.couleur || t?.couleur || 'rgba(155,89,182,0.5)';
  ctx.save();
  cheminZone(p, z);
  ctx.fillStyle = avecAlpha(couleur, opacite);
  ctx.fill();
  if (t) { ctx.save(); ctx.clip(); motif(p, t.motif, avecAlpha(couleur, Math.min(1, opacite * 2))); ctx.restore(); cheminZone(p, z); }
  ctx.strokeStyle = choisie ? OR : avecAlpha(couleur, Math.min(1, opacite * 2.5));
  ctx.lineWidth = choisie ? 2.5 : 1.5;
  if (t || choisie) ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.restore();
  if (z.nom && (z.forme === 'polygone' || p.u > 18)) {
    const [x, y] = z.forme === 'polygone' && z.points?.length
      ? ecran(p, [z.points.reduce((s, q) => s + q[0], 0) / z.points.length, z.points.reduce((s, q) => s + q[1], 0) / z.points.length])
      : ecran(p, [z.x, z.y]);
    ctx.save();
    ctx.font = `600 ${Math.max(9, Math.min(13, p.u * 0.25))}px 'Marcellus SC', serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillText(z.nom, x, y);
    ctx.restore();
  }
}

export function dessinerZones(p: Peintre, zones: Zone[], opacites: { sorts: number; terrains: number }, types: TypeTerrain[], choisie: number | null): void {
  for (const z of zones) if (z.categorie === 'terrain') dessinerZone(p, z, opacites.terrains, types, z.id === choisie);
  for (const z of zones) if (z.categorie !== 'terrain') dessinerZone(p, z, opacites.sorts, types, z.id === choisie);
}
