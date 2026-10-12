// Assemblage du livre : images lues dans le stockage et réduites, parties choisies dans l'ordre, sommaire cliquable,
// en une page HTML autonome qui s'imprime (ou s'enregistre en PDF) depuis le navigateur.
import type { Campagne } from '../../noyau/contrat';
import { regles } from '../../noyau/regles';
import { lireFichier } from '../../noyau/stockage';
import { FICHE_CSS } from '../personnages';
import * as J from './html/jeu';
import * as M from './html/monde';
import { SCRIPT_AJUSTER, STYLE_LIVRE, type Partie } from './html/outils';
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

/** Styles de la fiche de personnage en unités relatives (pour que la feuille puisse rapetisser). */
const ficheRelative = () => FICHE_CSS.replace(/@page[^}]*}/, '').replace(/(\d+(?:\.\d+)?)pt/g, (_, n: string) => `${(Number(n) / 10.5).toFixed(3)}em`);

export interface Progres { fait: number; total: number; texte: string }

export async function assemblerLivre(c0: Campagne, choix: ChoixLivre, o: { imprimer?: boolean; progres?: (p: Progres) => void } = {}): Promise<string> {
  const progres = o.progres ?? (() => {});
  const c = campagneDuLivre(c0, choix);
  const R = regles(c.campagne.regles);
  const ids = (s: SectionId) => new Set(retenus(c, choix, s).map((x) => x.id));
  const mj = choix.version === 'mj';
  const carteMj = mj && choix.cartesMj;
  const idsPeuples = ids('peuples'), idsVilles = ids('villes');
  const peuples = M.peuplesDe(c).filter((x) => idsPeuples.has(x.id));

  // Images nécessaires : cartes des pays et des villes, autres cartes, portraits, documents.
  const image = (k: { images: { joueurs: string | null; mj?: { image: string } } }) => (carteMj && k.images.mj?.image) || k.images.joueurs || '';
  const besoins: [string, number][] = [
    ...peuples.map((x) => M.carteDuPays(c, x)).filter((k): k is NonNullable<typeof k> => !!k).map((k): [string, number] => [image(k), 1800]),
    ...peuples.flatMap((x) => M.cartesDesVilles(c, x)).filter((k) => idsVilles.has(k.id)).map((k): [string, number] => [image(k), 1600]),
    ...c.cartes.filter((k) => ids('cartes').has(k.id)).map((k): [string, number] => [image(k), 2400]),
    ...c.personnages.filter((p) => ids('personnages').has(p.id) && p.portrait).map((p): [string, number] => [p.portrait!, 320]),
    ...(c.documents ?? []).filter((d) => ids('documents').has(d.id) && d.image).map((d): [string, number] => [d.image!, 1600]),
  ].filter(([id]) => !!id);
  const images: M.Images = new Map();
  for (const [i, [id, max]] of besoins.entries()) {
    progres({ fait: i, total: besoins.length, texte: 'Images' });
    if (images.has(id)) continue;
    try { const r = await imageReduite(c.campagne.id, id, max); if (r) images.set(id, r); } catch { /* image illisible : on continue sans */ }
  }
  progres({ fait: besoins.length, total: besoins.length, texte: 'Mise en page' });

  const parties = [
    choix.sections.peuples || choix.sections.villes
      ? M.peuples(c, { ids: choix.sections.peuples ? idsPeuples : new Set(M.peuplesDe(c).map((x) => x.id)), dynasties: choix.sections.dynasties && choix.sections.peuples, villes: idsVilles, images, mj: carteMj })
      : null,
    choix.sections.calendrier ? M.calendrierCampagne(c) : null,
    choix.sections.chronologie ? M.chronologie(c) : null,
    J.cartes(c, ids('cartes'), images, carteMj),
    J.quetes(c, ids('quetes')),
    J.seances(c, ids('seances')),
    J.personnages(c, ids('personnages'), R, images),
    J.familles(c, ids('familles')),
    J.talents(c, ids('talents')),
    J.documents(c, ids('documents'), images),
    mj ? J.rencontres(c, ids('rencontres')) : null,
    J.sorts(c, ids('sorts')),
  ].filter((p): p is Partie => !!p);

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${c.campagne.nom.replace(/</g, '')} — livre de campagne</title>
<style>${STYLE_LIVRE}\n${ficheRelative()}</style></head><body>
${choix.sections.couverture ? M.couverture(c, choix.version) + M.sommaire(parties) : ''}
${parties.map((p) => p.html).join('\n')}
<script>
  // Chaque feuille « ajuster » rapetisse son texte jusqu'à tenir, puis impression quand les images sont prêtes.
  Promise.all([...document.images].map((i) => i.decode().catch(() => null))).then(() => {
    ${SCRIPT_AJUSTER}
    ${o.imprimer === false ? '' : 'setTimeout(() => window.print(), 400);'}
  });
</script>
</body></html>`;
}
