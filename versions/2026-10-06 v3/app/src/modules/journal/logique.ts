// Logique pure du module Journal : quêtes (de l'Atlas ou faites main) et séances.
import type { Campagne, DateMonde, Quete, Ref, Seance, StatutQuete } from '../../noyau/contrat';
import { nouvelId } from '../../noyau/contrat';
import type { Scene } from '../../noyau/bus';

export const STATUTS: { id: StatutQuete; libelle: string }[] = [
  { id: 'en-cours', libelle: 'En cours' },
  { id: 'a-venir', libelle: 'À venir' },
  { id: 'terminee', libelle: 'Terminée' },
  { id: 'abandonnee', libelle: 'Abandonnée' },
];
export const SORTES_QUETE = ['principale', 'secondaire', 'annexe', 'personnelle'];

/** Quête telle que fournie par le pont de l'Atlas (`atlas:quetes-donnees`). */
export interface QueteAtlas {
  cle: string; sorte: string; titre: string; resume: string;
  lieux: string[]; pnj: string[]; recompenses: string[];
  etapes: { titre: string; lieu?: string; joueurs: string; mj?: Record<string, unknown> }[];
  mj: Record<string, unknown>;
}

const refsPersonnages = (c: Campagne, noms: string[]): Ref[] => {
  const parNom = new Map(c.personnages.map((p) => [p.nom.toLowerCase(), p.id]));
  return noms.map((n) => parNom.get(n.toLowerCase())).filter((id): id is string => !!id)
    .filter((id, i, l) => l.indexOf(id) === i).map((id) => ({ type: 'personnage', id }));
};

/**
 * Importe les quêtes de l'Atlas. Une quête déjà importée (même univers + même clé) est mise à jour
 * sans toucher au statut ni aux notes MJ ajoutées. Les PNJ déjà présents dans la campagne sont liés par leur nom.
 */
export function importerQuetesAtlas(c: Campagne, liste: QueteAtlas[], univers: string | null): { campagne: Campagne; ajoutees: number; majs: number } {
  let ajoutees = 0, majs = 0;
  const quetes = [...c.quetes];
  for (const q of liste) {
    const i = quetes.findIndex((x) => x.source.sorte === 'atlas' && x.source.cle === q.cle && (x.univers?.id ?? null) === univers);
    const nouvelle: Quete = {
      id: i >= 0 ? quetes[i].id : nouvelId('quete'),
      titre: q.titre, source: { sorte: 'atlas', cle: q.cle }, sorte: q.sorte,
      statut: i >= 0 ? quetes[i].statut : q.sorte === 'principale' ? 'en-cours' : 'a-venir',
      univers: univers ? { type: 'univers', id: univers } : null,
      resume: q.resume, lieuxTexte: q.lieux, lieux: i >= 0 ? quetes[i].lieux : [],
      personnages: refsPersonnages(c, q.pnj), etapes: q.etapes, recompenses: q.recompenses,
      mj: { ...(i >= 0 ? quetes[i].mj ?? {} : {}), ...q.mj },
    };
    if (i >= 0) { quetes[i] = nouvelle; majs++; } else { quetes.push(nouvelle); ajoutees++; }
  }
  return { campagne: { ...c, quetes }, ajoutees, majs };
}

export function nouvelleQuete(c: Campagne, titre = 'Nouvelle quête'): { campagne: Campagne; id: string } {
  const q: Quete = { id: nouvelId('quete'), titre, source: { sorte: 'fait-main' }, sorte: 'secondaire', statut: 'a-venir', resume: '', lieux: [], personnages: [], etapes: [], mj: {} };
  return { campagne: { ...c, quetes: [...c.quetes, q] }, id: q.id };
}

export const modifierQuete = (c: Campagne, id: string, f: (q: Quete) => Quete): Campagne =>
  ({ ...c, quetes: c.quetes.map((q) => (q.id === id ? f(q) : q)) });

export function supprimerQuete(c: Campagne, id: string): Campagne {
  return {
    ...c,
    quetes: c.quetes.filter((q) => q.id !== id),
    seances: c.seances.map((s) => ({ ...s, liens: s.liens.filter((l) => !(l.type === 'quete' && l.id === id)) })),
  };
}

/** Quêtes triées : statut (en cours d'abord), puis principale → annexe, puis titre. */
export function trierQuetes(l: Quete[]): Quete[] {
  const rs = (q: Quete) => STATUTS.findIndex((s) => s.id === (q.statut ?? 'a-venir'));
  const rq = (q: Quete) => { const i = SORTES_QUETE.indexOf(q.sorte ?? ''); return i < 0 ? 9 : i; };
  return [...l].sort((a, b) => rs(a) - rs(b) || rq(a) - rq(b) || a.titre.localeCompare(b.titre, 'fr'));
}

/* ---------- séances ---------- */

export function nouvelleSeance(c: Campagne, aujourdhui: string): { campagne: Campagne; id: string } {
  const numero = c.seances.reduce((m, s) => Math.max(m, s.numero), 0) + 1;
  const precedente = [...c.seances].sort((a, b) => b.numero - a.numero)[0];
  const s: Seance = {
    id: nouvelId('seance'), numero, date: aujourdhui, dateMonde: precedente?.dateMonde ?? null,
    resume: '', liens: c.quetes.filter((q) => q.statut === 'en-cours').map((q) => ({ type: 'quete', id: q.id })), mj: {},
  };
  return { campagne: { ...c, seances: [...c.seances, s] }, id: s.id };
}

export const modifierSeance = (c: Campagne, id: string, f: (s: Seance) => Seance): Campagne =>
  ({ ...c, seances: c.seances.map((s) => (s.id === id ? f(s) : s)) });

export const supprimerSeance = (c: Campagne, id: string): Campagne => ({ ...c, seances: c.seances.filter((s) => s.id !== id) });

export const dateMondeLisible = (d?: DateMonde | null): string => (d ? `jour ${d.jour}, mois ${d.mois}, an ${d.an}` : '');

/* ---------- écran joueurs ---------- */

export function sceneQuete(q: Quete): Scene {
  const lieux = q.lieuxTexte?.length ? `\n\nLieux : ${q.lieuxTexte.join(' · ')}` : '';
  return { sorte: 'texte', titre: q.titre, texte: `${q.resume ?? ''}${lieux}` };
}

export function sceneSeance(s: Seance, quetes: Quete[]): Scene {
  const liees = s.liens.filter((l) => l.type === 'quete').map((l) => quetes.find((q) => q.id === l.id)?.titre).filter(Boolean);
  return {
    sorte: 'texte',
    titre: `Séance ${s.numero}${s.dateMonde ? ` · ${dateMondeLisible(s.dateMonde)}` : ''}`,
    texte: `${s.resume ?? ''}${liees.length ? `\n\nQuêtes : ${liees.join(' · ')}` : ''}`,
  };
}
