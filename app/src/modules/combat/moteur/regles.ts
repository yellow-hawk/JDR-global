// Règles de la table (inspirées de D&D 5e, comme la v7) : initiative, tours, déplacement en combat,
// attaques, sorts, concentration. Les états comptent (moteur/conditions) : avantage, désavantage, vitesse,
// sauvegardes ; la fiche du personnage aussi (jeton.profil). `rng` est injectable pour des tests reproductibles.
import { formuleValide, lancer } from '../../../noyau/regles';
import type { Rng } from '../../../noyau/hasard';
import { bonusSauvegarde, CONSOMME_ATTAQUE, d20Mode, ddSorts, EXPIRE_DEBUT_TOUR, modeAttaque, peutAgir, resteMouvement, sauvegarde } from './conditions';
import { porteeDeplacement } from './deplacement';
import { jetonsDansZone, terrainsSur } from './formes';
import { distance } from './grille';
import { journaliser, modCarac, modifierJeton, signe, TERRAINS } from './etat';
import type { Cellule, EtatTable, Gabarit, Jeton, Zone } from './types';
import { cle } from './types';

const d20 = (rng: Rng): number => 1 + Math.floor(rng() * 20);
const drapeauxVides = { action: false, bonus: false, reaction: false, mouvement: false };
const de = (n: number, faces: number, rng: Rng): number => { let t = 0; for (let i = 0; i < n; i++) t += 1 + Math.floor(rng() * faces); return t; };
const ennemis = (a: Jeton, b: Jeton): boolean => (a.camp === 'ennemi') !== (b.camp === 'ennemi');

/* ---------- initiative et tours ---------- */

/** Démarre le combat. `manuelles` : initiatives saisies (id → valeur) ; sinon d20 + DEX (+ bonus de la fiche). */
export function debuterCombat(e: EtatTable, rng: Rng, manuelles?: Record<number, number>): EtatTable {
  const jetons = e.jetons.map((j) => ({
    ...j, initiative: manuelles?.[j.id] ?? d20(rng) + modCarac(j.carac.dex) + (j.profil?.bonusInitiative ?? 0), drapeaux: { ...drapeauxVides }, mouvementUtilise: 0,
    usages: {}, attaquesFaites: 0, sournoiseFaite: false,
  }));
  const ordre = [...jetons].sort((a, b) => b.initiative - a.initiative || modCarac(b.carac.dex) - modCarac(a.carac.dex)).map((j) => j.id);
  const r = { ...e, jetons, combat: { actif: true, round: 1, tour: 0, ordre } };
  return journaliser(r, `⚔ Combat, round 1 : ${ordre.map((id) => jetons.find((j) => j.id === id)!.nom).join(', ')}`, 'init');
}

/** Tour suivant : saute les jetons à 0 PV, remet à zéro les actions du nouveau jeton et retire ses états d'un tour. */
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
  res = modifierJeton(res, id, (j) => ({
    ...j, drapeaux: { ...drapeauxVides }, mouvementUtilise: 0, attaquesFaites: 0, sournoiseFaite: false,
    conditions: j.conditions.filter((c) => !EXPIRE_DEBUT_TOUR.includes(c)),
  }));
  const j = res.jetons.find((x) => x.id === id);
  if (!j) return res;
  res = journaliser(res, `Tour de ${j.nom}`);
  return peutAgir(j) ? res : journaliser(res, `  ${j.nom} ne peut pas agir (${j.conditions.join(', ')})`, 'cond');
}

export const finirCombat = (e: EtatTable): EtatTable =>
  journaliser({ ...e, combat: { actif: false, round: 0, tour: 0, ordre: [] } }, 'Fin du combat', 'init');

export const jetonActif = (e: EtatTable): Jeton | undefined =>
  e.combat.actif ? e.jetons.find((j) => j.id === e.combat.ordre[e.combat.tour]) : undefined;

/* ---------- déplacement ---------- */

/**
 * Valide un déplacement. En combat (avec portée activée) : la case doit être atteignable avec le mouvement restant
 * (vitesse réelle : immobilisé, ralenti, hâté, en train de foncer). Hors combat : seule une case bloquée est refusée.
 */
