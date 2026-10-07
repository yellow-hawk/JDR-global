// Côté JDR Global du pont avec l'Atlas (public/atlas/js/23-pont.js). Messages par postMessage, même origine.

export interface PnjAtlas {
  nom: string; role: string; peuple: number; peupleNom: string;
  apparence: string; humeur: string; citation: string; veut: string; secret: string; antagoniste: boolean;
}
export interface EtatAtlas {
  entry: Record<string, unknown> & { name: string; params?: { seed?: string } };
  monde: { nom: string; peuples: { cle: number; nom: string; couleur: string }[] };
}

let compteur = 0;

/** Envoie une demande à l'Atlas et attend sa réponse (délai max 20 s). */
export function demander<T>(cadre: HTMLIFrameElement, type: string, extra: Record<string, unknown> = {}): Promise<T> {
  const id = `q${++compteur}`;
  return new Promise((ok, ko) => {
    const fin = window.setTimeout(() => { window.removeEventListener('message', ecoute); ko(new Error("L'Atlas ne répond pas.")); }, 20000);
    function ecoute(ev: MessageEvent) {
      if (ev.source !== cadre.contentWindow || ev.data?.type !== 'atlas:reponse' || ev.data.id !== id) return;
      window.clearTimeout(fin);
      window.removeEventListener('message', ecoute);
      if (ev.data.erreur) ko(new Error(ev.data.erreur)); else ok(ev.data as T);
    }
    window.addEventListener('message', ecoute);
    cadre.contentWindow?.postMessage({ type, id, ...extra }, window.location.origin === 'null' ? '*' : window.location.origin);
  });
}

export function ouvrirDansAtlas(cadre: HTMLIFrameElement, entry: Record<string, unknown>): void {
  cadre.contentWindow?.postMessage({ type: 'atlas:ouvrir', entry }, window.location.origin === 'null' ? '*' : window.location.origin);
}
