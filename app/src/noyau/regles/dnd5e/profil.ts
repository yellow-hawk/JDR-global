// Statistiques cohérentes avec le rôle et l'histoire d'un PNJ (D&D 5e). Données : archetypes.json.
import { hashStr, mulberry32 } from '../../hasard';
import type { ProfilPnj } from '../types';
import donnees from './archetypes.json';

type Carac = 'for' | 'dex' | 'con' | 'int' | 'sag' | 'cha';
interface Archetype { id: string; motif: string; niveau: number[]; ordre: string[]; ca: number; dv: number; arme: string[]; vitesse: number }

const mod = (v: number) => Math.floor((v - 10) / 2);
const ARCH = donnees.archetypes as Archetype[];

export const archetypeDe = (role: string): Archetype => ARCH.find((a) => new RegExp(a.motif, 'i').test(role)) ?? ARCH[ARCH.length - 1];

export function statsPourProfil(p: ProfilPnj): Record<string, unknown> {
  const r = mulberry32(hashStr(`stats|${p.graine}`));
  const a = archetypeDe(p.role ?? '');
  // Niveau : l'antagoniste tout en haut de la fourchette (et au-delà), un adversaire au milieu.
  const [n0, n1] = a.niveau;
  const niveau = p.antagoniste ? n1 + 1 : p.sorte === 'ennemi' ? Math.round((n0 + n1) / 2) : n0 + Math.floor(r() * (n1 - n0 + 1));
  const carac = {} as Record<Carac, number>;
  a.ordre.forEach((k, i) => { carac[k as Carac] = donnees.valeurs[i] + (r() < 0.3 ? 1 : 0); });
  // Description (« massif », « âgé »…) : petits ajustements.
  for (const d of donnees.description) if (new RegExp(d.motif, 'i').test(`${p.description ?? ''} ${p.role ?? ''}`)) {
    for (const [k, v] of Object.entries(d.bonus)) carac[k as Carac] = (carac[k as Carac] ?? 10) + (v as number);
  }
  // Progression : +1 sur les deux meilleures caractéristiques tous les 4 niveaux.
  const gains = Math.floor(niveau / 4);
  for (let g = 0; g < gains; g++) carac[a.ordre[g % 2] as Carac] += 2;
  for (const k of Object.keys(carac) as Carac[]) carac[k] = Math.max(3, Math.min(20, carac[k]));
  const pvMax = Math.max(4, a.dv + mod(carac.con) + (niveau - 1) * (Math.floor(a.dv / 2) + 1 + mod(carac.con)));
  const [de, carArme] = a.arme;
  const m = mod(carac[carArme as Carac]);
  const maitrise = 2 + Math.floor((niveau - 1) / 4);
  return {
    pv: pvMax, pvMax, ca: a.ca + (p.antagoniste ? 1 : 0) + Math.max(0, Math.min(2, mod(carac.dex))) * (a.ca <= 12 ? 1 : 0),
    vitesse: a.vitesse, carac, degats: `${niveau >= 5 ? '2' + de.slice(1) : de}${m >= 0 ? '+' : ''}${m}`,
    vision: 12, niveau, bonusAttaque: maitrise + m, archetype: a.id,
  };
}