export function deplacer(e: EtatTable, id: number, depart: Cellule, arrivee: Cellule): { etat: EtatTable; ok: boolean; raison?: string } {
  const j = e.jetons.find((x) => x.id === id);
  if (!j) return { etat: e, ok: false };
  if (depart[0] === arrivee[0] && depart[1] === arrivee[1]) return { etat: e, ok: true };
  const autres = e.jetons.filter((x) => x.id !== id);
  let cout = 0;
  if (e.combat.actif && e.porteeDeplacement) {
    if (resteMouvement(j) <= 0 && j.mouvementUtilise === 0) return { etat: e, ok: false, raison: `${j.nom} ne peut pas se déplacer (${j.conditions.join(', ') || 'immobile'})` };
    const p = porteeDeplacement(e.grille, e.zones, TERRAINS, autres, depart, resteMouvement(j));
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
  if (cout > 0) r = journaliser(r, `${j.nom} se déplace (${j.mouvementUtilise + cout}/${j.mouvementUtilise + resteMouvement(j)})`);
  for (const t of terrainsSur(e.grille, e.zones, TERRAINS, arrivee)) r = journaliser(r, `${j.nom} entre dans : ${t.nom} (${t.desc})`, 'cond');
  return { etat: r, ok: true };
}

/* ---------- concentration ---------- */

function testConcentration(e: EtatTable, j: Jeton, degats: number, rng: Rng): EtatTable {
  if (!j.concentration || degats <= 0) return e;
  const dd = Math.max(10, Math.floor(degats / 2));
  const jet = d20(rng) + bonusSauvegarde(j, 'con');
  if (jet >= dd) return journaliser(e, `  ${j.nom} garde sa concentration (${jet} contre DD ${dd})`, 'cond');
  return journaliser(modifierJeton(e, j.id, (x) => ({ ...x, concentration: null })), `  ${j.nom} perd sa concentration sur ${j.concentration} (${jet} contre DD ${dd})`, 'cond');
}

/** Dégâts subis : la rage divise par deux les dégâts d'arme. */
const degatsSubis = (c: Jeton, n: number, arme: boolean): number => (arme && c.conditions.includes('Rage') ? Math.floor(n / 2) : n);

/* ---------- attaques ---------- */

export const PORTEE_ATTAQUE = { melee: 2, distance: 8 } as const;

export interface ResultatAttaque { touche: boolean; critique: boolean; echec: boolean; jet: number; total: number; degats: number; mode?: 'normal' | 'avantage' | 'desavantage' }

/** `porteeMax` : portée de l'arme en cases (sinon la portée par défaut de la sorte d'attaque). */
export function attaquer(e: EtatTable, idA: number, idC: number, sorte: 'melee' | 'distance', rng: Rng, porteeMax?: number): { etat: EtatTable; resultat?: ResultatAttaque; erreur?: string } {
  const a = e.jetons.find((j) => j.id === idA), c = e.jetons.find((j) => j.id === idC);
  if (!a || !c) return { etat: e, erreur: 'Jeton introuvable' };
  if (a.id === c.id) return { etat: e, erreur: 'Un jeton ne peut pas s’attaquer lui-même' };
  if (!peutAgir(a)) return { etat: e, erreur: `${a.nom} ne peut pas agir (${a.conditions.join(', ')})` };
  const d = distance(e.grille, [a.x, a.y], [c.x, c.y]);
  const max = porteeMax ?? PORTEE_ATTAQUE[sorte];
  if (d > max) return { etat: e, erreur: `Hors de portée (${d} cases, max ${max})` };
  const auContact = e.jetons.some((x) => x.id !== a.id && x.pv > 0 && ennemis(a, x) && distance(e.grille, [a.x, a.y], [x.x, x.y]) <= 1);
  const { mode, raisons } = modeAttaque(a, c, sorte, auContact);
  const { garde: jet, des } = d20Mode(mode, rng);
  const beni = a.conditions.includes('Béni') ? de(1, 4, rng) : 0;
  const bonus = (a.bonusAttaque ?? modCarac(sorte === 'distance' ? a.carac.dex : a.carac.for)) + beni;
  const total = jet + bonus;
  // Coup critique : 20 naturel, ou au corps à corps contre une cible paralysée ou inconsciente.
  const critique = jet === 20 || (sorte === 'melee' && d <= 1 && (c.conditions.includes('Paralysé') || c.conditions.includes('Inconscient')) && jet !== 1 && total >= c.ca);
  const echec = jet === 1;
  const touche = critique || (!echec && total >= c.ca);
  const txtMode = mode === 'normal' ? '' : ` ${mode === 'avantage' ? 'avec avantage' : 'avec désavantage'} (${raisons.join(', ')}) [${des.join(', ')}]`;
  let r = journaliser(e, `⚔ ${a.nom} attaque ${c.nom}${txtMode} : d20 (${jet}) ${signe(bonus)} = ${total} contre CA ${c.ca}${echec ? ' : échec critique' : critique ? ' : coup critique !' : touche ? ' : touché' : ' : raté'}`, 'attaque');
  let degats = 0, sournoise = false;
  if (touche) {
    const formule = formuleValide(a.degats) ? a.degats : '1d8';
    const lr = lancer(formule, rng, critique);
    const m = modCarac(sorte === 'distance' ? a.carac.dex : a.carac.for);
    let extra = 0;
    const details: string[] = [];
    const passifs = a.profil?.passifs ?? [];
    if (sorte === 'melee' && a.conditions.includes('Rage')) { extra += 2; details.push('rage +2'); }
    if (a.conditions.includes('Avatar')) { extra += 2; details.push('avatar +2'); }
    if (sorte === 'melee' && passifs.includes('sang-chaud') && a.pv <= a.pvMax / 2) { extra += 2; details.push('sang chaud +2'); }
    if (passifs.includes('chasseur-geants') && c.taille >= 2) { const x = de(critique ? 2 : 1, 6, rng); extra += x; details.push(`chasseur de géants +${x}`); }
    if (c.conditions.includes('Marqué')) { const x = de(1, 4, rng); extra += x; details.push(`proie marquée +${x}`); }
    // Attaque sournoise : une fois par tour, avec l'avantage ou un allié au contact de la cible.
    const allieAuContact = e.jetons.some((x) => x.id !== a.id && x.pv > 0 && !ennemis(a, x) && distance(e.grille, [c.x, c.y], [x.x, x.y]) <= 1);
    if (a.profil?.sournoise && !a.sournoiseFaite && mode !== 'desavantage' && (mode === 'avantage' || allieAuContact)) {
      const x = de(a.profil.sournoise * (critique ? 2 : 1), 6, rng); extra += x; sournoise = true; details.push(`attaque sournoise +${x}`);
    }
    degats = degatsSubis(c, Math.max(1, lr.total + (/[+-]\d+$/.test(formule) ? 0 : m) + extra), true);
    const pv = Math.max(0, c.pv - degats);
    r = modifierJeton(r, c.id, (x) => ({ ...x, pv }));
    r = journaliser(r, `  ${c.nom} subit ${degats} dégâts (${formule}${critique ? ', dés doublés' : ''}${details.length ? `, ${details.join(', ')}` : ''}${c.conditions.includes('Rage') ? ', moitié : rage' : ''}) → ${pv} PV`, 'degats');
    r = testConcentration(r, { ...c, pv }, degats, rng);
  }
  // L'action est faite après toutes ses attaques (attaque supplémentaire) ; l'attaque révèle et consomme l'aide.
  const faites = (a.attaquesFaites ?? 0) + 1;
  r = modifierJeton(r, a.id, (x) => ({
    ...x, attaquesFaites: faites, sournoiseFaite: x.sournoiseFaite || sournoise,
    conditions: x.conditions.filter((k) => !CONSOMME_ATTAQUE.includes(k)),
    ...(r.combat.actif && faites >= (a.profil?.attaquesParAction ?? 1) ? { drapeaux: { ...x.drapeaux, action: true } } : {}),
  }));
  return { etat: r, resultat: { touche, critique, echec, jet, total, degats, mode } };
}

/* ---------- sorts ---------- */

/** Zone d'aperçu d'un sort au moment de viser. */
export function zoneDeSort(s: Gabarit, lanceur: Jeton, vise: Cellule, angle: number): Omit<Zone, 'id'> {
  const point = s.origine === 'soi' ? [lanceur.x, lanceur.y] : vise;
  return { categorie: 'sort', forme: s.forme, x: point[0], y: point[1], rayon: s.rayon, largeur: s.largeur ?? 1, angle, couleur: s.couleur, nom: s.nom, sortId: s.id };
}

/**
 * Applique les effets d'un sort aux jetons pris dans la zone. Avec un lanceur : sauvegarde des cibles contre son DD
 * (réussie : moitié des dégâts, pas d'état) ou jet d'attaque de sort contre leur CA.
 */
export function appliquerEffets(e: EtatTable, s: Gabarit, zone: Omit<Zone, 'id'>, rng: Rng, lanceur?: Jeton): { etat: EtatTable; cibles: string[] } {
  const cibles = jetonsDansZone(e.grille, { ...zone, id: -1 }, e.jetons);
  const dd = lanceur ? ddSorts(lanceur) : null;
  let r = e;
  for (const c of cibles) {
    let moitie = false, rate = false;
    const offensif = s.effets.some((f) => f.type !== 'soin');
    if (lanceur && offensif && s.attaque) {
      const jet = d20(rng), total = jet + (lanceur.profil?.attaqueSort ?? (dd! - 8));
      rate = jet === 1 || (jet !== 20 && total < c.ca);
      r = journaliser(r, `  ${c.nom} : attaque de sort ${total} contre CA ${c.ca} → ${rate ? 'ratée' : 'touchée'}`, 'attaque');
    } else if (lanceur && offensif && s.sauvegarde && dd) {
      const sv = sauvegarde(c, s.sauvegarde, dd, rng);
      moitie = sv.reussi;
      r = journaliser(r, `  ${c.nom} : sauvegarde de ${s.sauvegarde.toUpperCase()} ${sv.auto ? 'ratée d’office' : `${sv.total} contre DD ${dd}`} → ${sv.reussi ? 'réussie (moitié)' : 'ratée'}`, 'cond');
    }
    if (rate) continue;
    for (const f of s.effets) {
      const j = r.jetons.find((x) => x.id === c.id)!;
      if (f.type === 'degats') {
        const n = moitie ? Math.floor(f.valeur / 2) : f.valeur;
        const pv = Math.max(0, j.pv - n);
        r = journaliser(modifierJeton(r, j.id, (x) => ({ ...x, pv })), `  ${j.nom} : −${n} (${f.nature ?? ''}) → ${pv} PV`, 'degats');
        r = testConcentration(r, { ...j, pv }, n, rng);
      } else if (f.type === 'soin') {
        const pv = Math.min(j.pvMax, j.pv + f.valeur);
        r = journaliser(modifierJeton(r, j.id, (x) => ({ ...x, pv, conditions: pv > 0 ? x.conditions.filter((k) => k !== 'Inconscient') : x.conditions })), `  ${j.nom} : +${f.valeur} → ${pv} PV`, 'soin');
      } else if (!moitie && !j.conditions.includes(f.valeur)) {
        r = journaliser(modifierJeton(r, j.id, (x) => ({ ...x, conditions: [...x.conditions, f.valeur] })), `  ${j.nom} : ${f.valeur}`, 'cond');
      }
    }
  }
  return { etat: r, cibles: cibles.map((c) => c.nom) };
}

/** Lance un sort : refus en zone antimagie ou si le lanceur ne peut pas agir, effets, concentration, zone posée. */
export function lancerSort(e: EtatTable, sortId: number, lanceurId: number, zone: Omit<Zone, 'id'>, rng: Rng): { etat: EtatTable; erreur?: string; cibles?: string[] } {
  const s = e.sorts.find((x) => x.id === sortId);
  const l = e.jetons.find((x) => x.id === lanceurId);
  if (!s || !l) return { etat: e, erreur: 'Sort ou lanceur introuvable' };
  if (!peutAgir(l)) return { etat: e, erreur: `${l.nom} ne peut pas agir (${l.conditions.join(', ')})` };
  if (terrainsSur(e.grille, e.zones, TERRAINS, [l.x, l.y]).some((t) => t.antimagie)) {
    return { etat: journaliser(e, `${s.nom} annulé : ${l.nom} est en zone antimagie`), erreur: 'Zone antimagie : sort annulé' };
  }
  if (s.portee > 0 && s.origine === 'point' && distance(e.grille, [l.x, l.y], [zone.x, zone.y]) > s.portee) {
    return { etat: e, erreur: `Hors de portée (${s.portee} cases)` };
  }
  let r = journaliser(e, `✦ ${l.nom} lance ${s.nom}`, 'init');
  const app = appliquerEffets(r, s, zone, rng, l);
  r = app.etat;
  if (!app.cibles.length) r = journaliser(r, '  Aucune cible');
  if (s.concentration) {
    const ancienne = r.jetons.find((x) => x.id === l.id)!.concentration;
    if (ancienne) r = journaliser(r, `  ${l.nom} abandonne ${ancienne}`, 'cond');
    r = modifierJeton(r, l.id, (x) => ({ ...x, concentration: s.nom }));
  }
  if (r.combat.actif) r = modifierJeton(r, l.id, (x) => ({ ...x, drapeaux: { ...x.drapeaux, action: true }, conditions: x.conditions.filter((k) => k !== 'Caché' && k !== 'Invisible') }));
  const id = r.prochaineZone;
  r = { ...r, zones: [...r.zones, { ...zone, id }], prochaineZone: id + 1 };
  return { etat: r, cibles: app.cibles };
}
