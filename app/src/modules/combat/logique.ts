// Logique pure du module Combat côté campagne : personnages → jetons, sorts de l'Atelier → gabarits, rencontres, retour aux fiches.
import type { Campagne, Personnage, Rencontre, SortePersonnage } from '../../noyau/contrat';
import { nouvelId } from '../../noyau/contrat';
import type { SystemeRegles } from '../../noyau/regles';
import { ajouterJeton, ajouterZone, appliquerPacks, caseLibre, estPack, jetonV7, lireEtat, nouvelEtat, TERRAINS, zoneDeTerrain } from './moteur';
import type { Camp, Cellule, EtatTable, Effet, Gabarit, Jeton, Modele, Pack } from './moteur';

/** Taille d'une case de combat en mètres. */
export const METRES_PAR_CASE = 1.5;

const CAMP: Record<SortePersonnage, Camp> = { pj: 'pj', allie: 'allie', ennemi: 'ennemi', pnj: 'neutre', neutre: 'neutre' };

/** Modèle de jeton tiré d'une fiche (stats converties par le système de règles). `portrait` = adresse data: ou null. */
export function jetonDepuisPersonnage(p: Personnage, R: SystemeRegles, portrait: string | null): Partial<Modele> & { pv: number } {
  const j = jetonV7({ ...R.versTable(p.combat.stats), name: p.nom });
  return {
    nom: p.nom, camp: CAMP[p.sorte] ?? 'neutre', pv: j.pv, pvMax: j.pvMax, ca: j.ca, vitesse: j.vitesse, carac: j.carac,
    vision: j.vision, degats: j.degats, bonusAttaque: j.bonusAttaque, notes: p.notes ?? '', persoId: p.id, portrait,
  };
}

/* ---------- sorts de l'Atelier → gabarits de la table ---------- */

/** Résumé d'une analyse de l'Atelier, suffisant pour fabriquer un gabarit (évite de dépendre de ses types). */
export interface SortAnalyse {
  nom: string;
  coeur: string | null;          // id du Cœur (braise, source…)
  coeurInverse: boolean;
  forme: string | null;          // id de la forme principale (jet, pluie…)
  formeInverse: boolean;
  directionCote: boolean;        // direction « côté » (vers un côté précis)
  puissance: number;
  porteeM: number;
  zoneM: number;
  dureeLongue: boolean;          // durée au-delà de l'instant → concentration
  resume: string;
}

const PARTICULE: Record<string, string> = { braise: 'feu', 'braise~': 'glace', lueur: 'sacre', 'lueur~': 'tenebres', souffle: 'foudre' };
const COULEUR: Record<string, string> = {
  braise: 'rgba(217,72,72,0.5)', 'braise~': 'rgba(0,188,212,0.5)', source: 'rgba(74,144,217,0.5)', socle: 'rgba(230,126,34,0.5)',
  souffle: 'rgba(201,168,76,0.5)', lueur: 'rgba(201,168,76,0.5)', 'lueur~': 'rgba(155,89,182,0.5)', seve: 'rgba(69,168,74,0.5)',
};
const CONDITION: Record<string, string> = {
  braise: 'En feu', 'braise~': 'Ralenti', 'lueur~': 'Aveuglé', 'mouvement~': 'Paralysé', 'chair~': 'Pétrifié',
  'plume~': 'Entravé', 'lien': 'Entravé', 'regard~': 'Invisible', 'seve~': 'Empoisonné',
};
const OFFENSIF = new Set(['jet', 'pluie', 'gerbe', 'dard', 'tourbillon', 'pluie~', 'appel~', 'figure']);
const ELEMENTS = new Set(['braise', 'source', 'socle', 'souffle', 'lueur']);
const cases = (m: number): number => Math.max(1, Math.round(m / METRES_PAR_CASE));

export function gabarit(s: SortAnalyse, R: SystemeRegles): Omit<Gabarit, 'id'> {
  const c = s.coeur ? s.coeur + (s.coeurInverse ? '~' : '') : '';
  const f = s.forme ? s.forme + (s.formeInverse ? '~' : '') : '';
  let forme: Gabarit['forme'] = 'cercle', rayon = cases(s.zoneM), origine: Gabarit['origine'] = 'point', portee = cases(Math.max(s.porteeM, METRES_PAR_CASE));
  if (f === 'jet') { forme = 'ligne'; rayon = cases(Math.max(s.porteeM, 3)); origine = 'soi'; portee = 0; }
  else if (f === 'gerbe' && s.directionCote) { forme = 'cone'; rayon = cases(Math.max(2, s.porteeM)); origine = 'soi'; portee = 0; }
  else if (f === 'gerbe') { rayon = cases(Math.max(2, s.porteeM)); origine = 'soi'; portee = 0; }
  else if (f === 'dard') { rayon = 1; portee = cases(Math.max(4, s.porteeM * 2)); }
  else if (f === 'rempart') { forme = 'rectangle'; rayon = cases(s.zoneM * 2); }
  const effets: Effet[] = [];
  const { moyenne } = R.degatsSort(s.puissance);
  if (s.coeur === 'seve' && !s.coeurInverse) effets.push({ type: 'soin', valeur: moyenne });
  else if (ELEMENTS.has(s.coeur ?? '') && OFFENSIF.has(f)) effets.push({ type: 'degats', valeur: moyenne, nature: s.coeur ?? '' });
  const etat = CONDITION[c] ?? CONDITION[f];
  if (etat) effets.push({ type: 'condition', valeur: etat });
  return {
    nom: s.nom, forme, rayon, largeur: 1, portee, origine, effets,
    couleur: COULEUR[c] ?? 'rgba(155,89,182,0.5)', particule: PARTICULE[c] ?? null,
    concentration: s.dureeLongue, desc: s.resume.slice(0, 80), atelier: true,
  };
}

