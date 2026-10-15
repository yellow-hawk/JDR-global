// Ce que les joueurs à distance font depuis leur écran (pur, testé) : jets de dés (libres ou demandés par le MJ),
// inventaire et bourse, journal du groupe, demande de montée de niveau. Le MJ ne garde que ce que les règles et
// ses réglages permettent ; un niveau attend sa validation.
import type { Campagne, ObjetInventaire, Personnage } from '../../noyau/contrat';
import { nouvelId, sansSecrets } from '../../noyau/contrat';
import { aUneFiche, formuleValide, type ModeJet, type SystemeRegles } from '../../noyau/regles';
import { appliquerNiveau, avecStatsCalculees, etatProgression, type ChoixNiveau } from '../personnages';
import { distantsDe, type Distant } from './logique';

type Joueurs = { distants?: Record<string, Distant>; groupe?: EntreeGroupe[]; inventaire?: Partial<DroitsInventaire> };
const mod = (c: Campagne): Joueurs => (c.modules?.joueurs ?? {}) as Joueurs;
const avecJoueurs = (c: Campagne, f: (m: Joueurs) => Joueurs): Campagne => ({ ...c, modules: { ...c.modules, joueurs: f(mod(c)) } });
const avecDistant = (c: Campagne, persoId: string, f: (d: Distant) => Distant): Campagne => {
  const d = distantsDe(c)[persoId];
  return d ? avecJoueurs(c, (m) => ({ ...m, distants: { ...distantsDe(c), [persoId]: f(d) } })) : c;
};
const majPerso = (c: Campagne, id: string, f: (p: Personnage) => Personnage): Campagne =>
  ({ ...c, personnages: c.personnages.map((p) => (p.id === id ? f(p) : p)) });

/* ---------- jets de dés ---------- */

/** Jet proposé au joueur : d'après sa fiche (caractéristiques, sauvegardes, compétences, initiative). */
export interface JetFiche { cle: string; libelle: string; bonus: number; groupe: 'Caractéristiques' | 'Sauvegardes' | 'Compétences' | 'Autres' }
/** Jet demandé par le MJ (le DD reste chez le MJ). */
export interface DemandeJet { id: string; cle: string; libelle: string; mode: ModeJet; quand: string; dd?: number | null }

export function jetsDeLaFiche(p: Personnage, R: SystemeRegles): JetFiche[] {
  if (!aUneFiche(R) || !p.fiche) return [];
  const f = R.calculer(p);
  return [
    ...f.caracs.map((v) => ({ cle: v.cle, libelle: v.libelle, bonus: Math.floor((v.valeur - 10) / 2), groupe: 'Caractéristiques' as const })),
    ...f.sauvegardes.map((v) => ({ cle: v.cle, libelle: `Sauvegarde ${/^[aeiouyéèêàâîô]/i.test(v.libelle) ? 'd’' : 'de '}${v.libelle}`, bonus: v.valeur, groupe: 'Sauvegardes' as const })),
    ...f.competences.map((v) => ({ cle: v.cle, libelle: v.libelle, bonus: v.valeur, groupe: 'Compétences' as const })),
    ...f.derives.filter((v) => v.cle === 'initiative').map((v) => ({ cle: v.cle, libelle: v.libelle, bonus: v.valeur, groupe: 'Autres' as const })),
  ];
}
export const formuleD20 = (bonus: number): string => `1d20${bonus ? (bonus > 0 ? `+${bonus}` : `${bonus}`) : ''}`;

/**
 * Jet demandé par l'écran du joueur : le bonus vient toujours de sa fiche (calculé ici, jamais de l'écran) ; un jet
 * libre n'accepte qu'une formule de dés simple. Renvoie la formule et le libellé, ou null.
 */
export function formuleDuJoueur(p: Personnage, R: SystemeRegles, d: { cle?: unknown; formule?: unknown }): { formule: string; libelle: string } | null {
  if (typeof d.cle === 'string') {
    const j = jetsDeLaFiche(p, R).find((x) => x.cle === d.cle);
    return j ? { formule: formuleD20(j.bonus), libelle: j.libelle } : null;
  }
  if (typeof d.formule === 'string' && d.formule.length <= 20 && formuleValide(d.formule)) return { formule: d.formule.replace(/\s+/g, ''), libelle: 'Jet libre' };
  return null;
}

