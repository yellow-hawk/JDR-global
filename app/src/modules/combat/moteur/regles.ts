// Règles de la table (inspirées de D&D 5e, comme la v7) : initiative, tours, déplacement en combat,
// attaques, sorts, concentration. `rng` est injectable pour des tests reproductibles.
import { formuleValide, lancer } from '../../../noyau/regles';
import type { Rng } from '../../../noyau/hasard';
import { porteeDeplacement } from './deplacement';
import { jetonsDansZone, terrainsSur } from './formes';
import { distance } from './grille';
import { journaliser, modCarac, modifierJeton, signe, TERRAINS } from './etat';
import type { Cellule, EtatTable, Gabarit, Jeton, Zone } from './types';
import { cle } from './types';

const d20 = (rng: Rng): number => 1 + Math.floor(rng() * 20);
const drapeauxVides = { action: false, bonus: false, reaction: false, mouvement: false };

/* ---------- initiative et tours ---------- */

/** Démarre le combat. `manuelles` : initiatives saisies (id → valeur) ; sinon d20 + DEX pour chacun. */
export function debuterCombat(e: EtatTable, rng: Rng, manuelles?: Record<number, number>): EtatTable {
  const jetons = e.jetons.map((j) => ({
    ...j, initiative: manuelles?.[j.id] ?? d20(rng) + modCarac(j.carac.dex), drapeaux: { ...drapeauxVides }, mouvementUtilise: 0,
  }));
  const ordre = [...jetons].sort((a, b) => b.initiative - a.initiative || modCarac(b.carac.dex) - modCarac(a.carac.dex)).map((j) => j.id);
  const r = { ...e, jetons, combat: { actif: true, round: 1, tour: 0, ordre } };
  return journaliser(r, `⚔ Combat, round 1 : ${ordre.map((id) => jetons.find((j) => j.id === id)!.nom).join(', ')}`, 'init');
}

/** Tour suivant : saute les jetons à 0 PV, remet à zéro les actions du nouveau jeton. */
export function tourSuivant(e: EtatTable): EtatTable {
  if (!e.combat.actif || !e.combat.ordre.length) return e;
  let { tour, round } = e.combat;
  const n = e.combat.ordre.length;
  let res = e;
  for (let essais = 0; essais < n; essais++) {
    tour++;
    if (tour >= n) { tour = 0; round++; res = journaliser(res, `— Round ${round} —`, 'init'); }
    const j = e.jetons.find((x) => x.id === e.combat.ordre[tour]);
    if (j && j.pv > 0) break;
  }
  const id = e.combat.ordre[tour];
  res = { ...res, combat: { ...res.combat, tour, round } };
  res = modifierJeton(res, id, (j) => ({ ...j, drapeaux: { ...drapeauxVides }, mouvementUtilise: 0 }));
  const j = res.jetons.find((x) => x.id === id);
  return j ? journaliser(res, `Tour de ${j.nom}`) : res;
}

export const finirCombat = (e: EtatTable): EtatTable =>
  journaliser({ ...e, combat: { actif: false, round: 0, tour: 0, ordre: [] } }, 'Fin du combat', 'init');

export const jetonActif = (e: EtatTable): Jeton | undefined =>
  e.combat.actif ? e.jetons.find((j) => j.id === e.combat.ordre[e.combat.tour]) : undefined;

/* ---------- déplacement ---------- */

/**
 * Valide un déplacement. En combat (avec portée activée) : la case doit être atteignable avec le mouvement restant.
 * Hors combat : seule une case bloquée est refusée. Les terrains traversés sont notés au journal.
 */
