// Fiche D&D 5e calculée (pur) : modificateurs, maîtrise, sauvegardes, compétences, CA selon l'armure portée,
// attaques des armes équipées, encombrement, et effets des objets équipés et des aptitudes.
import type { Effet, Personnage } from '../../contrat';
import type { AttaqueCalculee, CatalogueRegles, EntreeCatalogue, FicheCalculee, ValeurCalculee } from '../types';
import CATALOGUE_JSON from './catalogue.json';

export const CATALOGUE = CATALOGUE_JSON as unknown as CatalogueRegles;
const PAR_ID = new Map<string, EntreeCatalogue>(CATALOGUE.objets.map((o) => [o.id, o]));
export const entreeCatalogue = (ref: string | null | undefined): EntreeCatalogue | undefined => (ref ? PAR_ID.get(ref) : undefined);

const mod = (v: number): number => Math.floor((v - 10) / 2);
const signe = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);
const num = (v: unknown, d: number): number => (typeof v === 'number' && isFinite(v) ? v : d);

/** Bonus de maîtrise du niveau (1 à 20) : +2 au niveau 1, +1 tous les 4 niveaux. */
export const bonusMaitrise = (niveau: number): number => 2 + Math.floor((Math.max(1, Math.min(20, niveau)) - 1) / 4);

/** Niveau total : somme des classes, sinon stats.niveau, sinon 1. */
export function niveauDe(p: Personnage): number {
  const classes = p.fiche?.progression?.classes ?? [];
  const total = classes.reduce((s, c) => s + (c.niveau || 0), 0);
  return total > 0 ? total : Math.max(1, num(p.combat.stats.niveau, 1));
}

/** Effets actifs : objets équipés (et harmonisés si besoin) + aptitudes. */
export function effetsActifs(p: Personnage): Effet[] {
  const objets = (p.fiche?.inventaire?.objets ?? []).filter((o) => o.equipe);
  const aptitudes = p.fiche?.progression?.aptitudes ?? [];
  return [...objets.flatMap((o) => o.effets ?? []), ...aptitudes.flatMap((a) => a.effets ?? [])];
}

const somme = (effets: Effet[], cible: string): number => effets.filter((e) => e.cible === cible).reduce((s, e) => s + e.valeur, 0);

