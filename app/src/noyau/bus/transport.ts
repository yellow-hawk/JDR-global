// Transport des messages entre la fenêtre du MJ et les écrans joueurs.
// - local : BroadcastChannel (même navigateur, même ordinateur : télé, second écran, écran tactile branché) ;
// - réseau : relais du serveur local (lancer.bat / serveur.mjs) pour une tablette ou un autre ordinateur du
//   même réseau. Le relais ne fait que transmettre : les images (Blob) voyagent encodées en base 64.

export interface Liaison {
  /** Envoie un message ; par le réseau, `salon` choisit le salon (sinon le premier suivi). */
  envoyer(m: object, salon?: string): void;
  /** `salon` : le salon d'où vient le message (réseau seulement). */
  ecouter(f: (m: Record<string, unknown>, salon?: string) => void): () => void;
  fermer(): void;
  /** Réseau : résolue quand le flux est ouvert (avant, un message du MJ pourrait être perdu). */
  pret?: Promise<void>;
}

const NOM_CANAL = 'jdr-global/ecran-joueurs';

export function liaisonLocale(): Liaison | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  const c = new BroadcastChannel(NOM_CANAL);
  const ecouteurs = new Set<(m: Record<string, unknown>) => void>();
  c.onmessage = (e: MessageEvent) => { if (e.data && typeof e.data === 'object') ecouteurs.forEach((f) => f(e.data)); };
  return {
    envoyer: (m) => c.postMessage(m),
    ecouter: (f) => { ecouteurs.add(f); return () => { ecouteurs.delete(f); }; },
    fermer: () => c.close(),
  };
}

/* ---------- encodage des Blob pour le réseau ---------- */

async function blobEnBase64(b: Blob): Promise<string> {
  const octets = new Uint8Array(await b.arrayBuffer());
  let bin = '';
  for (let i = 0; i < octets.length; i += 0x8000) bin += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return `data:${b.type || 'application/octet-stream'};base64,${btoa(bin)}`;
}

/** Au-delà, une image est allégée avant de partir par le réseau (le second écran local la reçoit telle quelle). */
export const IMAGE_LOURDE = 4 * 1024 * 1024;
const COTE_MAX = 4096;

/**
 * Grande image (carte importée, PDF rendu) → JPEG d'au plus 4096 px de côté : elle passe par le relais et par
 * Internet sans dépasser les limites, et arrive vite. En cas d'échec, l'image d'origine part telle quelle.
 */
export async function alleger(b: Blob): Promise<Blob> {
  if (b.size <= IMAGE_LOURDE || !b.type.startsWith('image/') || b.type.includes('svg') || typeof createImageBitmap === 'undefined' || typeof document === 'undefined') return b;
  try {
    const bmp = await createImageBitmap(b);
    const k = Math.min(1, COTE_MAX / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    const j = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', 0.85));
    return j && j.size < b.size ? j : b;
  } catch { return b; }
}

/** Copie prête pour JSON : chaque Blob devient { __blob: adresse data: } (grandes images allégées). */
export async function versReseau(v: unknown): Promise<unknown> {
  if (typeof Blob !== 'undefined' && v instanceof Blob) return { __blob: await blobEnBase64(await alleger(v)) };
  if (Array.isArray(v)) return Promise.all(v.map(versReseau));
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) o[k] = await versReseau(x);
    return o;
  }
  return v;
}

/** Inverse de versReseau : les { __blob } redeviennent des Blob. */
export function depuisReseau(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(depuisReseau);
  if (v && typeof v === 'object') {
    const b = (v as { __blob?: unknown }).__blob;
    if (typeof b === 'string' && b.startsWith('data:')) {
      const [tete, donnees] = b.split(',');
      const type = /data:([^;]+)/.exec(tete)?.[1] ?? 'application/octet-stream';
      const bin = atob(donnees);
      const octets = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) octets[i] = bin.charCodeAt(i);
      return new Blob([octets], { type });
    }
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) o[k] = depuisReseau(x);
    return o;
  }
  return v;
}