export function deplacer(e: EtatTable, id: number, depart: Cellule, arrivee: Cellule): { etat: EtatTable; ok: boolean; raison?: string } {
  const j = e.jetons.find((x) => x.id === id);
  if (!j) return { etat: e, ok: false };
  if (depart[0] === arrivee[0] && depart[1] === arrivee[1]) return { etat: e, ok: true };
  const autres = e.jetons.filter((x) => x.id !== id);
  let cout = 0;
  if (e.combat.actif && e.porteeDeplacement) {
    const p = porteeDeplacement(e.grille, e.zones, TERRAINS, autres, depart, Math.max(0, j.vitesse - j.mouvementUtilise));
    const c = p[cle(arrivee)];
    if (!c) return { etat: e, ok: false, raison: 'Déplacement impossible (trop loin ou bloqué)' };
    cout = c.cout;
  } else {
    const t = terrainsSur(e.grille, e.zones, TERRAINS, arrivee);
    if (t.some((x) => x.bloque) || autres.some((x) => x.pv > 0 && x.x === arrivee[0] && x.y === arrivee[1])) {
      return { etat: e, ok: false, raison: 'Case bloquée' };
    }
  }
  let r = modifierJeton(e, id, (x) => ({ ...x, x: arrivee[0], y: arrivee[1], mouvementUtilise: x.mouvementUtilise + cout }));
  if (cout > 0) r = journaliser(r, `${j.nom} se déplace (${j.mouvementUtilise + cout}/${j.vitesse})`);
  for (const t of terrainsSur(e.grille, e.zones, TERRAINS, arrivee)) r = journaliser(r, `${j.nom} entre dans : ${t.nom} (${t.desc})`, 'cond');
  return { etat: r, ok: true };
}

/* ---------- concentration ---------- */

function testConcentration(e: EtatTable, j: Jeton, degats: number, rng: Rng): EtatTable {
  if (!j.concentration || degats <= 0) return e;
  const dd = Math.max(10, Math.floor(degats / 2));
  const jet = d20(rng) + modCarac(j.carac.con);
  if (jet >= dd) return journaliser(e, `  ${j.nom} garde sa concentration (${jet} contre DD ${dd})`, 'cond');
  return journaliser(modifierJeton(e, j.id, (x) => ({ ...x, concentration: null })), `  ${j.nom} perd sa concentration sur ${j.concentration} (${jet} contre DD ${dd})`, 'cond');
}

/* ---------- attaques ---------- */

export const PORTEE_ATTAQUE = { melee: 2, distance: 8 } as const;

export interface ResultatAttaque { touche: boolean; critique: boolean; echec: boolean; jet: number; total: number; degats: number }

export function attaquer(e: EtatTable, idA: number, idC: number, sorte: 'melee' | 'distance', rng: Rng): { etat: EtatTable; resultat?: ResultatAttaque; erreur?: string } {
  const a = e.jetons.find((j) => j.id === idA), c = e.jetons.find((j) => j.id === idC);
  if (!a || !c) return { etat: e, erreur: 'Jeton introuvable' };
  if (a.id === c.id) return { etat: e, erreur: 'Un jeton ne peut pas s’attaquer lui-même' };
  const d = distance(e.grille, [a.x, a.y], [c.x, c.y]);
  if (d > PORTEE_ATTAQUE[sorte]) return { etat: e, erreur: `Hors de portée (${d} cases, max ${PORTEE_ATTAQUE[sorte]})` };
  const jet = d20(rng);
  const bonus = a.bonusAttaque ?? modCarac(sorte === 'distance' ? a.carac.dex : a.carac.for);
  const total = jet + bonus;
  const critique = jet === 20, echec = jet === 1;
  const touche = critique || (!echec && total >= c.ca);
  let r = journaliser(e, `⚔ ${a.nom} attaque ${c.nom} : d20 (${jet}) ${signe(bonus)} = ${total} contre CA ${c.ca}${echec ? ' : échec critique' : critique ? ' : coup critique !' : touche ? ' : touché' : ' : raté'}`, 'attaque');
  let degats = 0;
  if (touche) {
    const formule = formuleValide(a.degats) ? a.degats : '1d8';
    const lr = lancer(formule, rng, critique);
    const m = modCarac(sorte === 'distance' ? a.carac.dex : a.carac.for);
    degats = Math.max(1, lr.total + (/[+-]\d+$/.test(formule) ? 0 : m));
    const pv = Math.max(0, c.pv - degats);
    r = modifierJeton(r, c.id, (x) => ({ ...x, pv }));
    r = journaliser(r, `  ${c.nom} subit ${degats} dégâts (${formule}${critique ? ', dés doublés' : ''}) → ${pv} PV`, 'degats');
    r = testConcentration(r, { ...c, pv }, degats, rng);
  }
  if (r.combat.actif) r = modifierJeton(r, a.id, (x) => ({ ...x, drapeaux: { ...x.drapeaux, action: true } }));
  return { etat: r, resultat: { touche, critique, echec, jet, total, degats } };
}

