// Programme de la séance (pur, testé) : ce que le MJ prévoit de montrer ce soir, dans l'ordre (cartes, personnages,
// documents, quêtes, peuples…). Chaque module déclare ce qu'il sait montrer (`DefinitionModule.montrables`).
// Rangé dans `modules.programme` : { liste, position } (position = prochain élément à montrer).
import type { Campagne } from '../noyau/contrat';

export interface ElementProgramme { module: string; id: string; nom: string }
export interface Programme { liste: ElementProgramme[]; position: number }

export const programmeDe = (c: Campagne): Programme => {
  const p = c.modules?.programme as Partial<Programme> | undefined;
  const liste = Array.isArray(p?.liste) ? p!.liste : [];
  return { liste, position: Math.min(Math.max(0, p?.position ?? 0), liste.length) };
};
const avec = (c: Campagne, p: Programme): Campagne => ({ ...c, modules: { ...c.modules, programme: { ...p } } });

export function ajouterAuProgramme(c: Campagne, e: ElementProgramme): Campagne {
  const p = programmeDe(c);
  return avec(c, { ...p, liste: [...p.liste, e] });
}
export function retirerDuProgramme(c: Campagne, i: number): Campagne {
  const p = programmeDe(c);
  if (i < 0 || i >= p.liste.length) return c;
  return avec(c, { liste: p.liste.filter((_, k) => k !== i), position: p.position > i ? p.position - 1 : p.position });
}
/** Déplace l'élément `i` d'un cran (`sens` -1 : plus tôt, +1 : plus tard). */
export function deplacerDansProgramme(c: Campagne, i: number, sens: -1 | 1): Campagne {
  const p = programmeDe(c), j = i + sens;
  if (i < 0 || j < 0 || i >= p.liste.length || j >= p.liste.length) return c;
  const liste = [...p.liste];
  [liste[i], liste[j]] = [liste[j], liste[i]];
  return avec(c, { ...p, liste });
}
/** L'élément `i` vient d'être montré : le suivant devient le prochain. */
export const montreDansProgramme = (c: Campagne, i: number): Campagne => avec(c, { ...programmeDe(c), position: Math.min(i + 1, programmeDe(c).liste.length) });
export const recommencerProgramme = (c: Campagne): Campagne => avec(c, { ...programmeDe(c), position: 0 });
export const viderProgramme = (c: Campagne): Campagne => avec(c, { liste: [], position: 0 });