/* ---------- rencontres ---------- */

/** Enregistre l'état de la table comme rencontre de la campagne (jetons liés aux fiches + état complet). */
export function enregistrerRencontre(c: Campagne, nom: string, etat: EtatTable, carte: string | null): { campagne: Campagne; id: string } {
  const r: Rencontre = {
    id: nouvelId('renc'), nom,
    carte: carte ? { type: 'carte', id: carte } : null,
    jetons: etat.jetons.filter((j) => j.persoId && c.personnages.some((p) => p.id === j.persoId))
      .map((j) => ({ perso: { type: 'personnage', id: j.persoId! }, x: j.x, y: j.y, visible: j.visible })),
    terrain: etat.zones.filter((z) => z.categorie === 'terrain') as unknown as Record<string, unknown>[],
    table: { ...etat, journal: [] } as unknown as Record<string, unknown>,
    mj: {},
  };
  return { campagne: { ...c, rencontres: [...c.rencontres, r] }, id: r.id };
}

/** État de table d'une rencontre (nouveau format ou ancienne table v7). */
export const etatDeRencontre = (r: Rencontre): EtatTable => (r.table && lireEtat(r.table)) || nouvelEtat();

/** Reporte PV et états des jetons liés dans les fiches. Renvoie aussi le nombre de fiches modifiées. */
export function reporterDansFiches(c: Campagne, jetons: Jeton[], R: SystemeRegles): { campagne: Campagne; modifies: number } {
  const parPerso = new Map(jetons.filter((j) => j.persoId).map((j) => [j.persoId!, j]));
  let modifies = 0;
  const personnages = c.personnages.map((p) => {
    const j = parPerso.get(p.id);
    if (!j) return p;
    const stats = R.depuisTable(p.combat.stats, { hp: j.pv });
    const conditions = [...j.conditions];
    if (JSON.stringify(stats) === JSON.stringify(p.combat.stats) && JSON.stringify(conditions) === JSON.stringify(p.combat.conditions ?? [])) return p;
    modifies++;
    return { ...p, combat: { ...p.combat, stats, conditions } };
  });
  return { campagne: { ...c, personnages }, modifies };
}

/** Packs d'univers installés dans la campagne (`modules.combat.packs`). */
export const packsDeLaCampagne = (c: Campagne): Pack[] =>
  ((c.modules?.combat?.packs as unknown[] | undefined) ?? []).filter(estPack);

/** Nouvelle table de la campagne : bibliothèque et sorts de base + packs installés. */
export const nouvelleTable = (c: Campagne): EtatTable => appliquerPacks(nouvelEtat(), packsDeLaCampagne(c));

/** Table en cours de la campagne (sauvegarde automatique dans `modules.combat.table`). */
export const tableEnCours = (c: Campagne): EtatTable => lireEtat(c.modules?.combat?.table) ?? nouvelleTable(c);

/** Installe un pack dans la campagne (remplace une version précédente du même pack). */
export function installerPack(c: Campagne, p: Pack): Campagne {
  const packs = [...packsDeLaCampagne(c).filter((x) => x.id !== p.id), p];
  return { ...c, modules: { ...c.modules, combat: { ...c.modules?.combat, packs: packs as unknown as Record<string, unknown>[] } } };
}
export function retirerPack(c: Campagne, id: string): Campagne {
  const packs = packsDeLaCampagne(c).filter((x) => x.id !== id);
  return { ...c, modules: { ...c.modules, combat: { ...c.modules?.combat, packs: packs as unknown as Record<string, unknown>[] } } };
}

export const avecTableEnCours = (c: Campagne, e: EtatTable): Campagne =>
  ({ ...c, modules: { ...c.modules, combat: { ...c.modules?.combat, table: e as unknown as Record<string, unknown> } } });

/* ---------- table préparée depuis une carte de bataille générée ---------- */

export interface PreparationTable {
  carte: string;                 // id de la carte de fond
  pxCase: number;                // pixels d'image par case
  rects: { terrain: string; x0: number; y0: number; x1: number; y1: number }[];
  depart: [number, number][];
  ennemis: [number, number][];
  pj: Partial<Modele>[];
  adversaires: Partial<Modele>[];
  packs?: Pack[];
}

/** Table prête à jouer : carte en fond calée sur la grille, murs et obstacles en terrains, PJ et adversaires placés. */
export function tableDepuisPlan(p: PreparationTable): EtatTable {
  let e: EtatTable = { ...appliquerPacks(nouvelEtat(), p.packs ?? []), fond: { carte: p.carte, pxCase: p.pxCase }, opacites: { carte: 1, jetons: 0.95, sorts: 0.35, terrains: 0.12 } };
  for (const r of p.rects) {
    const t = TERRAINS.find((x) => x.id === r.terrain);
    if (!t) continue;
    const pts: Cellule[] = [[r.x0 - 0.5, r.y0 - 0.5], [r.x1 + 0.5, r.y0 - 0.5], [r.x1 + 0.5, r.y1 + 0.5], [r.x0 - 0.5, r.y1 + 0.5]];
    e = ajouterZone(e, { ...zoneDeTerrain(t, 'carre', r.x0, r.y0, 0), forme: 'polygone', points: pts, nom: '' }).etat;
  }
  const poser = (liste: Partial<Modele>[], cases: [number, number][]) => liste.forEach((m, i) => {
    const [x, y] = cases[i] ?? caseLibre(e, cases[cases.length - 1] ?? [1, 1]);
    e = ajouterJeton(e, m, x, y).etat;
  });
  poser(p.pj, p.depart);
  poser(p.adversaires, p.ennemis);
  return e;
}
