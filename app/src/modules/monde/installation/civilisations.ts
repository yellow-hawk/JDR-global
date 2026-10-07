// Civilisations de l'Atlas → univers de la campagne (format Civilisation du contrat). Pur, testé.
import type { Calendrier, Campagne, Civilisation, Civilisations } from '../../../noyau/contrat';

export interface CalendrierAtlas { jours: number; mois: { nom: string; jours: number }[]; fetes: { nom: string; texte: string; jour: number }[] }
export type PeupleAtlas = Omit<Civilisation, 'calendrier'> & { calendrier: CalendrierAtlas | null };
export interface CivilisationsAtlas { peuples: PeupleAtlas[]; monde: Civilisations['monde'] }

/** Jour de l'année (0..n−1) → mois et jour du mois. */
export function calendrierDepuisAtlas(c: CalendrierAtlas): Calendrier {
  const debuts: number[] = [];
  c.mois.reduce((acc, m) => { debuts.push(acc); return acc + m.jours; }, 0);
  const fetes = c.fetes.map((f) => {
    let mi = 0;
    for (let i = 0; i < debuts.length; i++) if (f.jour >= debuts[i]) mi = i;
    return { nom: f.nom, texte: f.texte, mois: mi, jour: f.jour - debuts[mi] + 1 };
  });
  return { joursParAn: c.jours, mois: c.mois, fetes };
}

export function civilisationsDepuisAtlas(a: CivilisationsAtlas): Civilisations {
  return {
    monde: a.monde,
    peuples: a.peuples.map((p) => ({ ...p, calendrier: p.calendrier ? calendrierDepuisAtlas(p.calendrier) : null })),
  };
}

/** Range les civilisations dans l'univers. Les notes MJ ajoutées à la main sur un peuple sont gardées. */
export function integrerCivilisations(c: Campagne, univ: string, a: CivilisationsAtlas): Campagne {
  const neuves = civilisationsDepuisAtlas(a);
  return {
    ...c,
    univers: c.univers.map((u) => {
      if (u.id !== univ) return u;
      const anciennes = u.civilisations?.peuples ?? [];
      return { ...u, civilisations: { ...neuves, peuples: neuves.peuples.map((p) => ({ ...p, mj: anciennes.find((x) => x.cle === p.cle)?.mj ?? p.mj })) } };
    }),
  };
}
