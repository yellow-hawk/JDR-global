// Bus d'événements entre modules (même fenêtre) et canal vers l'écran joueurs (autre fenêtre).
// Un module n'appelle jamais l'intérieur d'un autre : il émet ou écoute un événement.
import { sansSecrets } from '../contrat';

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

/** Ce que l'écran joueurs affiche. Toujours passé par sansSecrets() avant envoi. */
export type Scene =
  | { sorte: 'vide'; campagne?: string }
  | { sorte: 'texte'; titre: string; texte: string }
  | { sorte: 'personnage'; nom: string; sousTitre: string; texte: string; portrait?: Blob | null }
  | { sorte: 'image'; titre: string; image: Blob };

type MessageEcran = { type: 'scene'; scene: Scene } | { type: 'bonjour' };

const NOM_CANAL = 'jdr-global/ecran-joueurs';
const canal = (): BroadcastChannel | null =>
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(NOM_CANAL);

let canalMj: BroadcastChannel | null = null;
let sceneCourante: Scene = { sorte: 'vide' };

/** Côté MJ : montre une scène sur l'écran joueurs (et la retient pour les écrans ouverts plus tard). */
export function montrerAuxJoueurs(scene: Scene): void {
  sceneCourante = sansSecrets(scene); // sécurité : aucune clé mj ne part vers l'écran joueurs
  if (!canalMj) {
    canalMj = canal();
    if (canalMj) canalMj.onmessage = (e: MessageEvent<MessageEcran>) => {
      if (e.data?.type === 'bonjour') canalMj!.postMessage({ type: 'scene', scene: sceneCourante });
    };
  }
  canalMj?.postMessage({ type: 'scene', scene: sceneCourante } satisfies MessageEcran);
}

/** Côté MJ : à appeler au démarrage pour répondre aux écrans joueurs qui s'ouvrent. */
export function preparerDiffusion(campagne?: string): void {
  if (sceneCourante.sorte === 'vide') sceneCourante = { sorte: 'vide', campagne };
  montrerAuxJoueurs(sceneCourante);
}

/** Côté écran joueurs : reçoit chaque nouvelle scène. Renvoie la fonction d'arrêt. */
export function recevoirScenes(f: (s: Scene) => void): () => void {
  const c = canal();
  if (!c) return () => {};
  c.onmessage = (e: MessageEvent<MessageEcran>) => { if (e.data?.type === 'scene') f(e.data.scene); };
  c.postMessage({ type: 'bonjour' } satisfies MessageEcran);
  return () => c.close();
}

/** Ouvre la fenêtre de l'écran joueurs (à glisser sur la télé, puis plein écran). */
export function ouvrirEcranJoueurs(): Window | null {
  const url = new URL(window.location.href);
  url.search = '?ecran=joueurs';
  url.hash = '';
  return window.open(url.toString(), 'jdr-ecran-joueurs', 'width=1280,height=720');
}
