// Actions de combat au-delà de l'attaque et du sort (pur, testé) : foncer, esquiver, se cacher, aider, premiers
// soins pour tous ; rage, second souffle, fougue, ruse… pour les classes ; et celles qu'apportent les talents et
// les dons. Le catalogue est une liste de données ; `jouerAction` applique les effets sur la table.
import { lancer } from '../../../noyau/regles';
import type { Rng } from '../../../noyau/hasard';
import { ddSorts, peutAgir, sauvegarde } from './conditions';
import { distance } from './grille';
import { journaliser, modCarac, modifierJeton } from './etat';
import type { Carac, EtatTable, Jeton } from './types';

export type EffetAction =
  | { type: 'etat-soi'; etat: string }
  | { type: 'etat-allie'; etat: string }
  /** Tous les alliés à `rayon` cases (soi compris). */
  | { type: 'etat-allies'; etat: string; rayon: number }
  | { type: 'etat-ennemi'; etat: string; sauvegarde?: Carac }
  /** Ennemis à `rayon` cases de soi, sauvegarde contre le DD du lanceur. */
  | { type: 'etat-zone'; etat: string; rayon: number; sauvegarde: Carac }
  /** `formule` : dés ; `parNiveau` : PV fixes par niveau du lanceur ; `mod` : + modificateur d'une caractéristique. */
  | { type: 'soin-soi' | 'soin-allie'; formule?: string; parNiveau?: number; mod?: Carac }
  | { type: 'degats-zone'; formule: string; rayon: number; sauvegarde: Carac; nature: string }
  /** Autour de la cible visée (ennemi à `portee` cases). */
  | { type: 'degats-cible'; formule: string; rayon: number; sauvegarde: Carac; nature: string }
  | { type: 'action-sup' }
  | { type: 'cacher' }
  | { type: 'premiers-soins' }
  | { type: 'retirer-etats-allie'; etats: string[] };

export interface ActionCombat {
  id: string; nom: string; texte: string; icone: string;
  /** Ce qu'elle coûte dans le tour ; « gratuit » : rien (mais limitée en utilisations). */
  cout: 'action' | 'bonus' | 'gratuit';
  cible: 'soi' | 'allie' | 'ennemi' | 'aucune';
  /** Portée (cases) de la cible. */
  portee?: number;
  /** Utilisations par combat (absent : sans limite). */
  parCombat?: number;
  effets: EffetAction[];
}

