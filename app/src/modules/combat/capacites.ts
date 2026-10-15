// Ce que la fiche d'un personnage apporte à la table (pur, testé) : valeurs calculées (CA, vitesse, caractéristiques,
// attaque, sauvegardes, compétences, DD des sorts — talents, dons et objets compris), capacités passives, magie et
// actions de combat débloquées (pour tous, par la classe, par les talents, par les dons).
import type { Personnage } from '../../noyau/contrat';
import { aUneFiche, type SystemeRegles } from '../../noyau/regles';
import { noeudParId } from '../../noyau/talents';
import { saitFaireDeLaMagie } from '../magie';
import { actionCombat, CARACS, type Carac, type Jeton, type ProfilCombat } from './moteur';

const mod = (v: number): number => Math.floor((v - 10) / 2);
const num = (v: unknown, d: number): number => (typeof v === 'number' && isFinite(v) ? v : d);

/** Actions de tous, et celles qu'apportent les aptitudes de classe (par leur nom). */
export const ACTIONS_DE_BASE = ['foncer', 'esquiver', 'cacher', 'aider'];
const PAR_APTITUDE: Record<string, string[]> = {
  'Rage': ['rage'], 'Second souffle': ['second-souffle'], 'Fougue': ['fougue'], 'Ruse': ['ruse-foncer', 'ruse-cacher'],
  'Imposition des mains': ['imposition'], 'Inspiration bardique': ['inspiration-bardique'],
};
const COMPETENCES_COMBAT = ['discretion', 'perception', 'medecine', 'athletisme', 'acrobaties'];

export interface Capacites { profil: ProfilCombat; actions: string[]; jeton: Partial<Jeton> }

export function capacitesCombat(p: Personnage, R: SystemeRegles): Capacites {
  const s = p.combat.stats;
  const calc = aUneFiche(R) && p.fiche ? R.calculer(p) : null;
  const niveau = calc?.niveau ?? num(s.niveau, 1);
  const pb = calc?.bonusMaitrise ?? 2 + Math.floor((niveau - 1) / 4);
  const carac = Object.fromEntries(CARACS.map((k) => [k, calc?.caracs.find((c) => c.carac === k)?.valeur ?? num((s.carac as Record<string, unknown> | undefined)?.[k], 10)])) as Record<Carac, number>;
  const derive = (cle: string) => calc?.derives.find((d) => d.cle === cle)?.valeur;
  const aptitudes = (calc?.aptitudes ?? []).map((a) => a.nom);
  const talents = (p.fiche?.progression?.talents ?? []).map((id) => noeudParId(id)).filter((n) => !!n);
  const dons = (p.fiche?.progression?.dons ?? []).map((id) => (aUneFiche(R) ? R.catalogue.dons?.find((d) => d.id === id) : undefined)).filter((d) => !!d);
  const magie = saitFaireDeLaMagie(p, R);
  const mental = Math.max(mod(carac.int), mod(carac.sag), mod(carac.cha));
  const roublard = p.fiche?.progression?.classes?.find((c) => c.id === 'roublard')?.niveau ?? 0;
  const maitrises = Object.entries(p.fiche?.maitrises?.competences ?? {}).filter(([, v]) => v > 0).map(([k]) => k);

  const profil: ProfilCombat = {
    niveau,
    bonusInitiative: derive('initiative') !== undefined ? derive('initiative')! - mod(carac.dex) : 0,
    sauvegardes: Object.fromEntries((calc?.sauvegardes ?? []).filter((v) => v.carac).map((v) => [v.carac, v.valeur])),
    competences: Object.fromEntries((calc?.competences ?? []).filter((v) => COMPETENCES_COMBAT.includes(v.cle.replace('competence.', ''))).map((v) => [v.cle.replace('competence.', ''), v.valeur])),
    maitrises,
    ddSorts: calc?.incantation?.length ? Math.max(...calc.incantation.map((i) => i.dd)) : magie ? 8 + pb + mental : null,
    attaqueSort: calc?.incantation?.length ? Math.max(...calc.incantation.map((i) => i.attaque)) : magie ? pb + mental : null,
    attaquesParAction: aptitudes.includes('Attaque supplémentaire') ? 2 : 1,
    passifs: [...new Set(talents.map((n) => n!.passif).filter((x): x is string => !!x))],
    ...(aptitudes.includes('Attaque sournoise') && roublard ? { sournoise: Math.ceil(roublard / 2) } : {}),
    magie,
  };
  const actions = [...new Set([
    ...ACTIONS_DE_BASE,
    ...(maitrises.includes('medecine') ? ['premiers-soins'] : []),
    ...aptitudes.flatMap((a) => PAR_APTITUDE[a] ?? []),
    ...talents.map((n) => n!.action).filter((x): x is string => !!x),
    ...dons.flatMap((d) => d!.actions ?? []),
  ])].filter((id) => actionCombat(id));
  const attaque = calc?.attaques[0];
  const jeton: Partial<Jeton> = {
    ...(calc ? { ca: derive('ca') ?? num(s.ca, 10), vitesse: derive('vitesse') ?? num(s.vitesse, 6), carac } : {}),
    ...(attaque ? { bonusAttaque: attaque.bonus, degats: attaque.degats.split(' ')[0] } : {}),
    pvMax: num(s.pvMax, 20),
    profil,
  };
  return { profil, actions, jeton };
}

/** Met le jeton d'un personnage à jour avec sa fiche (PV gardés, plafonnés au maximum). */
export function synchroniserJeton(j: Jeton, p: Personnage, R: SystemeRegles): Jeton {
  const { jeton } = capacitesCombat(p, R);
  const pvMax = jeton.pvMax ?? j.pvMax;
  return { ...j, ...jeton, pvMax, pv: Math.min(j.pv, pvMax) };
}
