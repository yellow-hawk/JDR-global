// Cartes de bataille des quêtes : quels lieux, quels adversaires, et rangement dans la campagne
// (carte cachée aux joueurs + rencontre prête + repère « Lancer le combat » sur la carte du lieu). Pur, testé.
import type { Campagne, Carte, Fichier, Rencontre, Repere } from '../../../noyau/contrat';
import { nouvelId, nouvelleCarte } from '../../../noyau/contrat';
import type { SystemeRegles } from '../../../noyau/regles';
import type { LieuQuete } from '../../cartes';
import { BIBLIOTHEQUE_DE_BASE, jetonDepuisPersonnage } from '../../combat';
import type { QueteAtlas } from '../../journal';
import { carteAtlas } from './cartes';

export interface LieuAtlas extends LieuQuete { peuple?: number; ou?: { cle: string; x: number; y: number } | null }
export type QueteAtlasDetail = QueteAtlas & { lieuxDetail?: LieuAtlas[]; adversaire?: string };

export interface LieuDeBataille { quete: QueteAtlasDetail; lieu: LieuAtlas; dernier: boolean; cle: string }

/** Un lieu par étape de quête (sans doublon dans une même quête). L'adversaire de la quête attend au dernier. */
export function lieuxDeBataille(quetes: QueteAtlasDetail[]): LieuDeBataille[] {
  const res: LieuDeBataille[] = [];
  for (const q of quetes) {
    const lieux = (q.lieuxDetail ?? []).filter((l, i, t) => t.findIndex((x) => x.nom === l.nom) === i);
    lieux.forEach((lieu, i) => res.push({ quete: q, lieu, dernier: i === lieux.length - 1, cle: `${q.cle}|${lieu.nom}` }));
  }
  return res;
}

const NOMBRE: [RegExp, number][] = [[/mortel|extrême/i, 5], [/dangereux|élevé/i, 4], [/incertain|modéré|moyen/i, 3], [/faible|aucun|sûr/i, 2]];

/** Sbires selon le lieu (noms de la bibliothèque de base), la première règle qui correspond l'emporte. */
const SBIRES: [RegExp, string[]][] = [
  [/tombeau|tombe|crypte|nécropole|ossuaire|maudit/i, ['Squelette', 'Zombie']],
  [/grotte|caverne|antre|nid|mine/i, ['Araignée géante', 'Loup', 'Ours brun', 'Gobelin']],
  [/temple|sanctuaire|monastère|cercle|observatoire/i, ['Cultiste', 'Prêtre']],
  [/palais|cour|château|fort|tour|capitale|garnison/i, ['Garde', 'Mage']],
  [/camp|repaire|brigands|bandits|pirates|route|pont|gué/i, ['Bandit', 'Capitaine bandit']],
  [/forêt|bois|marais|plaine|désert|neige/i, ['Loup', 'Bandit', 'Orc']],
  [/ruines|vestiges|cratère|statue|champ de bataille/i, ['Gobelin', 'Orc', 'Squelette']],
  [/./, ['Bandit', 'Garde']],
];

/** Adversaires : l'adversaire nommé (s'il est dans les personnages) au dernier lieu, plus des sbires selon le danger. */
export function adversairesPour(c: Campagne, b: LieuDeBataille, R: SystemeRegles) {
  const n = NOMBRE.find(([re]) => re.test(b.lieu.danger ?? ''))?.[1] ?? 3;
  const texte = `${b.lieu.etape ?? ''} ${b.lieu.nom} ${b.lieu.sorte ?? ''} ${b.lieu.type ?? ''}`;
  const noms = SBIRES.find(([re]) => re.test(texte))![1];
  const sbires = BIBLIOTHEQUE_DE_BASE.filter((m) => noms.includes(m.nom));
  const res = [];
  const chef = b.dernier && b.quete.adversaire ? c.personnages.find((p) => p.nom.toLowerCase() === b.quete.adversaire!.toLowerCase()) : undefined;
  if (chef) res.push({ ...jetonDepuisPersonnage(chef, R, null), camp: 'ennemi' as const });
  for (let i = 0; i < n - (chef ? 1 : 0); i++) {
    const m = sbires.length ? sbires[i % sbires.length] : BIBLIOTHEQUE_DE_BASE[0];
    res.push({ ...m, carac: { ...m.carac }, camp: 'ennemi' as const, nom: `${m.nom} ${i + 1}` });
  }
  return res;
}

