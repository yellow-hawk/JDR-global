// Packs d'univers (créatures, sorts, états) : un fichier JSON importé dans une campagne, appliqué aux tables.
// Rien d'un univers particulier n'est écrit dans le code : tout passe par des packs (ex. public/packs/).
import type { EtatTable, Gabarit, Modele } from './types';

export interface Pack {
  format: 'jdr-global-pack';
  version: number;
  id: string;
  nom: string;
  desc?: string;
  bibliotheque?: Modele[];
  sorts?: Omit<Gabarit, 'id'>[];
  conditions?: string[];
}

export function estPack(v: unknown): v is Pack {
  const p = v as Pack;
  return !!p && typeof p === 'object' && p.format === 'jdr-global-pack' && typeof p.id === 'string' && typeof p.nom === 'string';
}

/** Ajoute le contenu d'un pack à une table (sans doublon de nom). */
export function appliquerPack(e: EtatTable, p: Pack): EtatTable {
  const noms = new Set(e.bibliotheque.map((m) => m.nom));
  const bibliotheque = [...e.bibliotheque, ...(p.bibliotheque ?? []).filter((m) => !noms.has(m.nom)).map((m) => ({ ...m, carac: { ...m.carac }, auras: m.auras ?? [] }))];
  const nomsSorts = new Set(e.sorts.map((s) => s.nom));
  let id = Math.max(0, ...e.sorts.map((s) => s.id));
  const sorts = [...e.sorts, ...(p.sorts ?? []).filter((s) => !nomsSorts.has(s.nom)).map((s) => ({ ...s, effets: [...s.effets], id: ++id }))];
  const etatsSup = [...new Set([...(e.etatsSup ?? []), ...(p.conditions ?? [])])];
  return { ...e, bibliotheque, sorts, etatsSup };
}

export const appliquerPacks = (e: EtatTable, packs: Pack[]): EtatTable => packs.reduce(appliquerPack, e);
