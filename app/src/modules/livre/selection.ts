// Ce que peut contenir le livre de campagne (pur, testé) : sections, éléments de chaque section, choix du MJ.
import type { Campagne } from '../../noyau/contrat';
import { vueJoueurs } from '../../noyau/contrat';
import { tousLesArbres } from '../../noyau/talents';

export type SectionId =
  | 'couverture' | 'peuples' | 'dynasties' | 'villes' | 'calendrier' | 'chronologie' | 'cartes' | 'quetes' | 'seances'
  | 'personnages' | 'familles' | 'talents' | 'documents' | 'rencontres' | 'sorts';

export const SECTIONS: { id: SectionId; nom: string; aide: string; mjSeulement?: boolean }[] = [
  { id: 'couverture', nom: 'Couverture et sommaire', aide: 'Titre, monde, date du monde ; sommaire cliquable (parties et éléments).' },
  { id: 'peuples', nom: 'Peuples et pays', aide: 'Deux feuilles par pays : carte et fiche ; lieux du pays par catégorie, histoire et calendrier.' },
  { id: 'dynasties', nom: 'Dynasties et institutions', aide: 'Pour chaque pays du livre : sa dynastie (générée avant si elle manque) et l’organigramme de ses institutions.' },
  { id: 'villes', nom: 'Feuilles de ville', aide: 'Une feuille par ville : plan et lieux notables par catégorie.' },
  { id: 'calendrier', nom: 'Calendrier de la campagne', aide: 'L’année en cours, mois en grilles de semaines, fêtes et événements.' },
  { id: 'chronologie', nom: 'Chronologie', aide: 'Événements et séances, dans l’ordre du temps du monde.' },
  { id: 'cartes', nom: 'Autres cartes', aide: 'Monde, villages, batailles, cartes importées : une par feuille (paysage si large), avec leur légende.' },
  { id: 'quetes', nom: 'Quêtes', aide: 'Résumé, étapes, lieux, personnages, récompenses.' },
  { id: 'seances', nom: 'Journal des séances', aide: 'Résumés des séances jouées.' },
  { id: 'personnages', nom: 'Personnages', aide: 'PJ : une feuille chacun ; PNJ, alliés et ennemis : quatre par feuille.' },
  { id: 'familles', nom: 'Arbres généalogiques', aide: 'Les familles, une par feuille (les dynasties sont avec leur pays).' },
  { id: 'talents', nom: 'Arbres de talents', aide: 'Chaque arbre dessiné, puis la description de ses talents.' },
  { id: 'documents', nom: 'Documents', aide: 'Lettres, affiches et images montrées aux joueurs.' },
  { id: 'rencontres', nom: 'Rencontres', aide: 'Adversaires, carte, notes du MJ.', mjSeulement: true },
  { id: 'sorts', nom: 'Grimoire', aide: 'Sorts de la campagne (Atelier de tracé).' },
];

export interface ChoixLivre {
  /** mj : tout, secrets compris ; joueurs : ce que les joueurs peuvent voir (secrets et éléments cachés retirés). */
  version: 'mj' | 'joueurs';
  sections: Record<SectionId, boolean>;
  /** Éléments décochés (ids). */
  exclus: string[];
  /** Cartes : version MJ (annotée) quand elle existe. */
  cartesMj: boolean;
}

export const choixParDefaut = (): ChoixLivre => ({
  version: 'mj', cartesMj: true, exclus: [],
  sections: Object.fromEntries(SECTIONS.map((s) => [s.id, s.id !== 'sorts'])) as Record<SectionId, boolean>,
});

export interface Element { id: string; libelle: string; groupe?: string }

const SORTES: Record<string, string> = { pj: 'Personnages joueurs', allie: 'Alliés', pnj: 'PNJ', neutre: 'Neutres', ennemi: 'Ennemis' };
const cleAtlas = (k: { source: { sorte: string; cle?: string } }) => (k.source.sorte === 'atlas' ? k.source.cle ?? '' : '');

/** Campagne telle qu'elle ira dans le livre (vue joueurs : secrets et éléments cachés retirés). */
export const campagneDuLivre = (c: Campagne, choix: ChoixLivre): Campagne => (choix.version === 'joueurs' ? vueJoueurs(c) : c);

/** Éléments qu'on peut cocher ou décocher dans chaque section. */
export function elementsDe(c: Campagne, s: SectionId): Element[] {
  const peuples = c.univers.flatMap((u) => (u.civilisations?.peuples ?? []).map((p) => ({ u, p, id: `peuple:${u.id}:${String(p.cle)}` })));
  switch (s) {
    case 'peuples': return peuples.map(({ u, p, id }) => ({ id, libelle: p.nom.replace(/^les /, ''), groupe: c.univers.length > 1 ? u.nom : undefined }));
    case 'villes': return peuples.flatMap(({ u, p }) => c.cartes.filter((k) => k.univers?.id === u.id && cleAtlas(k).startsWith(`ville|${String(p.cle)}|`))
      .map((k) => ({ id: k.id, libelle: k.nom, groupe: p.nom.replace(/^les /, '') })));
    case 'cartes': return c.cartes.filter((k) => !/^(pays|ville)\|/.test(cleAtlas(k))).map((k) => ({ id: k.id, libelle: k.nom, groupe: k.type }));
    case 'quetes': return c.quetes.map((q) => ({ id: q.id, libelle: q.titre, groupe: q.statut ?? 'à venir' }));
    case 'seances': return c.seances.map((x) => ({ id: x.id, libelle: `Séance ${x.numero}` }));
    case 'personnages': return [...c.personnages].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).map((p) => ({ id: p.id, libelle: p.nom, groupe: SORTES[p.sorte] ?? p.sorte }));
    case 'familles': return (c.familles ?? []).filter((f) => f.sorte === 'famille').map((f) => ({ id: f.id, libelle: f.nom }));
    case 'talents': return tousLesArbres().map((a) => ({ id: `arbre:${a.id}`, libelle: a.nom }));
    case 'documents': return (c.documents ?? []).map((d) => ({ id: d.id, libelle: d.titre }));
    case 'rencontres': return c.rencontres.map((r) => ({ id: r.id, libelle: r.nom }));
    case 'sorts': return c.sorts.map((x) => ({ id: x.id, libelle: x.nom }));
    default: return [];
  }
}

/** Éléments retenus d'une section (section cochée, élément non décoché). */
export const retenus = (c: Campagne, choix: ChoixLivre, s: SectionId): Element[] =>
  choix.sections[s] && !(choix.version === 'joueurs' && SECTIONS.find((x) => x.id === s)?.mjSeulement) ? elementsDe(c, s).filter((x) => !choix.exclus.includes(x.id)) : [];