export const demandesJet = (c: Campagne, persoId: string): DemandeJet[] => distantsDe(c)[persoId]?.jets ?? [];
export function demanderJet(c: Campagne, persoIds: string[], j: Omit<DemandeJet, 'id' | 'quand'>, quand = new Date().toISOString()): Campagne {
  return persoIds.reduce((x, id) => avecDistant(x, id, (d) => ({ ...d, jets: [...(d.jets ?? []), { ...j, id: nouvelId('jet'), quand }] })), c);
}
export function retirerDemandeJet(c: Campagne, persoId: string, id: string): { campagne: Campagne; demande: DemandeJet | null } {
  const dem = demandesJet(c, persoId).find((x) => x.id === id) ?? null;
  if (!dem) return { campagne: c, demande: null };
  return { campagne: avecDistant(c, persoId, (d) => ({ ...d, jets: demandesJet(c, persoId).filter((x) => x.id !== id) })), demande: dem };
}
/** Résultat contre le DD du MJ (texte pour le MJ). */
export const verdict = (total: number, dd?: number | null): string => (dd ? `${total} contre DD ${dd} : ${total >= dd ? 'réussi' : 'raté'}` : String(total));

/* ---------- inventaire et bourse ---------- */

/** Ce que le MJ permet : s'équiper, donner un objet ou de l'argent à un autre PJ. `modules.joueurs.inventaire`. */
export interface DroitsInventaire { equiper: boolean; donner: boolean }
export const droitsInventaire = (c: Campagne): DroitsInventaire => ({ equiper: true, donner: true, ...(mod(c).inventaire ?? {}) });
export const avecDroitsInventaire = (c: Campagne, d: Partial<DroitsInventaire>): Campagne =>
  avecJoueurs(c, (m) => ({ ...m, inventaire: { ...droitsInventaire(c), ...d } }));

/** Inventaire envoyé au joueur : ses objets (sans les secrets du MJ), sa bourse, à qui il peut donner. */
export function inventaireDuJoueur(c: Campagne, p: Personnage, R: SystemeRegles) {
  const inv = p.fiche?.inventaire ?? { objets: [] };
  return {
    objets: sansSecrets(inv.objets.map(({ mj: _mj, ...o }) => o)),
    monnaie: inv.monnaie ?? {},
    monnaies: aUneFiche(R) ? R.catalogue.monnaies.map((m) => ({ id: m.id, nom: m.libelle })) : [],
    compagnons: c.personnages.filter((x) => x.sorte === 'pj' && x.id !== p.id).map((x) => ({ id: x.id, nom: x.nom })),
    droits: droitsInventaire(c),
  };
}

export type DemandeInventaire =
  | { faire: 'equiper'; objet: string; equipe: boolean }
  | { faire: 'donner'; objet: string; a: string; quantite: number }
  | { faire: 'argent'; a: string; piece: string; montant: number };

const objetsDe = (p: Personnage): ObjetInventaire[] => p.fiche?.inventaire?.objets ?? [];
const avecInventaire = (p: Personnage, objets: ObjetInventaire[], monnaie = p.fiche?.inventaire?.monnaie): Personnage =>
  ({ ...p, fiche: { ...(p.fiche ?? {}), inventaire: { ...(p.fiche?.inventaire ?? { objets: [] }), objets, ...(monnaie ? { monnaie } : {}) } } });

/** Applique une demande d'inventaire si elle est permise et possible. Renvoie aussi un texte pour le MJ. */
export function avecInventaireDemande(c: Campagne, persoId: string, d: DemandeInventaire, R: SystemeRegles): { campagne: Campagne; texte: string | null } {
  const p = c.personnages.find((x) => x.id === persoId), droits = droitsInventaire(c);
  const rien = { campagne: c, texte: null };
  if (!p) return rien;
  const recalcul = (x: Campagne, id: string) => majPerso(x, id, (q) => avecStatsCalculees(q, R));
  if (d.faire === 'equiper') {
    const o = objetsDe(p).find((x) => x.id === d.objet);
    if (!droits.equiper || !o || !!o.equipe === !!d.equipe) return rien;
    const x = majPerso(c, persoId, (q) => avecInventaire(q, objetsDe(q).map((y) => (y.id === o.id ? { ...y, equipe: !!d.equipe } : y))));
    return { campagne: recalcul(x, persoId), texte: `${p.nom} ${d.equipe ? 's’équipe de' : 'retire'} ${o.nom}.` };
  }
  const dest = c.personnages.find((x) => x.id === d.a && x.sorte === 'pj' && x.id !== persoId);
  if (!droits.donner || !dest) return rien;
  if (d.faire === 'donner') {
    const o = objetsDe(p).find((x) => x.id === d.objet), n = Math.floor(Number(d.quantite));
    if (!o || !(n >= 1) || n > o.quantite) return rien;
    let x = majPerso(c, persoId, (q) => avecInventaire(q, objetsDe(q).flatMap((y) => (y.id !== o.id ? [y] : y.quantite - n > 0 ? [{ ...y, quantite: y.quantite - n }] : []))));
    const meme = objetsDe(dest).find((y) => (o.ref ? y.ref === o.ref : y.nom === o.nom) && !y.mj);
    x = majPerso(x, dest.id, (q) => avecInventaire(q, meme
      ? objetsDe(q).map((y) => (y.id === meme.id ? { ...y, quantite: y.quantite + n } : y))
      : [...objetsDe(q), { ...o, id: nouvelId('obj'), quantite: n, equipe: false }]));
    return { campagne: recalcul(recalcul(x, persoId), dest.id), texte: `${p.nom} donne ${n > 1 ? `${n} × ` : ''}${o.nom} à ${dest.nom}.` };
  }
  const montant = Math.floor(Number(d.montant)), avoir = p.fiche?.inventaire?.monnaie?.[d.piece] ?? 0;
  if (!(montant >= 1) || montant > avoir) return rien;
  let x = majPerso(c, persoId, (q) => avecInventaire(q, objetsDe(q), { ...(q.fiche?.inventaire?.monnaie ?? {}), [d.piece]: avoir - montant }));
  x = majPerso(x, dest.id, (q) => avecInventaire(q, objetsDe(q), { ...(q.fiche?.inventaire?.monnaie ?? {}), [d.piece]: (q.fiche?.inventaire?.monnaie?.[d.piece] ?? 0) + montant }));
  return { campagne: x, texte: `${p.nom} donne ${montant} ${d.piece} à ${dest.nom}.` };
}

