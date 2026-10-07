// Couleurs des vues de graphes : dégradé de centralité (bleu nuit → jaune pâle) et palette de communautés.
const DEGRADE = ['#0c1d5c', '#2c3d97', '#1f7fb4', '#41b6c4', '#a1dab4', '#ffffcc'];

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** t ∈ [0, 1] → couleur du dégradé. */
export function couleurCentralite(t: number): string {
  const x = Math.max(0, Math.min(1, t)) * (DEGRADE.length - 1), i = Math.min(DEGRADE.length - 2, Math.floor(x)), f = x - i;
  const a = hex(DEGRADE[i]), b = hex(DEGRADE[i + 1]);
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`;
}

export const PALETTE_COMMUNAUTES = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990',
  '#dcbeff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9', '#ff6f91',
];
