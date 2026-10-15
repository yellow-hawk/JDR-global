// Joueurs à distance (pur, testé) : un jeton secret par PJ (son lien personnel), ses messages privés, la fiche qu'il
// voit (lecture seule) et ses notes. Rangé dans `modules.joueurs.distants`, par id de personnage.
import type { Campagne, Personnage } from '../../noyau/contrat';
import { nouvelId } from '../../noyau/contrat';
import type { SystemeRegles } from '../../noyau/regles';
import { aUneFiche, lireStat } from '../../noyau/regles';
import { acquerir, arbresPour, retirer } from '../../noyau/talents';
import { FICHE_CSS, ficheCorpsHtml } from '../personnages';
import { appliquerEntrainement, aUneMagie, DROITS_PAR_DEFAUT, magieDepuisProfil, profilDe, type DroitsEntrainement } from '../magie';

/** `de` : 'joueur' pour un message écrit par le joueur au MJ (sinon, du MJ au joueur). */
export interface MessagePrive { id: string; quand: string; texte: string; image?: string | null; de?: 'joueur' }
/**
 * `luMj` : nombre de messages du joueur déjà vus par le MJ ; `sansEntrainement` : pas de zone d'entraînement ;
 * `jets` : jets demandés par le MJ ; `niveau` : montée de niveau proposée par le joueur, en attente.
 */
export interface Distant {
  jeton: string; messages: MessagePrive[]; luMj?: number; sansEntrainement?: boolean;
  jets?: import('./actions').DemandeJet[]; niveau?: import('./actions').DemandeNiveau | null;
}

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

export function ajouterMessage(c: Campagne, persoId: string, texte: string, image: string | null = null, quand = new Date().toISOString(), de?: 'joueur'): Campagne {
  const d = distantsDe(c), x = d[persoId] ?? { jeton: jetonNeuf(), messages: [] };
  const m: MessagePrive = { id: nouvelId('msg'), quand, texte, image, ...(de ? { de } : {}) };
  return avecDistants(c, { ...d, [persoId]: { ...x, messages: [...x.messages, m] } });
}

/** Messages du joueur que le MJ n'a pas encore vus. */
export const nonLusMj = (d?: Distant): number => (d ? Math.max(0, d.messages.filter((m) => m.de === 'joueur').length - (d.luMj ?? 0)) : 0);
export function marquerLusMj(c: Campagne, persoId: string): Campagne {
  const d = distantsDe(c), x = d[persoId];
  if (!x || !nonLusMj(x)) return c;
  return avecDistants(c, { ...d, [persoId]: { ...x, luMj: x.messages.filter((m) => m.de === 'joueur').length } });
}
export function retirerMessage(c: Campagne, persoId: string, id: string): Campagne {
  const d = distantsDe(c), x = d[persoId];
  return x ? avecDistants(c, { ...d, [persoId]: { ...x, messages: x.messages.filter((m) => m.id !== id) } }) : c;
}

/* ---------- zone d'entraînement (magie) ---------- */

/** Ce que le MJ permet à l'entraînement (pour tous les joueurs) : `modules.joueurs.entrainement`. */
export const droitsEntrainement = (c: Campagne): DroitsEntrainement =>
  ({ ...DROITS_PAR_DEFAUT, ...((c.modules?.joueurs as { entrainement?: Partial<DroitsEntrainement> } | undefined)?.entrainement ?? {}) });
export const avecDroitsEntrainement = (c: Campagne, d: Partial<DroitsEntrainement>): Campagne =>
  ({ ...c, modules: { ...c.modules, joueurs: { ...c.modules?.joueurs, entrainement: { ...droitsEntrainement(c), ...d } } } });

/** Le joueur de ce PJ a-t-il une zone d'entraînement ? (personnage qui trace des sorts, sauf refus du MJ) */
export const entrainementActif = (c: Campagne, p: Personnage): boolean => aUneMagie(p) && !distantsDe(c)[p.id]?.sansEntrainement;
export function avecEntrainement(c: Campagne, persoId: string, actif: boolean): Campagne {
  const d = distantsDe(c), x = d[persoId];
  return x ? avecDistants(c, { ...d, [persoId]: { ...x, sansEntrainement: !actif } }) : c;
}

/** Carnet renvoyé par l'écran du joueur : gardé dans les limites permises (records, calibrage, leçons, grimoire). */
export function avecEntrainementRecu(c: Campagne, persoId: string, recu: Record<string, unknown>): Campagne {
  const p = c.personnages.find((x) => x.id === persoId);
  if (!p || !entrainementActif(c, p)) return c;
  const profil = appliquerEntrainement(profilDe(p), recu, droitsEntrainement(c));
  const magie = magieDepuisProfil(profil);
  if (JSON.stringify(magie) === JSON.stringify(magieDepuisProfil(profilDe(p)))) return c;
  return { ...c, personnages: c.personnages.map((x) => (x.id === persoId ? { ...x, magie } : x)) };
}

/* ---------- arbre de talents ---------- */

/** Ce que le MJ permet : développer son arbre lui-même, et oublier un talent. `modules.joueurs.talents`. */
export interface DroitsTalents { developper: boolean; retirer: boolean }
export const droitsTalents = (c: Campagne): DroitsTalents =>
  ({ developper: true, retirer: false, ...((c.modules?.joueurs as { talents?: Partial<DroitsTalents> } | undefined)?.talents ?? {}) });
export const avecDroitsTalents = (c: Campagne, d: Partial<DroitsTalents>): Campagne =>
  ({ ...c, modules: { ...c.modules, joueurs: { ...c.modules?.joueurs, talents: { ...droitsTalents(c), ...d } } } });

/** Arbre de talents envoyé au joueur : sa progression seulement (rien d'autre de la fiche ni du MJ). */
export function talentsDuJoueur(c: Campagne, p: Personnage, R: SystemeRegles) {
  if (!aUneFiche(R)) return null;
  const perso = { id: p.id, nom: p.nom, sorte: p.sorte, fiche: { progression: p.fiche?.progression ?? {} }, combat: { stats: { niveau: p.combat.stats.niveau } } };
  return { perso, arbres: arbresPour(p), parNiveau: R.talents.pointsParNiveau, droits: droitsTalents(c) };
}

/** Demande du joueur (apprendre ou oublier un talent) : appliquée seulement si permise et si les règles l'acceptent. */
export function avecTalentDemande(c: Campagne, persoId: string, d: { faire?: unknown; id?: unknown }, R: SystemeRegles): Campagne {
  const p = c.personnages.find((x) => x.id === persoId), droits = droitsTalents(c);
  if (!p || !aUneFiche(R) || typeof d.id !== 'string') return c;
  let q = p;
  if (d.faire === 'acquerir' && droits.developper) q = acquerir(p, d.id, R.talents.pointsParNiveau);
  else if (d.faire === 'retirer' && droits.retirer) q = retirer(p, d.id);
  return q === p ? c : { ...c, personnages: c.personnages.map((x) => (x.id === persoId ? q : x)) };
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
