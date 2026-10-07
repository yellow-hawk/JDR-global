// Annuler / rétablir : pile d'états (les états sont immuables, garder les références suffit).
export interface Historique<T> { passe: T[]; present: T; futur: T[] }

export const LIMITE_HISTORIQUE = 50;

export const historique = <T>(present: T): Historique<T> => ({ passe: [], present, futur: [] });

/** Nouvel état ; `fusionner` remplace le présent sans créer d'étape (déplacements en cours, réglages). */
export function pousser<T>(h: Historique<T>, etat: T, fusionner = false): Historique<T> {
  if (etat === h.present) return h;
  if (fusionner) return { ...h, present: etat };
  return { passe: [...h.passe, h.present].slice(-LIMITE_HISTORIQUE), present: etat, futur: [] };
}

export function annuler<T>(h: Historique<T>): Historique<T> {
  if (!h.passe.length) return h;
  return { passe: h.passe.slice(0, -1), present: h.passe[h.passe.length - 1], futur: [h.present, ...h.futur] };
}

export function retablir<T>(h: Historique<T>): Historique<T> {
  if (!h.futur.length) return h;
  return { passe: [...h.passe, h.present], present: h.futur[0], futur: h.futur.slice(1) };
}
