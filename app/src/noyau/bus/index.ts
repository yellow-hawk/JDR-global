// Bus d'événements entre modules (même fenêtre) et canal vers l'écran joueurs (autre fenêtre).
// Un module n'appelle jamais l'intérieur d'un autre : il émet ou écoute un événement.
import { sansSecrets } from '../contrat';
import type { JetDes } from '../regles';

/* ---------- bus interne ---------- */

/** Catalogue des événements. Ajouter ici tout nouvel événement (c'est la documentation). */
export interface Evenements {
  /** Demande d'ouverture d'une page : { page: id de module, cible?: id d'objet } */
  'naviguer': { page: string; cible?: string };
  /** Message court à afficher à l'utilisateur. */
  'message': { texte: string; sorte?: 'info' | 'succes' | 'erreur' };
}

type Ecouteur<T> = (donnees: T) => void;
const ecouteurs = new Map<string, Set<Ecouteur<unknown>>>();

export function emettre<K extends keyof Evenements>(type: K, donnees: Evenements[K]): void {
  if (type === 'naviguer') {
    const n = donnees as Evenements['naviguer'];
    if (n.cible) cibles.set(n.page, n.cible);
  }
  ecouteurs.get(type)?.forEach((f) => f(donnees));
}

/* Objet à ouvrir à l'arrivée sur une page (posé par « naviguer » avec une cible). */
const cibles = new Map<string, string>();

/** Lue une seule fois par la page d'arrivée : `prendreCible('personnages')` → id du personnage à ouvrir. */
export function prendreCible(page: string): string | undefined {
  const c = cibles.get(page);
  cibles.delete(page);
  return c;
}

/** Abonne `f` ; renvoie la fonction de désabonnement. */
export function ecouter<K extends keyof Evenements>(type: K, f: Ecouteur<Evenements[K]>): () => void {
  if (!ecouteurs.has(type)) ecouteurs.set(type, new Set());
  ecouteurs.get(type)!.add(f as Ecouteur<unknown>);
  return () => { ecouteurs.get(type)?.delete(f as Ecouteur<unknown>); };
}

/* ---------- écran joueurs ---------- */

/** Habillage d'un document montré aux joueurs. */
export type StyleDocument = 'parchemin' | 'lettre' | 'affiche' | 'note';

/** Ce que l'écran joueurs affiche. Toujours passé par sansSecrets() avant envoi. */
export type Scene =
  | { sorte: 'vide'; campagne?: string }
  | { sorte: 'texte'; titre: string; texte: string }
  | { sorte: 'personnage'; nom: string; sousTitre: string; texte: string; portrait?: Blob | null }
  | { sorte: 'image'; titre: string; image: Blob }
  | { sorte: 'document'; titre: string; texte?: string; image?: Blob | null; style: StyleDocument };

/** Messages du canal : scène principale, jet de dés (animé), historique des jets, bandeau (date du monde…). */
type MessageEcran =
  | { type: 'scene'; scene: Scene }
  | { type: 'jet'; jet: JetDes }
  | { type: 'historique'; jets: JetDes[] }
  | { type: 'bandeau'; texte: string | null }
  | { type: 'bonjour' };

const NOM_CANAL = 'jdr-global/ecran-joueurs';
const canal = (): BroadcastChannel | null =>
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(NOM_CANAL);

let canalMj: BroadcastChannel | null = null;
let sceneCourante: Scene = { sorte: 'vide' };
let bandeauCourant: string | null = null;
const historique: JetDes[] = [];
const ecouteursJets = new Set<(h: JetDes[]) => void>();
const MAX_HISTORIQUE = 12;

