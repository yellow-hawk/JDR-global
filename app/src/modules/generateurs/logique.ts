// Générateurs rapides pour improviser en séance : PNJ, taverne, boutique, butin. Pur, testé.
// Déterministe : même graine = même résultat (règle du projet) ; la page tire une nouvelle graine à chaque « Relancer ».
import type { Campagne, Personnage } from '../../noyau/contrat';
import { nouveauPersonnage } from '../../noyau/contrat';
import { pick, rngFor, shuffle, type Rng } from '../../noyau/hasard';
import { lancer, type SystemeRegles } from '../../noyau/regles';
import { peuplesDeCampagne } from '../pays';
import TAVERNE from './donnees/taverne.json';
import BOUTIQUES from './donnees/boutiques.json';
import BUTIN from './donnees/butin.json';
import PNJ from './donnees/pnj.json';

export const SORTES_BOUTIQUE = BOUTIQUES.sortes.map((s) => ({ id: s.id, libelle: s.libelle }));
export const TRANCHES = BUTIN.tranches.map((t) => ({ id: t.id, libelle: t.libelle }));

export interface Contexte { pnj: string[]; lieux: string[]; peuples: string[]; quetes: string[]; noms: string[]; peuple?: { univers: string; cle: number | string; nom: string } }

/** Éléments de la campagne qui nourrissent noms et rumeurs. `peuple` : clé « univers:cle » dont on prend les noms. */
export function contexteDe(c: Campagne, peuple?: string): Contexte {
  const peuples = peuplesDeCampagne(c);
  const choisi = peuples.find((p) => `${p.univers.id}:${String(p.civ.cle)}` === peuple) ?? peuples[0];
  return {
    pnj: c.personnages.filter((p) => p.sorte !== 'pj').map((p) => p.nom),
    lieux: [...new Set([...peuples.flatMap((p) => p.civ.villes.map((v) => v.nom)), ...c.quetes.flatMap((q) => q.lieuxTexte ?? []).map((l) => l.replace(/\s*\(.*\)$/, ''))])],
    peuples: peuples.map((p) => p.civ.nom),
    quetes: c.quetes.filter((q) => q.statut !== 'terminee' && q.statut !== 'abandonnee').map((q) => q.titre),
    noms: choisi?.civ.noms ?? [],
    peuple: choisi ? { univers: choisi.univers.id, cle: choisi.civ.cle, nom: choisi.civ.nom } : undefined,
  };
}

const SECOURS: Record<string, string> = { pnj: 'le vieux meunier', lieu: 'la vieille tour', peuple: 'les gens du nord', quete: 'une affaire louche' };
function remplir(rng: Rng, modele: string, ctx: Contexte): string {
  const listes: Record<string, string[]> = { pnj: ctx.pnj, lieu: ctx.lieux, peuple: ctx.peuples, quete: ctx.quetes };
  return modele.replace(/\{(pnj|lieu|peuple|quete)\}/g, (_, k: string) => (listes[k].length ? pick(rng, listes[k]) : SECOURS[k]));
}

/* ---------- PNJ ---------- */

export interface PnjGenere { nom: string; sexe: 'f' | 'm'; role: string; apparence: string; maniere: string; motivation: string; secret: string; accroche: string }

export function genererPnj(graine: string, ctx: Contexte, role?: string): PnjGenere {
  const rng = rngFor(graine, 'pnj');
  const sexe: 'f' | 'm' = rng() < 0.5 ? 'f' : 'm';
  const nom = ctx.noms.length ? pick(rng, ctx.noms) : pick(rng, PNJ.prenoms[sexe]);
  return {
    nom, sexe, role: role || pick(rng, PNJ.roles),
    apparence: pick(rng, PNJ.apparences), maniere: pick(rng, PNJ.manieres),
    motivation: pick(rng, PNJ.motivations), secret: pick(rng, PNJ.secrets), accroche: pick(rng, PNJ.accroches),
  };
}

/** Fiche de personnage complète : stats selon le rôle, notes visibles (apparence) et secrètes (motivation, secret, accroche). */
export function pnjVersPersonnage(g: PnjGenere, R: SystemeRegles, regles: string, ctx: Contexte, graine: string): Personnage {
  const p = nouveauPersonnage(g.nom, 'pnj', regles, R.statsPourProfil({ role: g.role, sorte: 'pnj', graine }));
  return {
    ...p, role: g.role,
    peuple: ctx.peuple ? { atlas: String(ctx.peuple.cle) } : null,
    notes: `${g.role.charAt(0).toUpperCase() + g.role.slice(1)} : ${g.apparence} ; ${g.maniere}.`,
    mj: { notes: `Motivation : ${g.motivation}.\nSecret : ${g.secret}.\nAccroche : ${g.accroche}.`, improvise: true },
  };
}

/* ---------- taverne ---------- */

export interface Taverne {
  nom: string; sorte: string; ambiance: string; patron: PnjGenere; traitPatron: string;
  plats: { nom: string; prix: string }[]; boissons: { nom: string; prix: string }[]; chambres: { nom: string; prix: string }[];
  clients: string[]; evenement: string; rumeurs: string[];
}