/* ---------- journal du groupe ---------- */

/** Note commune à tous les joueurs (indices, PNJ rencontrés). `persoId` null : écrite par le MJ. */
export interface EntreeGroupe { id: string; auteur: string; persoId: string | null; texte: string; quand: string }
export const journalGroupe = (c: Campagne): EntreeGroupe[] => mod(c).groupe ?? [];
export function avecEntreeGroupe(c: Campagne, auteur: string, persoId: string | null, texte: string, quand = new Date().toISOString()): Campagne {
  const t = texte.trim().slice(0, 4000);
  if (!t) return c;
  return avecJoueurs(c, (m) => ({ ...m, groupe: [...journalGroupe(c), { id: nouvelId('grp'), auteur, persoId, texte: t, quand }] }));
}
/** Modifier (texte) ou effacer (null) une note : son auteur seulement, ou le MJ (`persoId` null). */
export function avecEntreeModifiee(c: Campagne, id: string, persoId: string | null, texte: string | null): Campagne {
  const e = journalGroupe(c).find((x) => x.id === id);
  if (!e || (persoId !== null && e.persoId !== persoId)) return c;
  const groupe = texte === null || !texte.trim() ? journalGroupe(c).filter((x) => x.id !== id) : journalGroupe(c).map((x) => (x.id === id ? { ...x, texte: texte.trim().slice(0, 4000) } : x));
  return avecJoueurs(c, (m) => ({ ...m, groupe }));
}

/* ---------- montée de niveau ---------- */

export interface DemandeNiveau { choix: ChoixNiveau; quand: string }
export const demandeNiveau = (c: Campagne, persoId: string): DemandeNiveau | null => distantsDe(c)[persoId]?.niveau ?? null;

/** Le joueur propose ses choix de niveau : gardés en attente si le personnage peut monter et les choix sont plausibles. */
export function avecDemandeNiveau(c: Campagne, persoId: string, choix: ChoixNiveau, R: SystemeRegles, quand = new Date().toISOString()): Campagne {
  const p = c.personnages.find((x) => x.id === persoId);
  if (!p || !aUneFiche(R) || !etatProgression(p, R).pret) return c;
  const classe = R.catalogue.classes.find((x) => x.id === choix?.classe);
  const somme = Object.values(choix.amelioration ?? {}).reduce((s, v) => s + Number(v), 0);
  if (!classe || !(choix.pv >= 1 && choix.pv <= 30) || somme > 2 || Object.values(choix.amelioration ?? {}).some((v) => !(Number(v) > 0))) return c;
  const propre: ChoixNiveau = { classe: classe.id, pv: Math.floor(choix.pv), ...(choix.sousClasse ? { sousClasse: String(choix.sousClasse) } : {}), ...(choix.amelioration ? { amelioration: choix.amelioration } : {}), ...(choix.don ? { don: String(choix.don).slice(0, 80) } : {}) };
  return avecDistant(c, persoId, (d) => ({ ...d, niveau: { choix: propre, quand } }));
}
/** Le MJ valide (le niveau est appliqué) ou refuse (la demande disparaît). */
export function trancherNiveau(c: Campagne, persoId: string, valider: boolean, R: SystemeRegles, quand = new Date().toISOString()): Campagne {
  const dem = demandeNiveau(c, persoId);
  if (!dem) return c;
  let x = avecDistant(c, persoId, (d) => ({ ...d, niveau: null }));
  if (valider && aUneFiche(R)) x = majPerso(x, persoId, (p) => appliquerNiveau(p, R, dem.choix, quand));
  return x;
}