/* ---------- sorts ---------- */

/** Zone d'aperçu d'un sort au moment de viser. */
export function zoneDeSort(s: Gabarit, lanceur: Jeton, vise: Cellule, angle: number): Omit<Zone, 'id'> {
  const point = s.origine === 'soi' ? [lanceur.x, lanceur.y] : vise;
  return { categorie: 'sort', forme: s.forme, x: point[0], y: point[1], rayon: s.rayon, largeur: s.largeur ?? 1, angle, couleur: s.couleur, nom: s.nom, sortId: s.id };
}

/** Applique les effets d'un sort aux jetons pris dans la zone. */
export function appliquerEffets(e: EtatTable, s: Gabarit, zone: Omit<Zone, 'id'>, rng: Rng): { etat: EtatTable; cibles: string[] } {
  const cibles = jetonsDansZone(e.grille, { ...zone, id: -1 }, e.jetons);
  let r = e;
  for (const c of cibles) {
    for (const f of s.effets) {
      const j = r.jetons.find((x) => x.id === c.id)!;
      if (f.type === 'degats') {
        const pv = Math.max(0, j.pv - f.valeur);
        r = journaliser(modifierJeton(r, j.id, (x) => ({ ...x, pv })), `  ${j.nom} : −${f.valeur} (${f.nature ?? ''}) → ${pv} PV`, 'degats');
        r = testConcentration(r, { ...j, pv }, f.valeur, rng);
      } else if (f.type === 'soin') {
        const pv = Math.min(j.pvMax, j.pv + f.valeur);
        r = journaliser(modifierJeton(r, j.id, (x) => ({ ...x, pv })), `  ${j.nom} : +${f.valeur} → ${pv} PV`, 'soin');
      } else if (!j.conditions.includes(f.valeur)) {
        r = journaliser(modifierJeton(r, j.id, (x) => ({ ...x, conditions: [...x.conditions, f.valeur] })), `  ${j.nom} : ${f.valeur}`, 'cond');
      }
    }
  }
  return { etat: r, cibles: cibles.map((c) => c.nom) };
}

/** Lance un sort : refus en zone antimagie, effets, concentration, zone posée sur la table. */
export function lancerSort(e: EtatTable, sortId: number, lanceurId: number, zone: Omit<Zone, 'id'>, rng: Rng): { etat: EtatTable; erreur?: string; cibles?: string[] } {
  const s = e.sorts.find((x) => x.id === sortId);
  const l = e.jetons.find((x) => x.id === lanceurId);
  if (!s || !l) return { etat: e, erreur: 'Sort ou lanceur introuvable' };
  if (terrainsSur(e.grille, e.zones, TERRAINS, [l.x, l.y]).some((t) => t.antimagie)) {
    return { etat: journaliser(e, `${s.nom} annulé : ${l.nom} est en zone antimagie`), erreur: 'Zone antimagie : sort annulé' };
  }
  if (s.portee > 0 && s.origine === 'point' && distance(e.grille, [l.x, l.y], [zone.x, zone.y]) > s.portee) {
    return { etat: e, erreur: `Hors de portée (${s.portee} cases)` };
  }
  let r = journaliser(e, `✦ ${l.nom} lance ${s.nom}`, 'init');
  const app = appliquerEffets(r, s, zone, rng);
  r = app.etat;
  if (!app.cibles.length) r = journaliser(r, '  Aucune cible');
  if (s.concentration) {
    const ancienne = r.jetons.find((x) => x.id === l.id)!.concentration;
    if (ancienne) r = journaliser(r, `  ${l.nom} abandonne ${ancienne}`, 'cond');
    r = modifierJeton(r, l.id, (x) => ({ ...x, concentration: s.nom }));
  }
  if (r.combat.actif) r = modifierJeton(r, l.id, (x) => ({ ...x, drapeaux: { ...x.drapeaux, action: true } }));
  const id = r.prochaineZone;
  r = { ...r, zones: [...r.zones, { ...zone, id }], prochaineZone: id + 1 };
  return { etat: r, cibles: app.cibles };
}
