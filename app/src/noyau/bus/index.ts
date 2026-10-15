// Bus d'événements entre modules (même fenêtre) et canal vers l'écran joueurs (autre fenêtre).
// Un module n'appelle jamais l'intérieur d'un autre : il émet ou écoute un événement.
import { sansSecrets } from '../contrat';
import { liaisonLocale, liaisonReseau, sansDoublons, type Liaison, autoriserJoueurs } from './transport';
export { commanderTunnel, infosRelais, type InfosRelais, type InfosTunnel } from './transport';
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
  /** Écran d'attente : nom de la campagne, message et image choisis par le MJ. */
  | { sorte: 'vide'; campagne?: string; message?: string; image?: Blob | null }
  | { sorte: 'texte'; titre: string; texte: string }
  | {
    sorte: 'personnage'; nom: string; sousTitre: string; texte: string; portrait?: Blob | null;
    /** Étiquettes (âge, peuple, CA…), caractéristiques et paragraphes (personnalité…), selon ce que le MJ montre. */
    details?: { libelle: string; valeur: string }[];
    caracs?: { libelle: string; valeur: number; mod: string }[];
    blocs?: { titre: string; texte: string }[];
  }
  | { sorte: 'image'; titre: string; image: Blob }
  | { sorte: 'document'; titre: string; texte?: string; image?: Blob | null; style: StyleDocument }
  /** Dessin vectoriel (arbre généalogique, organigramme…), zoomable sur l'écran joueurs. */
  | { sorte: 'svg'; titre: string; svg: string; texte?: string }
  /** Fiche à sections (pays, lieu…), seulement ce que le MJ a choisi de montrer. */
  | { sorte: 'fiche'; titre: string; sousTitre?: string; image?: Blob | null; sections: { titre: string; texte: string }[] }
  /** Vue interactive fournie par un module (tracé de l'Atelier, visée en combat…) ; voir DefinitionModule.ecranJoueurs. */
  | { sorte: 'module'; module: string; vue: string; titre?: string; donnees: Record<string, unknown> };

/** Messages du canal : scène principale, jet de dés (animé), historique des jets, bandeau (date du monde…). */
type MessageEcran = (
  | { type: 'scene'; scene: Scene }
  | { type: 'jet'; jet: JetDes }
  | { type: 'historique'; jets: JetDes[] }
  | { type: 'bandeau'; texte: string | null }
  /** Complète les données de la vue de module affichée (annotations d'une carte…) sans renvoyer ses images. */
  | { type: 'complement'; donnees: Record<string, unknown> }
  /** `attend` : joueur à distance qui n'a pas encore reçu sa fiche (le MJ la renvoie). */
  | { type: 'bonjour'; qui?: string; attend?: boolean }
  /** Du relais vers un ancien lien : le MJ a changé le lien de ce joueur. */
  | { type: 'refuse' }
  /** De l'écran joueurs vers le MJ : réponse d'une vue interactive (traits tracés, visée…). */
  | { type: 'joueur'; module: string; donnees: Record<string, unknown> }
  /** Du MJ vers un seul joueur à distance (salon privé) : sa fiche, ses messages. */
  | { type: 'prive'; donnees: Record<string, unknown> }
) & { mid?: string };

const mid = (): string => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

let sceneCourante: Scene = { sorte: 'vide' };
let sourceCourante = 'attente';
/** Dernière chose montrée avant l'écran d'attente, pour la reprendre. */
let avantAttente: EcranActuel | null = null;
const ecouteursEcran = new Set<(e: EcranActuel) => void>();
let bandeauCourant: string | null = null;
const historique: JetDes[] = [];
const ecouteursJets = new Set<(h: JetDes[]) => void>();
const MAX_HISTORIQUE = 12;

/* Côté MJ : une liaison locale, plus le relais réseau (tablette de la table, joueurs à distance). Le relais suit le
   salon commun et un salon privé par joueur à distance (`<salon>.<jeton>`), sur un seul flux. */
