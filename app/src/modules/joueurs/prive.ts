// Ce qui part sur l'écran d'un joueur (hors fichiers) et ce qu'on fait de ce qu'il renvoie (pur). Chaque clé
// correspond à un onglet de son écran (interface/EcranDistant, `ONGLETS_MODULES`).
import type { Campagne, Personnage } from '../../noyau/contrat';
import { sansSecrets } from '../../noyau/contrat';
import { aUneFiche, type ModeJet, type SystemeRegles } from '../../noyau/regles';
import { profilDe } from '../magie';
import { etatProgression, type ChoixNiveau } from '../personnages';
import {
  avecDemandeNiveau, avecEntreeGroupe, avecEntreeModifiee, avecInventaireDemande, demandeNiveau, demandesJet, formuleDuJoueur,
  inventaireDuJoueur, jetsDeLaFiche, journalGroupe, retirerDemandeJet, type DemandeInventaire,
} from './actions';
import {
  ajouterMessage, avecEntrainementRecu, avecNotesJoueur, avecTalentDemande, droitsEntrainement, entrainementActif, notesJoueur, talentsDuJoueur,
} from './logique';

/** Données privées d'un joueur, sauf sa fiche imprimable et ses messages (qui portent des fichiers). */
export function donneesDuJoueur(c: Campagne, p: Personnage, R: SystemeRegles) {
  const fiche = aUneFiche(R);
  const demandes = demandesJet(c, p.id).map(({ dd: _dd, ...d }) => d); // le DD reste chez le MJ
  const derniere = demandes[demandes.length - 1];
  return {
    persoId: p.id,
    entrainement: entrainementActif(c, p) ? { profil: profilDe(p), droits: droitsEntrainement(c) } : null,
    talents: talentsDuJoueur(c, p, R),
    des: { jets: jetsDeLaFiche(p, R), demandes, nom: p.nom },
    inventaire: fiche ? inventaireDuJoueur(c, p, R) : null,
    groupe: { entrees: journalGroupe(c), moi: p.id },
    niveau: fiche && (etatProgression(p, R).pret || demandeNiveau(c, p.id))
      ? { perso: sansSecrets({ ...p, mj: undefined, relations: undefined }), regles: c.campagne.regles, attente: demandeNiveau(c, p.id) }
      : null,
    // Alerte sur son écran (son, bandeau) : le dernier jet demandé par le MJ.
    alerte: derniere ? { id: derniere.id, texte: `Le maître du jeu te demande un jet : ${derniere.libelle}` } : null,
    badges: { des: demandes.length, niveau: demandeNiveau(c, p.id) ? 0 : fiche && etatProgression(p, R).pret ? 1 : 0 },
  };
}

/** Jet à lancer par le MJ pour le joueur (il roule en 3D chez tout le monde). */
export interface JetALancer { formule: string; mode: ModeJet; libelle: string; dd: number | null }

/**
 * Ce que l'écran du joueur renvoie : appliqué à la campagne dans les limites permises. Renvoie la campagne, les
 * messages pour le MJ et, pour un jet, ce qu'il faut lancer.
 */
export function traiterRetour(c: Campagne, p: Personnage, d: Record<string, unknown>, R: SystemeRegles): { campagne: Campagne; textes: string[]; jet: JetALancer | null } {
  let x = c, jet: JetALancer | null = null;
  const textes: string[] = [], qui = p.joueur || p.nom;
  const t = d.talents as { faire?: unknown; id?: unknown } | undefined;
  if (t && typeof t.id === 'string') {
    const y = avecTalentDemande(x, p.id, t, R);
    if (y !== x) textes.push(`${qui} ${t.faire === 'retirer' ? 'oublie' : 'apprend'} un talent depuis son écran.`);
    x = y;
  }
  const e = d.entrainement as { profil?: Record<string, unknown> } | undefined;
  if (e?.profil && typeof e.profil === 'object') x = avecEntrainementRecu(x, p.id, e.profil);
  if (typeof d.notes === 'string' && notesJoueur(p) !== d.notes) x = avecNotesJoueur(x, p.id, d.notes);
  if (typeof d.message === 'string' && d.message.trim()) {
    const texte = d.message.trim().slice(0, 4000);
    x = ajouterMessage(x, p.id, texte, null, undefined, 'joueur');
    textes.push(`✉ ${qui} : ${texte.length > 90 ? `${texte.slice(0, 90)}…` : texte}`);
  }
  const de = d.des as { cle?: unknown; formule?: unknown; mode?: unknown; demande?: unknown } | undefined;
  if (de) {
    const f = formuleDuJoueur(p, R, de);
    const mode: ModeJet = de.mode === 'avantage' || de.mode === 'desavantage' ? de.mode : 'normal';
    if (f) {
      let dd: number | null = null;
      if (typeof de.demande === 'string') { const r = retirerDemandeJet(x, p.id, de.demande); x = r.campagne; dd = r.demande?.dd ?? null; }
      jet = { formule: f.formule, mode, libelle: f.libelle, dd };
    }
  }
  const inv = d.inventaire as DemandeInventaire | undefined;
  if (inv && typeof inv.faire === 'string') {
    const r = avecInventaireDemande(x, p.id, inv, R);
    x = r.campagne;
    if (r.texte) textes.push(r.texte);
  }
  const g = d.groupe as { ajouter?: unknown; id?: unknown; texte?: unknown } | undefined;
  if (g && typeof g.ajouter === 'string') x = avecEntreeGroupe(x, qui, p.id, g.ajouter);
  else if (g && typeof g.id === 'string') x = avecEntreeModifiee(x, g.id, p.id, typeof g.texte === 'string' ? g.texte : null);
  const n = d.niveau as { choix?: ChoixNiveau } | undefined;
  if (n?.choix) {
    const y = avecDemandeNiveau(x, p.id, n.choix, R);
    if (y !== x) textes.push(`${qui} propose sa montée de niveau : à valider dans la page Joueurs.`);
    x = y;
  }
  return { campagne: x, textes, jet };
}