export const ACTIONS_COMBAT: ActionCombat[] = [
  // ---- pour tous
  { id: 'foncer', nom: 'Foncer', icone: '💨', cout: 'action', cible: 'soi', texte: 'Le déplacement de ce tour est doublé.', effets: [{ type: 'etat-soi', etat: 'Fonce' }] },
  { id: 'esquiver', nom: 'Esquiver', icone: '🛡', cout: 'action', cible: 'soi', texte: 'Jusqu’à votre prochain tour, les attaques contre vous ont le désavantage.', effets: [{ type: 'etat-soi', etat: 'Esquive' }] },
  { id: 'cacher', nom: 'Se cacher', icone: '🫥', cout: 'action', cible: 'soi', texte: 'Discrétion contre la Perception passive des ennemis ; réussi : avantage à votre prochaine attaque.', effets: [{ type: 'cacher' }] },
  { id: 'aider', nom: 'Aider', icone: '🤝', cout: 'action', cible: 'allie', portee: 1, texte: 'Un allié au contact a l’avantage à sa prochaine attaque.', effets: [{ type: 'etat-allie', etat: 'Aidé' }] },
  { id: 'premiers-soins', nom: 'Premiers soins', icone: '🩹', cout: 'action', cible: 'allie', portee: 1, texte: 'Un allié à 0 PV au contact : Médecine DD 10, il revient à 1 PV. Demande la maîtrise de Médecine.', effets: [{ type: 'premiers-soins' }] },
  // ---- classes
  { id: 'rage', nom: 'Rage', icone: '😡', cout: 'bonus', cible: 'soi', parCombat: 2, texte: '+2 aux dégâts au corps à corps, dégâts d’arme subis divisés par deux, jusqu’à la fin du combat.', effets: [{ type: 'etat-soi', etat: 'Rage' }] },
  { id: 'second-souffle', nom: 'Second souffle', icone: '💪', cout: 'bonus', cible: 'soi', parCombat: 1, texte: 'Regagner 1d10 + niveau PV.', effets: [{ type: 'soin-soi', formule: '1d10', parNiveau: 1 }] },
  { id: 'fougue', nom: 'Fougue', icone: '⚡', cout: 'gratuit', cible: 'soi', parCombat: 1, texte: 'Une action de plus ce tour.', effets: [{ type: 'action-sup' }] },
  { id: 'ruse-foncer', nom: 'Ruse : foncer', icone: '💨', cout: 'bonus', cible: 'soi', texte: 'Foncer en action bonus.', effets: [{ type: 'etat-soi', etat: 'Fonce' }] },
  { id: 'ruse-cacher', nom: 'Ruse : se cacher', icone: '🫥', cout: 'bonus', cible: 'soi', texte: 'Se cacher en action bonus.', effets: [{ type: 'cacher' }] },
  { id: 'imposition', nom: 'Imposition des mains', icone: '✋', cout: 'action', cible: 'allie', portee: 1, parCombat: 1, texte: 'Soigner un allié au contact (ou soi) de 5 PV par niveau.', effets: [{ type: 'soin-allie', parNiveau: 5 }] },
  { id: 'inspiration-bardique', nom: 'Inspiration bardique', icone: '🎵', cout: 'bonus', cible: 'allie', portee: 12, parCombat: 3, texte: 'Un allié est inspiré : +1d4 à son prochain jet.', effets: [{ type: 'etat-allie', etat: 'Inspiré' }] },
  // ---- talents
  { id: 'tempete-acier', nom: 'Tempête d’acier', icone: '⚔️', cout: 'bonus', cible: 'soi', parCombat: 1, texte: 'Une attaque de plus ce tour.', effets: [{ type: 'action-sup' }] },
  { id: 'proie-marquee', nom: 'Proie marquée', icone: '🎯', cout: 'bonus', cible: 'ennemi', portee: 12, parCombat: 1, texte: 'La cible subit +1d4 dégâts à chaque coup.', effets: [{ type: 'etat-ennemi', etat: 'Marqué' }] },
  { id: 'inspiration-combat', nom: 'Inspiration au combat', icone: '📯', cout: 'bonus', cible: 'aucune', parCombat: 1, texte: 'Les alliés à 6 cases sont inspirés.', effets: [{ type: 'etat-allies', etat: 'Inspiré', rayon: 6 }] },
  { id: 'avatar', nom: 'Avatar de la bataille', icone: '🔥', cout: 'bonus', cible: 'soi', parCombat: 1, texte: '+2 aux dégâts jusqu’à la fin du combat.', effets: [{ type: 'etat-soi', etat: 'Avatar' }] },
  { id: 'disparition', nom: 'Disparition', icone: '👻', cout: 'bonus', cible: 'soi', parCombat: 1, texte: 'Invisible jusqu’à votre prochaine attaque ou sort.', effets: [{ type: 'etat-soi', etat: 'Invisible' }] },
  { id: 'marque-patron', nom: 'Marque du patron', icone: '🕯', cout: 'bonus', cible: 'ennemi', portee: 12, parCombat: 1, texte: 'La cible est maudite : désavantage à ses attaques (sauvegarde de Sagesse).', effets: [{ type: 'etat-ennemi', etat: 'Maudit', sauvegarde: 'sag' }] },
  { id: 'lumiere-aveuglante', nom: 'Lumière aveuglante', icone: '☀️', cout: 'action', cible: 'aucune', parCombat: 1, texte: 'Les ennemis à 2 cases sont aveuglés (sauvegarde de Constitution).', effets: [{ type: 'etat-zone', etat: 'Aveuglé', rayon: 2, sauvegarde: 'con' }] },
  { id: 'voix-tonnerre', nom: 'Voix du tonnerre', icone: '🌩', cout: 'action', cible: 'aucune', parCombat: 1, texte: '2d8 dégâts de tonnerre aux ennemis à 2 cases (sauvegarde de Constitution : moitié).', effets: [{ type: 'degats-zone', formule: '2d8', rayon: 2, sauvegarde: 'con', nature: 'tonnerre' }] },
  { id: 'colere-ciel', nom: 'Colère du ciel', icone: '⚡', cout: 'action', cible: 'ennemi', portee: 12, parCombat: 1, texte: '4d10 dégâts de foudre autour de la cible (sauvegarde de Dextérité : moitié).', effets: [{ type: 'degats-cible', formule: '4d10', rayon: 1, sauvegarde: 'dex', nature: 'foudre' }] },
  { id: 'purification', nom: 'Purification', icone: '💧', cout: 'action', cible: 'allie', portee: 1, parCombat: 1, texte: 'Met fin au poison et à l’aveuglement d’un allié au contact (ou de soi).', effets: [{ type: 'retirer-etats-allie', etats: ['Empoisonné', 'Aveuglé'] }] },
  { id: 'coup-de-pouce', nom: 'Coup de pouce', icone: '🍀', cout: 'bonus', cible: 'allie', portee: 6, parCombat: 1, texte: '+1d4 au prochain jet d’un allié.', effets: [{ type: 'etat-allie', etat: 'Inspiré' }] },
  // ---- dons
  { id: 'soins-guerisseur', nom: 'Soins du guérisseur', icone: '🧪', cout: 'action', cible: 'allie', portee: 1, parCombat: 1, texte: 'Soigner un allié au contact de 1d6 + 4 + son niveau.', effets: [{ type: 'soin-allie', formule: '1d6+4', parNiveau: 1 }] },
  { id: 'coup-de-chance', nom: 'Coup de chance', icone: '🎲', cout: 'bonus', cible: 'soi', parCombat: 1, texte: 'Béni : +1d4 aux attaques et aux sauvegardes jusqu’à la fin du combat.', effets: [{ type: 'etat-soi', etat: 'Béni' }] },
];
export const actionCombat = (id: string): ActionCombat | undefined => ACTIONS_COMBAT.find((a) => a.id === id);

