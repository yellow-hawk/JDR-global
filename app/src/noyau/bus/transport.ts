// Transport des messages entre la fenêtre du MJ et les écrans joueurs.
// - local : BroadcastChannel (même navigateur, même ordinateur : télé, second écran, écran tactile branché) ;
// - réseau : relais du serveur local (lancer.bat / serveur.mjs) pour une tablette ou un autre ordinateur du
//   même réseau. Le relais ne fait que transmettre : les images (Blob) voyagent encodées en base 64.

export interface Liaison {
  envoyer(m: object): void;
  ecouter(f: (m: Record<string, unknown>) => void): () => void;
  fermer(): void;
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

/** Copie prête pour JSON : chaque Blob devient { __blob: adresse data: }. */
export async function versReseau(v: unknown): Promise<unknown> {
  if (typeof Blob !== 'undefined' && v instanceof Blob) return { __blob: await blobEnBase64(v) };
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

/** Le serveur qui a servi la page sait-il relayer ? Renvoie ses adresses sur le réseau local. */
export async function infosRelais(): Promise<{ adresses: string[]; port: number } | null> {
  try {
    const r = await fetch('relais/infos', { cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

/** Liaison par le relais : écoute en flux (EventSource), envoi en POST. `qui` identifie l'envoyeur (pas d'écho). */
export function liaisonReseau(salon: string, qui: string, base = ''): Liaison {
  const ecouteurs = new Set<(m: Record<string, unknown>) => void>();
  const q = `salon=${encodeURIComponent(salon)}&qui=${encodeURIComponent(qui)}`;
  const flux = new EventSource(`${base}relais/ecoute?${q}`);
  flux.onmessage = (e) => {
    try { const m = depuisReseau(JSON.parse(e.data)) as Record<string, unknown>; ecouteurs.forEach((f) => f(m)); } catch { /* message illisible */ }
  };
  // Les messages partent dans l'ordre, l'un après l'autre.
  let file: Promise<unknown> = Promise.resolve();
  return {
    envoyer: (m) => {
      file = file.then(async () => {
        const corps = JSON.stringify(await versReseau(m));
        await fetch(`${base}relais/envoi?${q}`, { method: 'POST', body: corps, headers: { 'Content-Type': 'application/json' } }).catch(() => undefined);
      });
    },
    ecouter: (f) => { ecouteurs.add(f); return () => { ecouteurs.delete(f); }; },
    fermer: () => flux.close(),
  };
}

/** Écarte les messages déjà reçus (le même message peut arriver par deux liaisons). */
export function sansDoublons(f: (m: Record<string, unknown>) => void): (m: Record<string, unknown>) => void {
  const vus: string[] = [];
  return (m) => {
    const id = typeof m.mid === 'string' ? m.mid : null;
    if (id) { if (vus.includes(id)) return; vus.push(id); if (vus.length > 300) vus.shift(); }
    f(m);
  };
}
