// Alerte sur l'écran d'un joueur (c'est son tour, le MJ lui demande un jet…) : petit son, vibration sur téléphone,
// titre de l'onglet qui clignote, et l'écran distant affiche un bandeau même si le joueur est sur un autre onglet.
type Ecouteur = (titre: string) => void;
const ecouteurs = new Set<Ecouteur>();

let audio: AudioContext | null = null;
function carillon(): void {
  try {
    audio ??= new AudioContext();
    const t0 = audio.currentTime;
    [660, 880, 1320].forEach((f, i) => {
      const o = audio!.createOscillator(), g = audio!.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + i * 0.14);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + i * 0.14 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.14 + 0.35);
      o.connect(g).connect(audio!.destination);
      o.start(t0 + i * 0.14); o.stop(t0 + i * 0.14 + 0.4);
    });
  } catch { /* pas de son (navigateur sans audio, page jamais touchée) */ }
}

let clignote: ReturnType<typeof setInterval> | undefined;
function titreClignotant(titre: string): void {
  if (typeof document === 'undefined') return;
  const base = document.title.replace(/^⚠ .*? · /, '');
  if (clignote) clearInterval(clignote);
  let n = 0;
  clignote = setInterval(() => {
    document.title = n++ % 2 ? base : `⚠ ${titre} · ${base}`;
    if (n > 20 || (document.hasFocus() && n > 4)) { clearInterval(clignote); document.title = base; }
  }, 900);
}

/** Alerte le joueur qui regarde cet écran. */
export function alerterJoueur(titre: string): void {
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('miroir')) return; // copie muette chez le MJ
  carillon();
  try { navigator.vibrate?.([120, 60, 120]); } catch { /* sans vibreur */ }
  titreClignotant(titre);
  ecouteurs.forEach((f) => f(titre));
}

/** L'écran distant affiche les alertes (bandeau « Voir »). */
export function surAlerteJoueur(f: Ecouteur): () => void { ecouteurs.add(f); return () => { ecouteurs.delete(f); }; }