const ennemis = (a: Jeton, b: Jeton): boolean => (a.camp === 'ennemi') !== (b.camp === 'ennemi');
const ajouterEtat = (j: Jeton, etat: string): Jeton => (j.conditions.includes(etat) ? j : { ...j, conditions: [...j.conditions, etat] });

/** Peut-on jouer l'action maintenant (coût, utilisations, état) ? Renvoie la raison sinon. */
export function empechement(j: Jeton, a: ActionCombat, enCombat: boolean): string | null {
  if (!peutAgir(j)) return `${j.nom} ne peut pas agir`;
  if (enCombat && a.cout === 'action' && j.drapeaux.action) return 'Action déjà utilisée ce tour';
  if (enCombat && a.cout === 'bonus' && j.drapeaux.bonus) return 'Action bonus déjà utilisée ce tour';
  if (a.parCombat !== undefined && (j.usages?.[a.id] ?? 0) >= a.parCombat) return `Plus d’utilisation ce combat (${a.parCombat})`;
  return null;
}

/** Joue une action : vérifie coût, utilisations, cible et portée, puis applique ses effets. */
export function jouerAction(e: EtatTable, idJ: number, actionId: string, idCible: number | null, rng: Rng): { etat: EtatTable; texte?: string; erreur?: string } {
  const a = actionCombat(actionId), j = e.jetons.find((x) => x.id === idJ);
  if (!a || !j) return { etat: e, erreur: 'Action ou jeton introuvable' };
  const non = empechement(j, a, e.combat.actif);
  if (non) return { etat: e, erreur: non };
  let c: Jeton | undefined;
  if (a.cible === 'allie' || a.cible === 'ennemi') {
    c = idCible === null ? (a.cible === 'allie' ? j : undefined) : e.jetons.find((x) => x.id === idCible);
    if (!c) return { etat: e, erreur: 'Choisissez une cible' };
    if (a.cible === 'allie' && ennemis(j, c)) return { etat: e, erreur: `${c.nom} n’est pas un allié` };
    if (a.cible === 'ennemi' && !ennemis(j, c)) return { etat: e, erreur: `${c.nom} n’est pas un ennemi` };
    if (distance(e.grille, [j.x, j.y], [c.x, c.y]) > (a.portee ?? 1)) return { etat: e, erreur: `${c.nom} est hors de portée (${a.portee ?? 1} cases)` };
  }
  const niv = j.profil?.niveau ?? 1, dd = ddSorts(j);
  const soin = (f: Extract<EffetAction, { type: 'soin-soi' | 'soin-allie' }>) => (f.formule ? lancer(f.formule, rng).total : 0) + (f.parNiveau ?? 0) * niv + (f.mod ? modCarac(j.carac[f.mod]) : 0);
  let r = journaliser(e, `${a.icone} ${j.nom} : ${a.nom}${c && c.id !== j.id ? ` sur ${c.nom}` : ''}`, 'init');
  const textes: string[] = [];
  for (const f of a.effets) {
    if (f.type === 'etat-soi') { r = modifierJeton(r, j.id, (x) => ajouterEtat(x, f.etat)); textes.push(`${j.nom} : ${f.etat}`); }
    else if (f.type === 'etat-allie' && c) { r = modifierJeton(r, c.id, (x) => ajouterEtat(x, f.etat)); textes.push(`${c.nom} : ${f.etat}`); }
    else if (f.type === 'etat-allies') {
      for (const x of r.jetons.filter((y) => y.pv > 0 && !ennemis(j, y) && distance(r.grille, [j.x, j.y], [y.x, y.y]) <= f.rayon)) r = modifierJeton(r, x.id, (y) => ajouterEtat(y, f.etat));
      textes.push(`alliés proches : ${f.etat}`);
    } else if (f.type === 'etat-ennemi' && c) {
      const sv = f.sauvegarde ? sauvegarde(c, f.sauvegarde, dd, rng) : null;
      if (sv?.reussi) { textes.push(`${c.nom} résiste (${sv.total} contre DD ${dd})`); continue; }
      r = modifierJeton(r, c.id, (x) => ajouterEtat(x, f.etat)); textes.push(`${c.nom} : ${f.etat}`);
    } else if (f.type === 'etat-zone' || f.type === 'degats-zone' || f.type === 'degats-cible') {
      const centre = f.type === 'degats-cible' && c ? c : j;
      const touches = r.jetons.filter((y) => y.pv > 0 && ennemis(j, y) && distance(r.grille, [centre.x, centre.y], [y.x, y.y]) <= f.rayon);
      const total = f.type === 'etat-zone' ? 0 : lancer(f.formule, rng).total;
      for (const y of touches) {
        const sv = sauvegarde(y, f.sauvegarde, dd, rng);
        if (f.type === 'etat-zone') {
          if (!sv.reussi) r = modifierJeton(r, y.id, (x) => ajouterEtat(x, f.etat));
          textes.push(`${y.nom} : ${sv.reussi ? 'résiste' : f.etat}`);
        } else {
          const n = sv.reussi ? Math.floor(total / 2) : total, pv = Math.max(0, y.pv - n);
          r = modifierJeton(r, y.id, (x) => ({ ...x, pv }));
          textes.push(`${y.nom} −${n} (${f.nature}${sv.reussi ? ', moitié' : ''})`);
        }
      }
      if (!touches.length) textes.push('personne n’est touché');
    } else if (f.type === 'soin-soi' || f.type === 'soin-allie') {
      const q = f.type === 'soin-soi' ? j : (c ?? j), n = soin(f), pv = Math.min(q.pvMax, q.pv + n);
      r = modifierJeton(r, q.id, (x) => ({ ...x, pv, conditions: pv > 0 ? x.conditions.filter((k) => k !== 'Inconscient') : x.conditions }));
      textes.push(`${q.nom} +${n} PV → ${pv}`);
    } else if (f.type === 'action-sup') {
      r = modifierJeton(r, j.id, (x) => ({ ...x, drapeaux: { ...x.drapeaux, action: false }, attaquesFaites: 0 }));
      textes.push('une action de plus');
    } else if (f.type === 'cacher') {
      const bonus = j.profil?.competences?.discretion ?? modCarac(j.carac.dex);
      const jet = 1 + Math.floor(rng() * 20) + bonus;
      const veilleurs = r.jetons.filter((y) => y.pv > 0 && ennemis(j, y) && !y.conditions.includes('Aveuglé') && !y.conditions.includes('Inconscient'));
      const dd2 = Math.max(10, ...veilleurs.map((y) => 10 + (y.profil?.competences?.perception ?? modCarac(y.carac.sag))));
      const ok = jet >= dd2;
      if (ok) r = modifierJeton(r, j.id, (x) => ajouterEtat(x, 'Caché'));
      textes.push(`Discrétion ${jet} contre ${dd2} : ${ok ? 'caché' : 'repéré'}`);
    } else if (f.type === 'premiers-soins' && c) {
      if (c.pv > 0) return { etat: e, erreur: `${c.nom} n’est pas à terre (0 PV)` };
      const jet = 1 + Math.floor(rng() * 20) + (j.profil?.competences?.medecine ?? modCarac(j.carac.sag));
      if (jet >= 10) r = modifierJeton(r, c.id, (x) => ({ ...x, pv: 1, conditions: x.conditions.filter((k) => k !== 'Inconscient') }));
      textes.push(`Médecine ${jet} contre DD 10 : ${jet >= 10 ? `${c.nom} revient à 1 PV` : 'échec'}`);
    } else if (f.type === 'retirer-etats-allie') {
      const q = c ?? j;
      r = modifierJeton(r, q.id, (x) => ({ ...x, conditions: x.conditions.filter((k) => !f.etats.includes(k)) }));
      textes.push(`${q.nom} n’est plus ${f.etats.join(' ni ').toLowerCase()}`);
    }
  }
  const texte = textes.join(' ; ');
  r = journaliser(r, `  ${texte}`, 'cond');
  r = modifierJeton(r, j.id, (x) => ({
    ...x, usages: a.parCombat !== undefined ? { ...(x.usages ?? {}), [a.id]: (x.usages?.[a.id] ?? 0) + 1 } : x.usages,
    // L'action coûte son action ou son action bonus (une action « en plus » coûte seulement son action bonus).
    drapeaux: r.combat.actif && a.cout !== 'gratuit' ? { ...x.drapeaux, [a.cout]: true } : x.drapeaux,
  }));
  return { etat: r, texte: `${a.nom} : ${texte}` };
}