function canalDuMj(): BroadcastChannel | null {
  if (!canalMj) {
    canalMj = canal();
    if (canalMj) canalMj.onmessage = (e: MessageEvent<MessageEcran>) => {
      if (e.data?.type !== 'bonjour') return;
      canalMj!.postMessage({ type: 'scene', scene: sceneCourante } satisfies MessageEcran);
      canalMj!.postMessage({ type: 'bandeau', texte: bandeauCourant } satisfies MessageEcran);
      canalMj!.postMessage({ type: 'historique', jets: historique } satisfies MessageEcran);
    };
  }
  return canalMj;
}

/** Côté MJ : montre une scène sur l'écran joueurs (et la retient pour les écrans ouverts plus tard). */
export function montrerAuxJoueurs(scene: Scene): void {
  sceneCourante = sansSecrets(scene); // sécurité : aucune clé mj ne part vers l'écran joueurs
  canalDuMj()?.postMessage({ type: 'scene', scene: sceneCourante } satisfies MessageEcran);
}

/** Côté MJ : petit bandeau permanent sur l'écran joueurs (ex. date du monde). null = le retirer. */
export function montrerBandeau(texte: string | null): void {
  bandeauCourant = texte;
  canalDuMj()?.postMessage({ type: 'bandeau', texte } satisfies MessageEcran);
}
export const bandeauAffiche = (): string | null => bandeauCourant;

/**
 * Côté MJ : note un jet de dés. Public : il roule en 3D sur l'écran joueurs et rejoint l'historique partagé.
 * Caché : seulement dans l'historique du MJ.
 */
export function annoncerJet(jet: JetDes, cache = false): void {
  historique.unshift(cache ? { ...jet, qui: `${jet.qui ? `${jet.qui} · ` : ''}caché` } : jet);
  historique.length = Math.min(historique.length, MAX_HISTORIQUE);
  if (!cache) canalDuMj()?.postMessage({ type: 'jet', jet } satisfies MessageEcran);
  ecouteursJets.forEach((f) => f([...historique]));
}

/** Côté MJ : historique des jets (le plus récent d'abord), et abonnement à ses changements. */
export function historiqueJets(): JetDes[] { return [...historique]; }
export function suivreJets(f: (h: JetDes[]) => void): () => void {
  ecouteursJets.add(f);
  return () => { ecouteursJets.delete(f); };
}

/** Côté MJ : à appeler au démarrage pour répondre aux écrans joueurs qui s'ouvrent. */
export function preparerDiffusion(campagne?: string): void {
  if (sceneCourante.sorte === 'vide') sceneCourante = { sorte: 'vide', campagne };
  montrerAuxJoueurs(sceneCourante);
}

export interface RecepteurEcran {
  scene(s: Scene): void;
  jet?(j: JetDes): void;
  historique?(h: JetDes[]): void;
  bandeau?(t: string | null): void;
}

/** Côté écran joueurs : reçoit les scènes, jets et bandeaux. Renvoie la fonction d'arrêt. */
export function recevoirEcran(r: RecepteurEcran): () => void {
  const c = canal();
  if (!c) return () => {};
  c.onmessage = (e: MessageEvent<MessageEcran>) => {
    const m = e.data;
    if (m?.type === 'scene') r.scene(m.scene);
    else if (m?.type === 'jet') r.jet?.(m.jet);
    else if (m?.type === 'historique') r.historique?.(m.jets);
    else if (m?.type === 'bandeau') r.bandeau?.(m.texte);
  };
  c.postMessage({ type: 'bonjour' } satisfies MessageEcran);
  return () => c.close();
}

/** Ancienne forme : seulement les scènes. */
export const recevoirScenes = (f: (s: Scene) => void): (() => void) => recevoirEcran({ scene: f });

/** Ouvre la fenêtre de l'écran joueurs (à glisser sur la télé, puis plein écran). */
export function ouvrirEcranJoueurs(): Window | null {
  const url = new URL(window.location.href);
  url.search = '?ecran=joueurs';
  url.hash = '';
  return window.open(url.toString(), 'jdr-ecran-joueurs', 'width=1280,height=720');
}
