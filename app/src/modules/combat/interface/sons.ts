// Petits sons optionnels (Web Audio, sans fichier) : dés, coup, sort.
let audio: AudioContext | null = null;

function bip(frequences: number[], duree = 0.08, type: OscillatorType = 'triangle', volume = 0.06): void {
  try {
    audio ??= new AudioContext();
    const t0 = audio.currentTime;
    frequences.forEach((f, i) => {
      const o = audio!.createOscillator(), g = audio!.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(volume, t0 + i * duree);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + (i + 1) * duree);
      o.connect(g).connect(audio!.destination);
      o.start(t0 + i * duree); o.stop(t0 + (i + 1) * duree);
    });
  } catch { /* son indisponible */ }
}

export const SONS = {
  des: () => bip([520, 660, 440], 0.05, 'square', 0.03),
  coup: () => bip([180, 120], 0.07, 'sawtooth', 0.05),
  rate: () => bip([300, 240], 0.06, 'sine', 0.04),
  sort: () => bip([440, 660, 880, 1100], 0.06, 'sine', 0.05),
};