/* ---------- relais réseau ---------- */

/** État du tunnel Cloudflare du serveur local (accès des joueurs à distance). */
export interface InfosTunnel { etat: 'arrete' | 'demarrage' | 'actif' | 'erreur' | 'absent'; adresse: string | null; erreur: string | null }
export interface InfosRelais { adresses: string[]; port: number; tunnel?: InfosTunnel; local?: boolean }

/** Le serveur qui a servi la page sait-il relayer ? Renvoie ses adresses sur le réseau local et l'état du tunnel. */
export async function infosRelais(): Promise<InfosRelais | null> {
  try {
    const r = await fetch('relais/infos', { cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

/** Ouvre ou ferme l'accès Internet (tunnel Cloudflare) ; seul l'ordinateur du MJ y a droit. */
export async function commanderTunnel(action: 'demarrer' | 'arreter'): Promise<InfosTunnel | null> {
  try {
    const r = await fetch(`relais/tunnel?action=${action}`, { method: 'POST' });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

/**
 * Liaison par le relais : un seul flux (EventSource) pour tous les `salons` suivis, envoi en POST vers un salon.
 * `qui` identifie l'envoyeur (pas d'écho). Un seul flux par page : les navigateurs limitent les connexions ouvertes.
 */
export function liaisonReseau(salons: string | string[], qui: string, base = ''): Liaison {
  const liste = Array.isArray(salons) ? salons : [salons];
  const ecouteurs = new Set<(m: Record<string, unknown>, salon?: string) => void>();
  const flux = new EventSource(`${base}relais/ecoute?salon=${encodeURIComponent(liste.join(','))}&qui=${encodeURIComponent(qui)}`);
  let ouvert = () => {};
  const pret = new Promise<void>((r) => { ouvert = r; });
  flux.onopen = () => ouvert();
  flux.onmessage = (e) => {
    try {
      const { salon, m } = JSON.parse(e.data) as { salon: string; m: unknown };
      const msg = depuisReseau(m) as Record<string, unknown>;
      ecouteurs.forEach((f) => f(msg, salon));
    } catch { /* message illisible */ }
  };
  // Les messages partent dans l'ordre, l'un après l'autre.
  let file: Promise<unknown> = Promise.resolve();
  return {
    envoyer: (m, salon = liste[0]) => {
      file = file.then(async () => {
        const corps = JSON.stringify(await versReseau(m));
        const r = await fetch(`${base}relais/envoi?salon=${encodeURIComponent(salon)}&qui=${encodeURIComponent(qui)}`, { method: 'POST', body: corps, headers: { 'Content-Type': 'application/json' } }).catch(() => null);
        if (r && !r.ok) console.warn(`Écran joueurs : envoi refusé par le relais (${r.status}, ${Math.round(corps.length / 1048576)} Mo).`);
      });
    },
    ecouter: (f) => { ecouteurs.add(f); return () => { ecouteurs.delete(f); }; },
    fermer: () => flux.close(),
    pret,
  };
}

/** Côté MJ : jetons valides des joueurs à distance du salon ; le relais coupe et refuse les anciens liens. */
export async function autoriserJoueurs(salon: string, jetons: string[]): Promise<void> {
  await fetch(`relais/autoriser?salon=${encodeURIComponent(salon)}`, { method: 'POST', body: JSON.stringify(jetons), headers: { 'Content-Type': 'application/json' } }).catch(() => undefined);
}

/** Écarte les messages déjà reçus (le même message peut arriver par deux liaisons). */
export function sansDoublons(f: (m: Record<string, unknown>, salon?: string) => void): (m: Record<string, unknown>, salon?: string) => void {
  const vus: string[] = [];
  return (m, salon) => {
    const id = typeof m.mid === 'string' ? m.mid : null;
    if (id) { if (vus.includes(id)) return; vus.push(id); if (vus.length > 300) vus.shift(); }
    f(m, salon);
  };
}