let liaisonsMj: Liaison[] | null = null;
let reseauMj: { salon: string; liaison: Liaison; jetons: string[] } | null = null;
let jetonsPrives: string[] = [];
const ecouteursJoueurs = new Set<(module: string, donnees: Record<string, unknown>, jeton?: string) => void>();
/** Appareils du salon réseau : dernier « bonjour » de chacun (ils le redisent toutes les 8 s). */
const appareils = new Map<string, number>();
const ecouteursAppareils = new Set<(n: number) => void>();
const nbAppareils = () => [...appareils.values()].filter((t) => Date.now() - t < 20000).length;
let veilleAppareils: ReturnType<typeof setInterval> | undefined;
/** Joueurs à distance : dernier « bonjour » sur leur salon privé, par jeton. */
const presents = new Map<string, number>();
const ecouteursPresents = new Set<(connectes: Set<string>) => void>();
const ecouteursBonjourPrive = new Set<(jeton: string, nouveau: boolean) => void>();
const connectes = () => new Set([...presents].filter(([, t]) => Date.now() - t < 20000).map(([j]) => j));
const signalerPresents = () => { const c = connectes(); ecouteursPresents.forEach((f) => f(c)); };

const recuParMj = sansDoublons((m, salonSource) => {
  const jeton = reseauMj && salonSource?.startsWith(`${reseauMj.salon}.`) ? salonSource.slice(reseauMj.salon.length + 1) : undefined;
  if (m.type === 'bonjour') {
    if (jeton) {
      const nouveau = !connectes().has(jeton);
      presents.set(jeton, Date.now());
      if (nouveau) signalerPresents();
      if (nouveau || m.attend) ecouteursBonjourPrive.forEach((f) => f(jeton, nouveau));
      return;
    }
    if (typeof m.qui === 'string' && m.qui.startsWith('reseau-')) { appareils.set(m.qui, Date.now()); ecouteursAppareils.forEach((f) => f(nbAppareils())); }
    diffuser({ type: 'scene', scene: sceneCourante });
    diffuser({ type: 'bandeau', texte: bandeauCourant });
    diffuser({ type: 'historique', jets: historique });
  } else if (m.type === 'joueur' && typeof m.module === 'string') {
    ecouteursJoueurs.forEach((f) => f(m.module as string, (m.donnees ?? {}) as Record<string, unknown>, jeton));
  }
});

function liaisonsDuMj(): Liaison[] {
  if (!liaisonsMj) {
    liaisonsMj = [];
    const l = liaisonLocale();
    if (l) { liaisonsMj.push(l); l.ecouter(recuParMj); }
  }
  return liaisonsMj;
}
function diffuser(m: MessageEcran): void {
  const avecId = { ...m, mid: mid() };
  for (const l of liaisonsDuMj()) l.envoyer(avecId);
}

/** (Re)branche le flux réseau sur le salon commun et les salons privés des joueurs. */
function brancherReseau(salon: string): void {
  if (reseauMj) { reseauMj.liaison.fermer(); liaisonsMj = (liaisonsMj ?? []).filter((x) => x !== reseauMj!.liaison); }
  const jetons = [...jetonsPrives];
  const l = liaisonReseau([salon, ...jetons.map((j) => `${salon}.${j}`)], `mj-${mid()}`);
  l.ecouter(recuParMj);
  // Sur la liaison réseau, un message « diffusé » part dans le salon commun.
  reseauMj = { salon, liaison: l, jetons };
  void autoriserJoueurs(salon, jetons);
  liaisonsDuMj().push(l);
}

/** Côté MJ : ouvre le salon réseau (tablettes) ; les écrans qui s'y connectent reçoivent tout ce qui est montré. */
export function activerReseau(salon: string): void {
  if (reseauMj?.salon === salon) return;
  desactiverReseau();
  brancherReseau(salon);
  // Un appareil qui ne redit plus bonjour est parti : le compte se met à jour.
  veilleAppareils = setInterval(() => { ecouteursAppareils.forEach((f) => f(nbAppareils())); signalerPresents(); }, 5000);
  ecouteursAppareils.forEach((f) => f(nbAppareils()));
  diffuser({ type: 'scene', scene: sceneCourante });
}
export function desactiverReseau(): void {
  if (!reseauMj) return;
  const l = reseauMj.liaison;
  l.fermer();
  liaisonsMj = (liaisonsMj ?? []).filter((x) => x !== l);
  reseauMj = null;
  if (veilleAppareils) clearInterval(veilleAppareils);
  appareils.clear(); presents.clear();
  ecouteursAppareils.forEach((f) => f(0));
  signalerPresents();
}
export const salonReseau = (): string | null => reseauMj?.salon ?? null;
/** Nombre d'appareils (tablettes…) connectés au salon réseau, et abonnement. */
export function suivreAppareils(f: (n: number) => void): () => void { ecouteursAppareils.add(f); f(nbAppareils()); return () => { ecouteursAppareils.delete(f); }; }

