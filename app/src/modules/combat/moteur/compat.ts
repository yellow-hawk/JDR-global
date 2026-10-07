// Conversion des états de la Table de combat v7 (rencontres enregistrées avant la réécriture, exports JSON v7).
import { nouvelEtat } from './etat';
import type { Camp, EtatTable, Gabarit, Jeton, Zone } from './types';

type O = Record<string, unknown>;
const n = (v: unknown, d: number): number => (typeof v === 'number' && isFinite(v) ? v : d);
const s = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);

const CAMPS: Record<string, Camp> = { pc: 'pj', ally: 'allie', enemy: 'ennemi', neutral: 'neutre' };
const FORMES: Record<string, Zone['forme']> = { circle: 'cercle', cone: 'cone', line: 'ligne', square: 'carre', rectangle: 'rectangle', polygon: 'polygone' };
const TERRAINS: Record<string, string> = { diff: 'difficile', block: 'infranchissable', water: 'eau', elev: 'elevation', cover: 'couvert', magic: 'antimagie', wall: 'mur' };
const PARTICULES: Record<string, string> = { fire: 'feu', ice: 'glace', lightning: 'foudre', holy: 'sacre', dark: 'tenebres' };

export const estEtatV7 = (v: unknown): boolean => typeof v === 'object' && v !== null && Array.isArray((v as O).tokens);
export const estEtatTable = (v: unknown): v is EtatTable => typeof v === 'object' && v !== null && (v as O).version === 1 && Array.isArray((v as O).jetons);

export function jetonV7(t: O): Jeton {
  const f = (t.turnFlags ?? {}) as O;
  return {
    id: n(t.id, 1), nom: s(t.name, '?'), camp: CAMPS[s(t.type)] ?? 'neutre',
    pv: n(t.hp, n(t.hpMax, 20)), pvMax: n(t.hpMax, 20), ca: n(t.ac, 10), vitesse: n(t.speed, 6),
    carac: { for: n(t.str, 10), dex: n(t.dex, 10), con: n(t.con, 10), int: n(t.int, 10), sag: n(t.wis, 10), cha: n(t.cha, 10) },
    x: n(t.x, 0), y: n(t.y, 0), taille: Math.max(1, Math.min(4, n(t.size, 1))) as Jeton['taille'],
    conditions: Array.isArray(t.conditions) ? (t.conditions as string[]) : [], notes: s(t.notes),
    couleur: typeof t.color === 'string' && !t.color.startsWith('var(') ? t.color : null,
    visible: t.visible !== false,
    auras: Array.isArray(t.auras) ? (t.auras as O[]).map((a) => ({ nom: s(a.name), rayon: n(a.radius, 1), couleur: s(a.color, 'rgba(201,168,76,.3)') })) : [],
    drapeaux: { action: !!f.action, bonus: !!f.bonus, reaction: !!f.reaction, mouvement: !!f.movement },
    concentration: typeof t.concentration === 'string' ? t.concentration : null,
    mouvementUtilise: n(t.moveUsed, 0), vision: n(t.visionRange, 12), degats: s(t.damageFormula, '1d8'),
    bonusAttaque: typeof t.attackBonus === 'number' ? t.attackBonus : null, initiative: n(t.initiative, 0),
    persoId: typeof t.persoId === 'string' ? t.persoId : null, portrait: typeof t.portrait === 'string' ? t.portrait : null,
  };
}

export function zoneV7(z: O): Zone {
  return {
    id: n(z.id, 1), categorie: z.zoneCategory === 'terrain' ? 'terrain' : 'sort', forme: FORMES[s(z.shape)] ?? 'cercle',
    x: n(z.x, 0), y: n(z.y, 0), rayon: n(z.radius, 1), largeur: n(z.width, 1), angle: n(z.angle, 0),
    couleur: s(z.color, 'rgba(74,144,217,0.5)'), nom: s(z.name),
    points: Array.isArray(z.points) ? (z.points as [number, number][]) : undefined,
    terrain: z.terrainType ? TERRAINS[s(z.terrainType)] ?? s(z.terrainType) : undefined,
  };
}

export function sortV7(sp: O): Gabarit {
  const effets = (Array.isArray(sp.effects) ? (sp.effects as O[]) : []).map((f) =>
    f.type === 'damage' ? { type: 'degats' as const, valeur: n(f.value, 0), nature: s(f.dt) }
      : f.type === 'heal' ? { type: 'soin' as const, valeur: n(f.value, 0) }
        : { type: 'condition' as const, valeur: s(f.value), bonus: !!f.buff });
  return {
    id: n(sp.id, 1), nom: s(sp.name, 'Sort'), forme: (FORMES[s(sp.shape)] ?? 'cercle') as Gabarit['forme'],
    rayon: n(sp.radius, 3), largeur: n(sp.width, 1), portee: n(sp.range, 0), origine: sp.origin === 'self' ? 'soi' : 'point',
    effets, couleur: s(sp.color, 'rgba(155,89,182,0.5)'), particule: PARTICULES[s(sp.particle)] ?? null,
    concentration: !!sp.concentration, desc: s(sp.desc), atelier: !!sp.atelier,
  };
}

/** État v7 (ou fragment : tokens + zones) → état de la nouvelle table. */
export function depuisV7(v: O): EtatTable {
  const e = nouvelEtat();
  const jetons = (v.tokens as O[]).map(jetonV7);
  const zones = Array.isArray(v.zones) ? (v.zones as O[]).map(zoneV7) : [];
  const combat = (v.combat === true && Array.isArray(v.initOrder))
    ? { actif: true, round: n(v.round, 1), tour: n(v.ti, 0), ordre: v.initOrder as number[] }
    : e.combat;
  return {
    ...e,
    grille: { type: v.gridType === 'hex' ? 'hex' : 'carree', taille: n(v.gs, 40) },
    jetons, zones, combat,
    sorts: Array.isArray(v.spells) ? (v.spells as O[]).map(sortV7) : e.sorts,
    prochainId: Math.max(1, ...jetons.map((j) => j.id + 1)),
    prochaineZone: Math.max(1, ...zones.map((z) => z.id + 1)),
    brouillard: { actif: !!v.fog, cases: (typeof v.fogGrid === 'object' && v.fogGrid ? v.fogGrid : {}) as Record<string, true> },
  };
}

/** Accepte n'importe quel état enregistré (nouveau format ou v7). */
export const lireEtat = (v: unknown): EtatTable | null =>
  estEtatTable(v) ? { ...nouvelEtat(), ...v } : estEtatV7(v) ? depuisV7(v as O) : null;