export const pjDeLaCampagne = (c: Campagne, R: SystemeRegles) => c.personnages.filter((p) => p.sorte === 'pj').map((p) => jetonDepuisPersonnage(p, R, null));

export const carteBataille = (c: Campagne, univ: string, cle: string): Carte | undefined =>
  c.cartes.find((k) => k.source.sorte === 'generateur' && k.source.cle === cle && k.univers?.id === univ);

export interface ArgsBataille {
  univ: string; idCarte: string; b: LieuDeBataille; libelle: string; theme: string;
  joueurs: Fichier; mj: Fichier; taille: { l: number; h: number }; pxCase: number;
  table: Record<string, unknown>;
}

/** Range la carte de bataille, sa rencontre et le repère qui la lance. Sans effet si elle existe déjà. */
export function integrerBataille(c: Campagne, a: ArgsBataille): Campagne {
  if (carteBataille(c, a.univ, a.b.cle)) return c;
  const { b } = a;
  const carte: Carte = {
    ...nouvelleCarte(`${b.lieu.nom} (${a.libelle})`, a.theme === 'exterieur' ? 'bataille' : 'donjon'), id: a.idCarte,
    univers: { type: 'univers', id: a.univ }, source: { sorte: 'generateur', cle: b.cle, ref: a.libelle },
    images: { joueurs: a.joueurs.id, mj: { image: a.mj.id } }, taille: a.taille,
    echelle: { metresParPixel: 1.5 / a.pxCase },
    grille: { type: 'carree', taille: a.pxCase, decalage: [0, 0] },
    mj: { cache: true, quete: b.quete.titre, etape: b.lieu.etape ?? '' },
  };
  const quete = c.quetes.find((q) => q.source.sorte === 'atlas' && q.source.cle === b.quete.cle && q.univers?.id === a.univ);
  const jetonsLies = ((a.table.jetons as { persoId?: string | null; x: number; y: number; visible: boolean }[]) ?? [])
    .filter((j) => j.persoId && c.personnages.some((p) => p.id === j.persoId))
    .map((j) => ({ perso: { type: 'personnage' as const, id: j.persoId! }, x: j.x, y: j.y, visible: j.visible }));
  const r: Rencontre = {
    id: nouvelId('renc'), nom: b.lieu.etape && b.lieu.etape !== b.lieu.nom ? `${b.lieu.nom} : ${b.lieu.etape}` : b.lieu.nom,
    carte: { type: 'carte', id: carte.id }, jetons: jetonsLies, terrain: [], table: a.table,
    quete: quete ? { type: 'quete', id: quete.id } : null,
    mj: { notes: [b.lieu.desc, b.lieu.danger ? `Danger : ${b.lieu.danger}` : ''].filter(Boolean).join('\n') },
  };
  // Repère sur la carte du lieu (plan de ville, de village ou carte du pays).
  const cible = b.lieu.ou ? carteAtlas(c, a.univ, b.lieu.ou.cle) : undefined;
  const rep: Repere | null = cible && b.lieu.ou ? {
    id: nouvelId('rep'), nom: `⚔ ${b.lieu.nom}`, x: Math.round(b.lieu.ou.x), y: Math.round(b.lieu.ou.y), sorte: 'quete',
    desc: `${b.quete.titre}${b.lieu.etape ? ` · ${b.lieu.etape}` : ''}`, lien: { type: 'rencontre', id: r.id }, mj: { cache: true },
  } : null;
  const cartes = [...c.cartes.map((k) => (rep && k.id === cible!.id ? { ...k, reperes: [...k.reperes, rep] } : k)), carte];
  if (cible && b.lieu.ou) {
    const { x, y } = b.lieu.ou;
    carte.parent = { carte: { type: 'carte', id: cible.id }, zone: [Math.round(x - 30), Math.round(y - 30), 60, 60] };
  }
  const quetes = quete ? c.quetes.map((q) => (q.id === quete.id ? { ...q, lieux: [...q.lieux, { type: 'carte' as const, id: carte.id }] } : q)) : c.quetes;
  return { ...c, cartes, quetes, rencontres: [...c.rencontres, r], fichiers: [...c.fichiers, a.joueurs, a.mj] };
}