/** Côté MJ : jetons des joueurs à distance (un salon privé chacun). Le flux est rebranché si la liste change. */
export function definirJoueursPrives(jetons: string[]): void {
  const n = [...new Set(jetons)].sort();
  if (n.join(',') === jetonsPrives.join(',')) return;
  jetonsPrives = n;
  if (reseauMj) brancherReseau(reseauMj.salon);
}
/** Côté MJ : envoie à un seul joueur à distance (sa fiche, ses messages). */
export function envoyerPrive(jeton: string, donnees: Record<string, unknown>): void {
  if (!reseauMj) return;
  reseauMj.liaison.envoyer({ type: 'prive', donnees, mid: mid() } satisfies MessageEcran, `${reseauMj.salon}.${jeton}`);
}
/** Côté MJ : joueurs à distance connectés (jetons), et abonnement. */
export function suivreJoueursConnectes(f: (connectes: Set<string>) => void): () => void { ecouteursPresents.add(f); f(connectes()); return () => { ecouteursPresents.delete(f); }; }
/** Côté MJ : un joueur à distance vient d'ouvrir son écran (il faut lui envoyer sa fiche et ses messages). */
export function surArriveeJoueur(f: (jeton: string, nouveau: boolean) => void): () => void { ecouteursBonjourPrive.add(f); return () => { ecouteursBonjourPrive.delete(f); }; }

/** Côté MJ : réponses des vues interactives de l'écran joueurs (module, données ; jeton du joueur s'il est à distance). */
export function ecouterJoueurs(f: (module: string, donnees: Record<string, unknown>, jeton?: string) => void): () => void {
  ecouteursJoueurs.add(f);
  return () => { ecouteursJoueurs.delete(f); };
}

/** Ce qui est affiché sur l'écran joueurs, et qui l'a envoyé (`perso:<id>`, `combat`, `attente`…). */
export interface EcranActuel { scene: Scene; source: string }

/**
 * Côté MJ : montre une scène sur l'écran joueurs (et la retient pour les écrans ouverts plus tard).
 * `source` identifie l'envoyeur : une page qui diffuse en continu (combat, fiche en direct) s'arrête dès qu'une
 * autre source prend l'écran.
 */
export function montrerAuxJoueurs(scene: Scene, source: string = scene.sorte): void {
  if (source === 'attente' && sourceCourante !== 'attente') avantAttente = { scene: sceneCourante, source: sourceCourante };
  sceneCourante = sansSecrets(scene); // sécurité : aucune clé mj ne part vers l'écran joueurs
  sourceCourante = source;
  diffuser({ type: 'scene', scene: sceneCourante });
  ecouteursEcran.forEach((f) => f({ scene: sceneCourante, source }));
}

/** Côté MJ : ce qui est à l'écran maintenant, et abonnement à ses changements. */
export const ecranActuel = (): EcranActuel => ({ scene: sceneCourante, source: sourceCourante });

/** Ce que l'écran montrait avant l'écran d'attente (null : rien à reprendre). */
export const avantLAttente = (): EcranActuel | null => (sourceCourante === 'attente' ? avantAttente : null);
/**
 * Remet sur l'écran joueurs ce qui y était avant l'attente. La page d'origine (combat, fiche en direct) voit
 * revenir sa source et reprend sa diffusion.
 */
export function reprendreApresAttente(): boolean {
  const a = avantLAttente();
  if (!a) return false;
  montrerAuxJoueurs(a.scene, a.source);
  return true;
}
export function suivreEcran(f: (e: EcranActuel) => void): () => void {
  ecouteursEcran.add(f);
  return () => { ecouteursEcran.delete(f); };
}

/** Libellé court de ce qui est à l'écran (en-tête du MJ). */
export function libelleScene(s: Scene): string {
  if (s.sorte === 'vide') return 'Écran d’attente';
  if (s.sorte === 'personnage') return s.nom;
  if (s.sorte === 'module') return s.titre ?? s.vue;
  return s.titre;
}

/** Côté MJ : petit bandeau permanent sur l'écran joueurs (ex. date du monde). null = le retirer. */
/**
 * Côté MJ : met à jour quelques données de la vue de module affichée (scène `module`), sans renvoyer le reste
 * (une image de carte reste où elle est ; seules les annotations partent). Ignoré si une autre source a l'écran.
 */
export function completerScene(source: string, donnees: Record<string, unknown>): void {
  if (sourceCourante !== source || sceneCourante.sorte !== 'module') return;
  const propres = sansSecrets(donnees);
  sceneCourante = { ...sceneCourante, donnees: { ...sceneCourante.donnees, ...propres } };
  diffuser({ type: 'complement', donnees: propres });
}

