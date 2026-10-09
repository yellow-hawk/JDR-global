// Création de personnages (pur) : PJ ou PNJ complets à partir des choix ou d'un tirage reproductible,
// apparence 3D assortie (tenue selon la classe, arme et armure de l'inventaire équipé).
import type { Campagne, Personnage, SortePersonnage } from '../../../noyau/contrat';
import { nouvelId, nouveauPersonnage } from '../../../noyau/contrat';
import type { ChoixCreation, OptionsAleatoire, SystemeAvecFiche } from '../../../noyau/regles';
import { entier, rngFor } from '../../../noyau/hasard';
import { apparenceAuto } from '../../avatar';
import { contexteDe, genererPnj } from '../../generateurs';

/** Options de l'avatar portées par l'équipement équipé (catalogue : avatar « arme:epee », « armure:cotte »). */
export function assetsDeLInventaire(p: Personnage, R: SystemeAvecFiche): Record<string, string | null> {
  const res: Record<string, string | null> = { arme: null };
  let armure = false;
  for (const o of (p.fiche?.inventaire?.objets ?? []).filter((x) => x.equipe)) {
    const e = R.catalogue.objets.find((x) => x.id === o.ref);
    if (e?.sorte === 'armure' && e.categorie !== 'bouclier') armure = true;
    if (!e?.avatar) continue;
    const [slot, option] = e.avatar.split(':');
    if (!res[slot]) res[slot] = option;
  }
  if (armure && !('armure' in res)) res.armure = null; // armure de cuir, de peaux… : pas de pièce 3D, on garde la tenue
  return res;
}

/** Reporte sur l'avatar 3D l'arme et l'armure équipées quand l'équipement a changé (le reste de l'apparence est gardé). */
export function avecAvatarEquipe(avant: Personnage, apres: Personnage, R: SystemeAvecFiche): Personnage {
  if (!apres.apparence) return apres;
  const a = assetsDeLInventaire(avant, R), b = assetsDeLInventaire(apres, R);
  if (JSON.stringify(a) === JSON.stringify(b)) return apres;
  const preset = apres.apparence as { data?: { assets?: Record<string, string | null> } };
  const assets = { ...(preset.data?.assets ?? {}) };
  for (const [slot, option] of Object.entries(b)) if (option || slot in a) assets[slot] = option;
  for (const slot of Object.keys(a)) if (!(slot in b)) assets[slot] = null;
  return { ...apres, apparence: { ...preset, data: { ...(preset.data ?? {}), assets } } as Record<string, unknown> };
}

/** Apparence automatique : tenue selon la classe ou le rôle, puis arme et armure de l'inventaire. */
export function apparencePour(p: Personnage, R: SystemeAvecFiche, description = ''): Record<string, unknown> {
  const espece = R.catalogue.peuples.find((x) => x.id === p.fiche?.identite?.espece);
  const classe = R.catalogue.classes.find((x) => x.id === p.fiche?.progression?.classes?.[0]?.id);
  const preset = apparenceAuto({
    nom: p.nom, apparence: description, feminin: p.fiche?.identite?.genre === 'femme',
    role: `${p.role ?? ''} ${classe?.nom ?? ''}`, peupleNom: espece?.avatar ?? espece?.nom, peuple: p.fiche?.identite?.espece ?? null,
  }) as { data: { assets: Record<string, string | null> } };
  const inv = assetsDeLInventaire(p, R);
  for (const [slot, option] of Object.entries(inv)) if (option || slot === 'arme') preset.data.assets[slot] = option;
  return preset as unknown as Record<string, unknown>;
}

/** Personnage complet à partir de choix (assistant) ou d'un tirage. */
export function personnageDepuisChoix(R: SystemeAvecFiche, choix: ChoixCreation, sorte: SortePersonnage, extra: Partial<Personnage> = {}, avecApparence = true): Personnage {
  const { nom, stats, fiche } = R.creation.creer(choix);
  const p: Personnage = { ...nouveauPersonnage(nom, sorte, R.id, stats), fiche, ...extra };
  return avecApparence ? { ...p, apparence: apparencePour(p, R, p.notes ?? '') } : p;
}

export interface DemandeAleatoire extends OptionsAleatoire {
  sorte: SortePersonnage;
  nombre: number;
  avecApparence: boolean;
}

/** Un lot de personnages tirés au hasard ; les PNJ reçoivent aussi rôle, manières, motivation et secret (générateur de PNJ). */
export function genererLot(c: Campagne, R: SystemeAvecFiche, d: DemandeAleatoire, graineLot = nouvelId('lot')): Personnage[] {
  const ctx = contexteDe(c);
  return Array.from({ length: Math.max(1, Math.min(20, d.nombre)) }, (_, i) => {
    const graine = `${graineLot}|${i}`;
    if (d.sorte === 'pj') return personnageDepuisChoix(R, R.creation.aleatoire(graine, d), 'pj', {}, d.avecApparence);
    const g = genererPnj(graine, ctx, d.role || undefined);
    const niveau = d.niveau ?? (d.sorte === 'ennemi' ? entier(rngFor(graine, 'niveau'), 1, 6) : entier(rngFor(graine, 'niveau'), 1, 4));
    const choix = R.creation.aleatoire(graine, { ...d, role: d.role || g.role, niveau, nom: d.nom ?? g.nom, feminin: d.feminin ?? g.sexe === 'f' });
    return personnageDepuisChoix(R, choix, d.sorte, {
      role: d.role || g.role,
      notes: `${g.apparence} ; ${g.maniere}.`,
      mj: { notes: `Motivation : ${g.motivation}\nSecret : ${g.secret}\nAccroche : ${g.accroche}`, ...(d.sorte === 'ennemi' ? { antagoniste: true } : {}) },
    }, d.avecApparence);
  });
}
