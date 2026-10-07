// Préparation de la prochaine séance : liste construite depuis la campagne (quêtes en cours, leurs rencontres,
// PNJ, cartes, documents à montrer, fêtes et pleines lunes proches, peuples hostiles) + points ajoutés par le MJ. Pur, testé.
import type { Campagne } from '../../noyau/contrat';
import { nouvelId } from '../../noyau/contrat';
import { fetesAVenir, reference, tempsDe } from '../chronologie';
import { estMontre } from '../documents';
import { niveauReputation, peuplesDeCampagne } from '../pays';

export interface PointPreparation {
  id: string;
  groupe: string;
  texte: string;
  detail?: string;
  /** Problème repéré automatiquement (portrait manquant, rencontre vide…). */
  alerte?: boolean;
  aller?: { page: string; cible?: string };
  perso?: boolean;
}

export interface EtatPreparation { coches: string[]; notes: { id: string; texte: string }[] }

export const etatPreparation = (c: Campagne): EtatPreparation => {
  const e = (c.modules?.journal as { preparation?: Partial<EtatPreparation> } | undefined)?.preparation;
  return { coches: e?.coches ?? [], notes: e?.notes ?? [] };
};

export const changerPreparation = (c: Campagne, f: (e: EtatPreparation) => EtatPreparation): Campagne =>
  ({ ...c, modules: { ...(c.modules ?? {}), journal: { ...(c.modules?.journal ?? {}), preparation: f(etatPreparation(c)) } } });

export const basculerCoche = (c: Campagne, id: string): Campagne =>
  changerPreparation(c, (e) => ({ ...e, coches: e.coches.includes(id) ? e.coches.filter((x) => x !== id) : [...e.coches, id] }));
export const ajouterNote = (c: Campagne, texte: string): Campagne =>
  changerPreparation(c, (e) => ({ ...e, notes: [...e.notes, { id: nouvelId('prep'), texte }] }));
export const retirerNote = (c: Campagne, id: string): Campagne =>
  changerPreparation(c, (e) => ({ ...e, notes: e.notes.filter((n) => n.id !== id), coches: e.coches.filter((x) => x !== id) }));
/** Après la séance : tout décocher, garder les notes non faites. */
export const reinitialiserPreparation = (c: Campagne): Campagne =>
  changerPreparation(c, (e) => ({ coches: [], notes: e.notes.filter((n) => !e.coches.includes(n.id)) }));

export function pointsPreparation(c: Campagne): PointPreparation[] {
  const p: PointPreparation[] = [];
  const quetes = c.quetes.filter((q) => q.statut === 'en-cours');
  const idsQuetes = new Set(quetes.map((q) => q.id));
  for (const q of quetes) {
    const etape = q.etapes?.[0];
    p.push({ id: `quete:${q.id}`, groupe: 'Quêtes en cours', texte: q.titre, detail: etape ? `Étape : ${etape.titre}` : q.resume?.slice(0, 90), aller: { page: 'journal', cible: q.id } });
  }
  const rencontres = c.rencontres.filter((r) => r.quete && idsQuetes.has(r.quete.id));
  for (const r of rencontres) {
    const vide = !r.table && !r.jetons.length;
    p.push({ id: `rencontre:${r.id}`, groupe: 'Rencontres', texte: r.nom, detail: vide ? 'Aucun jeton placé' : 'Prête sur la table de combat', alerte: vide, aller: { page: 'combat', cible: r.id } });
  }
  const persos = new Set(quetes.flatMap((q) => q.personnages.map((x) => x.id)));
  for (const r of rencontres) for (const j of r.jetons) persos.add(j.perso.id);
  for (const x of c.personnages.filter((y) => persos.has(y.id) && y.sorte !== 'pj')) {
    const manque = [!x.portrait && 'portrait', !(x.combat.stats as { niveau?: number }).niveau && 'stats'].filter(Boolean);
    p.push({ id: `personnage:${x.id}`, groupe: 'Personnages à jouer', texte: x.nom, detail: [x.role, manque.length ? `sans ${manque.join(' ni ')}` : ''].filter(Boolean).join(' · '), alerte: manque.length > 0, aller: { page: 'personnages', cible: x.id } });
  }
  const cartes = new Set([...quetes.flatMap((q) => q.lieux.map((l) => l.id)), ...rencontres.map((r) => r.carte?.id).filter((x): x is string => !!x)]);
  for (const k of c.cartes.filter((y) => cartes.has(y.id))) {
    p.push({ id: `carte:${k.id}`, groupe: 'Cartes', texte: k.nom, detail: k.brouillard?.actif ? 'Brouillard prêt' : 'Pas de brouillard', aller: { page: 'cartes', cible: k.id } });
  }
  for (const d of (c.documents ?? []).filter((y) => !estMontre(y) && y.lien && (idsQuetes.has(y.lien.id) || persos.has(y.lien.id)))) {
    p.push({ id: `document:${d.id}`, groupe: 'Documents à montrer', texte: d.titre, aller: { page: 'documents', cible: d.id } });
  }
  if (c.univers.length) {
    const r = reference(c), t = tempsDe(c);
    for (const f of fetesAVenir(t, r, 14)) {
      p.push({ id: `fete:${f.nom}:${f.date.an}`, groupe: 'Calendrier', texte: f.nom, detail: f.dans === 0 ? "aujourd'hui" : `dans ${f.dans} jour(s)`, aller: { page: 'chronologie' } });
    }
  }
  for (const x of peuplesDeCampagne(c).filter((y) => (y.civ.reputation ?? 0) <= -25)) {
    p.push({ id: `peuple:${x.univers.id}:${String(x.civ.cle)}`, groupe: 'Réputation', texte: `${x.civ.nom.replace(/^les /, '')} : ${niveauReputation(x.civ.reputation).libelle.toLowerCase()}`, detail: 'Peut se manifester pendant la séance', aller: { page: 'pays', cible: JSON.stringify({ univers: x.univers.id, cle: x.civ.cle }) } });
  }
  for (const n of etatPreparation(c).notes) p.push({ id: n.id, groupe: 'Mes points', texte: n.texte, perso: true });
  return p;
}