export function calculer(p: Personnage): FicheCalculee {
  const stats = p.combat.stats;
  const carac = (stats.carac ?? {}) as Record<string, unknown>;
  const effets = effetsActifs(p);
  const niveau = niveauDe(p);
  const pb = bonusMaitrise(niveau);
  const m = p.fiche?.maitrises ?? {};

  const caracs: ValeurCalculee[] = CATALOGUE.caracs.map((c) => {
    const v = num(carac[c.id], 10) + somme(effets, `carac.${c.id}`);
    return { cle: `carac.${c.id}`, libelle: c.libelle, valeur: v, texte: `${v} (${signe(mod(v))})`, carac: c.id };
  });
  const modDe = (id: string): number => mod(caracs.find((c) => c.carac === id)?.valeur ?? 10);

  const sauvegardes: ValeurCalculee[] = CATALOGUE.caracs.map((c) => {
    const maitrise = m.sauvegardes?.includes(c.id) ? 1 : 0;
    const v = modDe(c.id) + maitrise * pb + somme(effets, `sauvegarde.${c.id}`);
    return { cle: `sauvegarde.${c.id}`, libelle: c.libelle, valeur: v, texte: signe(v), maitrise, carac: c.id };
  });

  const competences: ValeurCalculee[] = CATALOGUE.competences.map((c) => {
    const maitrise = Math.max(0, Math.min(2, num(m.competences?.[c.id], 0)));
    const v = modDe(c.carac) + maitrise * pb + somme(effets, `competence.${c.id}`);
    return { cle: `competence.${c.id}`, libelle: c.libelle, valeur: v, texte: signe(v), maitrise, carac: c.carac };
  });

  // CA : armure équipée (base + DEX plafonnée) + bouclier ; sans armure ni bouclier, la valeur saisie.
  const equipes = (p.fiche?.inventaire?.objets ?? []).filter((o) => o.equipe);
  const armure = equipes.map((o) => entreeCatalogue(o.ref)).find((e) => e?.sorte === 'armure' && e.categorie !== 'bouclier');
  const bouclier = equipes.some((o) => entreeCatalogue(o.ref)?.categorie === 'bouclier');
  const dex = modDe('dex');
  let ca: number;
  let detailCa: string;
  if (armure || bouclier) {
    const dexMax = armure ? (armure.dexMax as number | null | undefined) : null;
    const dexUtile = dexMax === 0 ? 0 : dexMax == null ? dex : Math.min(dex, dexMax);
    ca = (armure ? (armure.ca as number) : 10) + dexUtile + (bouclier ? 2 : 0);
    detailCa = `${armure ? `${armure.ca} ${armure.nom.toLowerCase()}` : '10'}${dexUtile ? ` ${signe(dexUtile)} DEX` : ''}${bouclier ? ' +2 bouclier' : ''}`;
  } else {
    ca = num(stats.ca, 10 + dex);
    detailCa = 'saisie sur la fiche';
  }
  const bonusCa = somme(effets, 'ca');
  if (bonusCa) { ca += bonusCa; detailCa += ` ${signe(bonusCa)} effets`; }

  // Attaques : armes équipées (FOR, ou la meilleure de FOR/DEX en finesse, DEX à distance)
  const attaques: AttaqueCalculee[] = [];
  const bonusAtt = somme(effets, 'attaque');
  const bonusDeg = somme(effets, 'degats');
  for (const o of equipes) {
    const a = entreeCatalogue(o.ref);
    if (a?.sorte !== 'arme') continue;
    const props = (a.proprietes as string[] | undefined) ?? [];
    const distance = a.type === 'distance';
    const c = distance ? modDe('dex') : props.includes('finesse') ? Math.max(modDe('for'), modDe('dex')) : modDe('for');
    const maitrise = !m.armes || m.armes.length === 0 || m.armes.includes(a.categorie as string) || m.armes.includes(a.id);
    const deg = c + bonusDeg;
    attaques.push({
      nom: o.nom || a.nom, bonus: c + (maitrise ? pb : 0) + bonusAtt,
      degats: `${a.degats}${deg ? signe(deg) : ''} ${a.typeDegats as string}`,
      portee: a.portee as string | undefined, proprietes: props,
    });
  }

  const perception = competences.find((c) => c.cle === 'competence.perception')?.valeur ?? modDe('sag');
  const poids = (p.fiche?.inventaire?.objets ?? []).reduce((s, o) => s + (o.poids ?? entreeCatalogue(o.ref)?.poids ?? 0) * (o.quantite || 0), 0);
  const capacite = (caracs.find((c) => c.carac === 'for')?.valeur ?? 10) * 7.5;
  const vitesse = num(stats.vitesse, 6) + somme(effets, 'vitesse');
  const initiative = dex + somme(effets, 'initiative');
  const derives: ValeurCalculee[] = [
    { cle: 'ca', libelle: 'Classe d’armure', valeur: ca, texte: String(ca), detail: detailCa },
    { cle: 'initiative', libelle: 'Initiative', valeur: initiative, texte: signe(initiative), carac: 'dex' },
    { cle: 'perceptionPassive', libelle: 'Perception passive', valeur: 10 + perception, texte: String(10 + perception) },
    { cle: 'vitesse', libelle: 'Vitesse (cases)', valeur: vitesse, texte: `${vitesse} (${vitesse * 1.5} m)` },
    { cle: 'maitrise', libelle: 'Bonus de maîtrise', valeur: pb, texte: signe(pb), detail: `niveau ${niveau}` },
    { cle: 'encombrement', libelle: 'Charge (kg)', valeur: Math.round(poids * 10) / 10, texte: `${Math.round(poids * 10) / 10} / ${capacite}`, detail: poids > capacite ? 'surchargé' : undefined },
  ];

  const synchro: Record<string, unknown> = { niveau };
  if (armure || bouclier || bonusCa) synchro.ca = ca;
  if (attaques.length) {
    synchro.bonusAttaque = attaques[0].bonus;
    synchro.degats = attaques[0].degats.split(' ')[0];
  }
  return { niveau, bonusMaitrise: pb, caracs, sauvegardes, competences, derives, attaques, stats: synchro };
}
