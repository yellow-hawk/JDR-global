// Lecture des sorts de la campagne avec le moteur de l'Atelier (module Magie) → SortAnalyse.
import type { Campagne } from '../../noyau/contrat';
import { analyser, grimoireMjComplet, valeurs, type Sceau } from '../magie';
import type { SortAnalyse } from './logique';
import type { Gabarit } from './moteur';

export interface SortListe { id: string; nom: string; proprietaire: string; persoId: string | null; analyse: SortAnalyse }

function lire(nom: string, sceauBrut: unknown): SortAnalyse | null {
  const s = sceauBrut as Sceau;
  if (!s || !s.coeur) return null;
  const a = analyser(s);
  const v = valeurs(s, a);
  const f = a.formes[0];
  return {
    nom, coeur: s.coeur.id, coeurInverse: s.coeur.inv, forme: f?.id ?? null, formeInverse: f?.inv ?? false,
    directionCote: a.direction.type === 'cote', puissance: a.puissance, porteeM: v.portee, zoneM: v.zone,
    dureeLongue: a.dureeSecondes > 6, resume: a.resume,
  };
}

/** Tous les sorts utilisables en combat : grimoire du MJ + grimoires des personnages. */
export function sortsDeLaCampagne(c: Campagne): SortListe[] {
  const res: SortListe[] = [];
  for (const s of grimoireMjComplet(c)) {
    const a = lire(s.nom, s.sceau);
    if (a) res.push({ id: s.id, nom: s.nom, proprietaire: 'Grimoire du MJ', persoId: null, analyse: a });
  }
  for (const p of c.personnages) {
    const g = ((p.magie as { grimoire?: { id: string; nom: string; sceau: unknown }[] } | null)?.grimoire) ?? [];
    for (const s of g) {
      const a = lire(s.nom, s.sceau);
      if (a) res.push({ id: `${p.id}/${s.id}`, nom: s.nom, proprietaire: p.nom, persoId: p.id, analyse: a });
    }
  }
  return res;
}

/** Grimoire automatique de la table : tous les sorts de la campagne, fusionnés par nom, avec leurs lanceurs. */
export function gabaritsDeLaCampagne(c: Campagne, versGabarit: (a: SortAnalyse) => Omit<Gabarit, 'id'>): Omit<Gabarit, 'id'>[] {
  const parNom = new Map<string, Omit<Gabarit, 'id'>>();
  for (const s of sortsDeLaCampagne(c)) {
    const g = parNom.get(s.nom) ?? versGabarit(s.analyse);
    if (s.persoId) g.lanceurs = [...new Set([...(g.lanceurs ?? []), s.persoId])];
    parNom.set(s.nom, g);
  }
  return [...parNom.values()];
}
