// Brouillard de guerre d'une carte : la carte part couverte, le MJ révèle (ou recache) au pinceau.
// Les traits sont en pixels de l'image d'origine et s'appliquent dans l'ordre.
import type { Brouillard, Carte } from '../../noyau/contrat';

export type Trait = Brouillard['traits'][number];

export const brouillardDe = (k: Carte): Brouillard => k.brouillard ?? { actif: false, traits: [] };

/** Ajoute un trait, sauf s'il recouvre presque le précédent (même sorte) : évite les milliers de points d'un glissé. */
export function ajouterTrait(traits: Trait[], t: Trait): Trait[] {
  const p = traits[traits.length - 1];
  if (p && p.revele === t.revele && Math.abs(p.r - t.r) < 1 && Math.hypot(p.x - t.x, p.y - t.y) < t.r * 0.35) return traits;
  return [...traits, { x: Math.round(t.x), y: Math.round(t.y), r: Math.round(t.r), revele: t.revele }];
}

/** Tout révéler : un seul grand trait qui couvre l'image. */
export const toutReveler = (l: number, h: number): Brouillard => ({ actif: true, traits: [{ x: Math.round(l / 2), y: Math.round(h / 2), r: Math.ceil(Math.hypot(l, h)), revele: true }] });
export const toutCacher = (): Brouillard => ({ actif: true, traits: [] });

/** Les traits recouverts ensuite par « tout révéler / tout cacher » ne servent plus : on garde la liste courte. */
export function compacter(traits: Trait[], l: number, h: number): Trait[] {
  const diag = Math.hypot(l, h);
  let debut = 0;
  traits.forEach((t, i) => { if (t.r >= diag) debut = i; });
  return traits.slice(debut);
}

/** Dessine le masque (opaque = caché) sur un contexte de taille l×h (déjà mis à l'échelle de l'image). */
export function dessinerMasque(ctx: CanvasRenderingContext2D, traits: Trait[], l: number, h: number, couleur = '#0b0906'): void {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = couleur;
  ctx.fillRect(0, 0, l, h);
  for (const t of traits) {
    ctx.globalCompositeOperation = t.revele ? 'destination-out' : 'source-over';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Image joueurs avec le brouillard appliqué (pour l'écran joueurs). Réduite à 2400 px pour rester légère. */
export async function imageAvecBrouillard(image: Blob, b: Brouillard): Promise<Blob> {
  if (!b.actif) return image;
  const bmp = await createImageBitmap(image);
  const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const l = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
  const toile = document.createElement('canvas');
  toile.width = l; toile.height = h;
  const ctx = toile.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0, l, h);
  bmp.close();
  const masque = document.createElement('canvas');
  masque.width = l; masque.height = h;
  const m = masque.getContext('2d')!;
  m.scale(k, k);
  dessinerMasque(m, b.traits, l / k, h / k);
  ctx.drawImage(masque, 0, 0);
  return new Promise((ok, ko) => toile.toBlob((x) => (x ? ok(x) : ko(new Error('Image impossible'))), 'image/jpeg', 0.9));
}