export function montrerBandeau(texte: string | null): void {
  bandeauCourant = texte;
  diffuser({ type: 'bandeau', texte });
}
export const bandeauAffiche = (): string | null => bandeauCourant;

/**
 * Côté MJ : note un jet de dés. Public : il roule en 3D sur l'écran joueurs et rejoint l'historique partagé.
 * Caché : seulement dans l'historique du MJ.
 */
export function annoncerJet(jet: JetDes, cache = false): void {
  historique.unshift(cache ? { ...jet, qui: `${jet.qui ? `${jet.qui} · ` : ''}caché` } : jet);
  historique.length = Math.min(historique.length, MAX_HISTORIQUE);
  if (!cache) diffuser({ type: 'jet', jet });
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
  if (sceneCourante.sorte === 'vide') sceneCourante = { ...sceneCourante, campagne };
  montrerAuxJoueurs(sceneCourante, sourceCourante);
}

export interface RecepteurEcran {
  scene(s: Scene): void;
  jet?(j: JetDes): void;
  historique?(h: JetDes[]): void;
  bandeau?(t: string | null): void;
  /** Données ajoutées à la vue de module affichée (voir completerScene). */
  complement?(d: Record<string, unknown>): void;
  /** Joueur à distance : ce que le MJ lui envoie à lui seul (fiche, messages). */
  prive?(d: Record<string, unknown>): void;
  /** Joueur à distance : son lien a été remplacé par le MJ (l'écran ne reçoit plus rien). */
  refuse?(): void;
}

/* Côté écran joueurs : par le relais si l'adresse a un salon (?salon=…), sinon en local. Un joueur à distance
   (?joueur=<jeton>) suit aussi son salon privé : sa fiche et les messages du MJ n'arrivent qu'à lui. */
let liaisonJoueur: Liaison | null = null;
let salonPrive: string | null = null;

/** Côté écran joueurs : reçoit les scènes, jets et bandeaux (et, pour un joueur à distance, ce qui lui est privé). */
export function recevoirEcran(r: RecepteurEcran): () => void {
  const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  const salon = params?.get('salon') ?? null, joueur = params?.get('joueur') ?? null;
  const qui = `${salon ? 'reseau' : 'local'}-${mid()}`;
  salonPrive = salon && joueur ? `${salon}.${joueur}` : null;
  const l = salon ? liaisonReseau(salonPrive ? [salon, salonPrive] : [salon], qui) : liaisonLocale();
  if (!l) return () => {};
  liaisonJoueur = l;
  let recuPrive = false;
  let relance: ReturnType<typeof setInterval> | undefined;
  l.ecouter(sansDoublons((m) => {
    if (m.type === 'refuse') { if (relance) clearInterval(relance); l.fermer(); r.refuse?.(); return; }
    if (m.type === 'scene') r.scene(m.scene as Scene);
    else if (m.type === 'jet') r.jet?.(m.jet as JetDes);
    else if (m.type === 'historique') r.historique?.(m.jets as JetDes[]);
    else if (m.type === 'bandeau') r.bandeau?.(m.texte as string | null);
    else if (m.type === 'complement') r.complement?.((m.donnees ?? {}) as Record<string, unknown>);
    else if (m.type === 'prive') { recuPrive = true; r.prive?.((m.donnees ?? {}) as Record<string, unknown>); }
  }));
  const bonjour = () => {
    l.envoyer({ type: 'bonjour', qui, mid: mid() });
    if (salonPrive) l.envoyer({ type: 'bonjour', qui, attend: !recuPrive, mid: mid() }, salonPrive);
  };
  // Bonjour seulement une fois le flux ouvert : sinon la fiche envoyée en réponse arriverait avant qu'on écoute.
  void (l.pret ?? Promise.resolve()).then(bonjour);
  // Par le réseau, le MJ a pu ouvrir son salon après nous : on redit bonjour de temps en temps.
  relance = salon ? setInterval(bonjour, 8000) : undefined;
  return () => { if (relance) clearInterval(relance); l.fermer(); if (liaisonJoueur === l) liaisonJoueur = null; };
}

/** Côté écran joueurs : réponse au MJ (vue interactive, notes du joueur) ; un joueur à distance passe par son salon privé. */
export function envoyerAuMj(module: string, donnees: Record<string, unknown>): void {
  liaisonJoueur?.envoyer({ type: 'joueur', module, donnees, mid: mid() }, salonPrive ?? undefined);
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
