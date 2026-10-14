// Joueurs à distance (pur, testé) : un jeton secret par PJ (son lien personnel), ses messages privés, la fiche qu'il
// voit (lecture seule) et ses notes. Rangé dans `modules.joueurs.distants`, par id de personnage.
import type { Campagne, Personnage } from '../../noyau/contrat';
import { nouvelId } from '../../noyau/contrat';
import type { SystemeRegles } from '../../noyau/regles';
import { aUneFiche, lireStat } from '../../noyau/regles';
import { FICHE_CSS, ficheCorpsHtml } from '../personnages';

export interface MessagePrive { id: string; quand: string; texte: string; image?: string | null }
export interface Distant { jeton: string; messages: MessagePrive[] }

export const distantsDe = (c: Campagne): Record<string, Distant> =>
  ((c.modules?.joueurs as { distants?: Record<string, Distant> } | undefined)?.distants) ?? {};
const avecDistants = (c: Campagne, d: Record<string, Distant>): Campagne =>
  ({ ...c, modules: { ...c.modules, joueurs: { ...c.modules?.joueurs, distants: d } } });

/** Jeton secret (16 caractères) : il fait partie du lien du joueur, impossible à deviner. */
export function jetonNeuf(): string {
  const a = new Uint8Array(16);
  globalThis.crypto.getRandomValues(a);
  return [...a].map((x) => 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31]).join('');
}

/** Donne un jeton au PJ s'il n'en a pas ; `nouveau` : en change (l'ancien lien ne marche plus). */
export function avecJeton(c: Campagne, persoId: string, nouveau = false): Campagne {
  const d = distantsDe(c), x = d[persoId];
  if (x && !nouveau) return c;
  return avecDistants(c, { ...d, [persoId]: { jeton: jetonNeuf(), messages: x?.messages ?? [] } });
}

export function ajouterMessage(c: Campagne, persoId: string, texte: string, image: string | null = null, quand = new Date().toISOString()): Campagne {
  const d = distantsDe(c), x = d[persoId] ?? { jeton: jetonNeuf(), messages: [] };
  return avecDistants(c, { ...d, [persoId]: { ...x, messages: [...x.messages, { id: nouvelId('msg'), quand, texte, image }] } });
}
export function retirerMessage(c: Campagne, persoId: string, id: string): Campagne {
  const d = distantsDe(c), x = d[persoId];
  return x ? avecDistants(c, { ...d, [persoId]: { ...x, messages: x.messages.filter((m) => m.id !== id) } }) : c;
}

/** Lien personnel d'un joueur. `base` : adresse publique (tunnel) ou locale, sans « / » final. */
export const lienJoueur = (base: string, salon: string, jeton: string): string =>
  `${base.replace(/\/+$/, '')}/?ecran=joueurs&salon=${encodeURIComponent(salon)}&joueur=${encodeURIComponent(jeton)}`;

/** Personnage d'un jeton. */
export const persoDuJeton = (c: Campagne, jeton: string): Personnage | undefined => {
  const id = Object.entries(distantsDe(c)).find(([, x]) => x.jeton === jeton)?.[0];
  return id ? c.personnages.find((p) => p.id === id) : undefined;
};

/** Notes écrites par le joueur sur sa fiche. */
export const notesJoueur = (p: Personnage): string => p.fiche?.notesJoueur ?? '';
export const avecNotesJoueur = (c: Campagne, persoId: string, notes: string): Campagne =>
  ({ ...c, personnages: c.personnages.map((p) => (p.id === persoId ? { ...p, fiche: { ...(p.fiche ?? {}), notesJoueur: notes.slice(0, 20000) } } : p)) });

const e = (s: unknown): string => String(s ?? '').replace(/[&<>"]/g, (k) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[k]!));

/**
 * Fiche vue par le joueur (lecture seule) : celle de l'impression, sans rien du MJ. Le portrait est ajouté à
 * l'arrivée (adresse locale de l'image). Sans fiche détaillée : identité, description et stats affichées.
 */
export function ficheDuJoueur(p: Personnage, R: SystemeRegles): { nom: string; html: string; css: string } {
  if (aUneFiche(R) && p.fiche) return { nom: p.nom, html: ficheCorpsHtml(p, R, R.calculer(p), '{{portrait}}'), css: FICHE_CSS.replace(/@page[^}]*}/, '') };
  const stats = R.champs.map((ch) => { const v = lireStat(p.combat.stats, ch.cle); return v === undefined || v === '' ? '' : `<li><b>${e(ch.libelle)}</b> ${e(v)}</li>`; }).join('');
  return { nom: p.nom, html: `<section class="fiche"><h1>${e(p.nom)}</h1>${p.role ? `<p>${e(p.role)}</p>` : ''}${p.notes ? `<p>${e(p.notes)}</p>` : ''}<ul>${stats}</ul></section>`, css: FICHE_CSS };
}