export function genererTaverne(graine: string, ctx: Contexte): Taverne {
  const rng = rngFor(graine, 'taverne');
  const o = pick(rng, TAVERNE.objets);
  const a = pick(rng, TAVERNE.adjectifs);
  const nom = `${TAVERNE.articles[o.g as 'm' | 'f']} ${o.nom} ${a[o.g as 'm' | 'f']}`;
  return {
    nom, sorte: pick(rng, TAVERNE.sortes), ambiance: pick(rng, TAVERNE.ambiances),
    patron: genererPnj(`${graine}|patron`, ctx, pick(rng, TAVERNE.patrons)), traitPatron: pick(rng, TAVERNE.traitsPatron),
    plats: shuffle(rng, TAVERNE.plats).slice(0, 3), boissons: shuffle(rng, TAVERNE.boissons).slice(0, 4),
    chambres: TAVERNE.chambres.filter(() => rng() < 0.8),
    clients: shuffle(rng, TAVERNE.clients).slice(0, 3), evenement: pick(rng, TAVERNE.evenements),
    rumeurs: shuffle(rng, TAVERNE.rumeurs).slice(0, 3).map((r) => remplir(rng, r, ctx)),
  };
}

export const menuTaverne = (t: Taverne): string => [
  'À manger', ...t.plats.map((x) => `  ${x.nom} … ${x.prix}`), '', 'À boire', ...t.boissons.map((x) => `  ${x.nom} … ${x.prix}`),
  ...(t.chambres.length ? ['', 'Pour dormir', ...t.chambres.map((x) => `  ${x.nom} … ${x.prix}`)] : []),
].join('\n');

export const texteTaverne = (t: Taverne): string =>
  `${t.nom} (${t.sorte}) : ${t.ambiance}.\nPatron : ${t.patron.nom}, ${t.patron.role}, ${t.traitPatron}.\n\n${menuTaverne(t)}\n\nClients : ${t.clients.join(' ; ')}.\nCe soir : ${t.evenement}.\nRumeurs :\n${t.rumeurs.map((r) => `- ${r}`).join('\n')}`;

/* ---------- boutique ---------- */

export interface Boutique { nom: string; sorte: string; proprietaire: PnjGenere; humeur: string; particularite: string; objets: { nom: string; prix: string; rare?: boolean }[] }

export function genererBoutique(graine: string, ctx: Contexte, sorte?: string): Boutique {
  const rng = rngFor(graine, 'boutique');
  const s = BOUTIQUES.sortes.find((x) => x.id === sorte) ?? pick(rng, BOUTIQUES.sortes);
  const communs = s.objets.filter((o) => !('rare' in o && o.rare));
  const rares = s.objets.filter((o) => 'rare' in o && o.rare).filter(() => rng() < 0.35);
  return {
    nom: pick(rng, s.noms), sorte: s.libelle, proprietaire: genererPnj(`${graine}|proprio`, ctx, s.role),
    humeur: pick(rng, BOUTIQUES.humeurs), particularite: pick(rng, BOUTIQUES.particularites),
    objets: [...shuffle(rng, communs).slice(0, Math.min(communs.length, 5 + Math.floor(rng() * 3))), ...rares],
  };
}

export const etalBoutique = (b: Boutique): string => b.objets.map((o) => `${o.nom} … ${o.prix}`).join('\n');
export const texteBoutique = (b: Boutique): string =>
  `${b.nom} (${b.sorte}). Tenue par ${b.proprietaire.nom}, ${b.humeur} ; ${b.particularite}.\n\n${etalBoutique(b)}`;

/* ---------- butin ---------- */

export interface Butin { contenant: string; pieces: string[]; gemmes: string[]; art: string[]; magiques: string[]; valeur: number }

const VALEUR_PIECE: Record<string, number> = { pc: 0.01, pa: 0.1, po: 1, pp: 10 };

export function genererButin(graine: string, tranche: string): Butin {
  const rng = rngFor(graine, 'butin');
  const t = BUTIN.tranches.find((x) => x.id === tranche) ?? BUTIN.tranches[0];
  let valeur = 0;
  const pieces = t.pieces.filter((_, i) => i === 0 || rng() < 0.6).map((p) => {
    const n = lancer(p.formule, rng).total * p.fois;
    valeur += n * (VALEUR_PIECE[p.unite] ?? 1);
    return `${n.toLocaleString('fr-FR')} ${p.unite}`;
  });
  const gemmes: string[] = [], art: string[] = [], magiques: string[] = [];
  if (rng() < 0.6) {
    const v = pick(rng, t.gemmes);
    const n = 1 + Math.floor(rng() * 4);
    gemmes.push(`${n} × ${pick(rng, (BUTIN.gemmes as Record<string, string[]>)[String(v)])} (${v} po pièce)`);
    valeur += n * v;
  }
  if (rng() < 0.45) {
    const v = pick(rng, t.art);
    art.push(`${pick(rng, (BUTIN.art as Record<string, string[]>)[String(v)])} (${v} po)`);
    valeur += v;
  }
  const nb = t.nbObjets[0] + Math.floor(rng() * (t.nbObjets[1] - t.nbObjets[0] + 1));
  for (let i = 0; i < nb; i++) {
    const r = pick(rng, t.magique);
    magiques.push(`${pick(rng, (BUTIN.magique as Record<string, string[]>)[r])} (${r})`);
  }
  return { contenant: pick(rng, BUTIN.contenants), pieces, gemmes, art, magiques, valeur: Math.round(valeur) };
}

export const texteButin = (b: Butin): string =>
  [`Dans ${b.contenant} :`, ...b.pieces, ...b.gemmes, ...b.art, ...b.magiques].join('\n');
