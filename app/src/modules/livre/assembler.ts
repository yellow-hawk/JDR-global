// Assemblage du livre : images lues dans le stockage et réduites, puis parties choisies dans l'ordre,
// en une page HTML autonome qui s'imprime (ou s'enregistre en PDF) depuis le navigateur.
import type { Campagne } from '../../noyau/contrat';
import { regles } from '../../noyau/regles';
import { lireFichier } from '../../noyau/stockage';
import { FICHE_CSS } from '../personnages';
import * as J from './html/jeu';
import * as M from './html/monde';
import { STYLE_LIVRE, type Partie } from './html/outils';
import { campagneDuLivre, retenus, type ChoixLivre, type SectionId } from './selection';

/** Image réduite à `max` px de côté, en JPEG (adresse data:), et si elle est plus large que haute. */
async function imageReduite(idCampagne: string, idFichier: string, max: number): Promise<{ url: string; large: boolean } | null> {
  const b = await lireFichier(idCampagne, idFichier);
  if (!b) return null;
  const bmp = await createImageBitmap(b);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  const large = bmp.width > bmp.height * 1.15;
  bmp.close();
  return { url: c.toDataURL('image/jpeg', 0.86), large };
}

export interface Progres { fait: number; total: number; texte: string }

export async function assemblerLivre(c0: Campagne, choix: ChoixLivre, o: { imprimer?: boolean; progres?: (p: Progres) => void } = {}): Promise<string> {
  const progres = o.progres ?? (() => {});
  const c = campagneDuLivre(c0, choix);
  const R = regles(c.campagne.regles);
  const ids = (s: SectionId) => new Set(retenus(c, choix, s).map((x) => x.id));
  const mj = choix.version === 'mj';

  // Images nécessaires : cartes, portraits, illustrations des documents.
  const besoins: [string, number][] = [
    ...c.cartes.filter((k) => ids('cartes').has(k.id)).map((k): [string, number] => [(mj && choix.cartesMj && k.images.mj?.image) || k.images.joueurs || '', 2200]),
    ...c.personnages.filter((p) => ids('personnages').has(p.id) && p.portrait).map((p): [string, number] => [p.portrait!, 320]),
    ...(c.documents ?? []).filter((d) => ids('documents').has(d.id) && d.image).map((d): [string, number] => [d.image!, 1400]),
  ].filter(([id]) => !!id);
  const images: J.Images = new Map();
  for (const [i, [id, max]] of besoins.entries()) {
    progres({ fait: i, total: besoins.length, texte: 'Images' });
    if (images.has(id)) continue;
    try { const r = await imageReduite(c.campagne.id, id, max); if (r) images.set(id, r); } catch { /* image illisible : on continue sans */ }
  }
  progres({ fait: besoins.length, total: besoins.length, texte: 'Mise en page' });

  const parties = [
    choix.sections.peuples ? M.peuples(c, ids('peuples')) : null,
    choix.sections.institutions ? M.institutions(c, ids('institutions')) : null,
    choix.sections.calendriers ? M.calendriers(c, ids('calendriers')) : null,
    choix.sections.chronologie ? M.chronologie(c) : null,
    J.cartes(c, ids('cartes'), images, mj && choix.cartesMj),
    J.quetes(c, ids('quetes')),
    J.seances(c, ids('seances')),
    J.personnages(c, ids('personnages'), R, images),
    J.genealogies(c, ids('genealogie')),
    J.talents(c, ids('talents')),
    J.documents(c, ids('documents'), images),
    mj ? J.rencontres(c, ids('rencontres')) : null,
    J.sorts(c, ids('sorts')),
  ].filter((p): p is Partie => !!p);

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${c.campagne.nom.replace(/</g, '')} — livre de campagne</title>
<style>${STYLE_LIVRE}\n${FICHE_CSS.replace(/@page[^}]*}/, '')}</style></head><body><div class="feuille">
${choix.sections.couverture ? M.couverture(c, parties, choix.version) : ''}
${parties.map((p) => p.html).join('\n')}
</div>
${o.imprimer === false ? '' : `<script>
  // Impression dès que toutes les images sont prêtes.
  Promise.all([...document.images].map((i) => i.decode().catch(() => null))).then(() => setTimeout(() => window.print(), 400));
</script>`}
</body></html>`;
}
