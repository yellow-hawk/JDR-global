// Zone d'entraînement des joueurs (pur, testé) : le joueur s'exerce sur son écran (tracé libre, leçons, défis sur
// les sorts de son grimoire, calibrage de sa main). Ce qu'il renvoie n'est gardé que dans les limites fixées par le
// MJ : records et calibrage toujours ; signes appris par les leçons et grimoire seulement si le MJ l'autorise.
import { LECONS } from './atelier/data/lecons';
import { SIGNE } from './atelier/data/signes';
import { peutInscrire, type ProfilPJ, type ResultatDefi } from './atelier/engine/profils';

export interface DroitsEntrainement {
  /** Réussir une leçon apprend son signe au personnage. */
  lecons: boolean;
  /** Le joueur peut inscrire ou retirer des sorts de son grimoire. */
  grimoire: boolean;
}
export const DROITS_PAR_DEFAUT: DroitsEntrainement = { lecons: true, grimoire: false };

/** Ce que l'écran du joueur reçoit pour s'entraîner. */
export interface DonneesEntrainement { profil: ProfilPJ; droits: DroitsEntrainement }

const MAX_EXEMPLES = 5;
const meilleur = (a: ResultatDefi | undefined, b: ResultatDefi): ResultatDefi =>
  !a || b.score > a.score || (b.score === a.score && b.temps < a.temps) ? b : a;

/** Profil gardé par le MJ à partir de celui que renvoie l'écran du joueur. */
export function appliquerEntrainement(actuel: ProfilPJ, recu: Partial<ProfilPJ>, droits: DroitsEntrainement): ProfilPJ {
  // Calibrage de la main : seulement des signes qui existent, au plus 5 exemples chacun.
  const calibrage: ProfilPJ['calibrage'] = {};
  for (const [id, ex] of Object.entries(recu.calibrage ?? actuel.calibrage)) {
    if (SIGNE[id] && Array.isArray(ex)) calibrage[id] = ex.slice(0, MAX_EXEMPLES);
  }
  // Records : le meilleur des deux.
  const defis = { ...actuel.defis };
  for (const [k, r] of Object.entries(recu.defis ?? {})) {
    if (r && typeof r.score === 'number' && typeof r.temps === 'number') defis[k] = meilleur(defis[k], { score: Math.max(0, Math.min(100, r.score)), temps: r.temps, date: r.date ?? 0 });
  }
  let { lecons, signes, grimoire } = actuel;
  if (droits.lecons) {
    // Leçons réussies de son rang ; chacune apprend son signe (jamais un signe venu d'ailleurs).
    const nouvelles = (recu.lecons ?? []).filter((id) => !lecons.includes(id) && LECONS.some((l) => l.id === id && l.rang <= actuel.rang));
    lecons = [...lecons, ...nouvelles];
    const appris = nouvelles.map((id) => LECONS.find((l) => l.id === id)!.apprend).filter((s): s is string => !!s && !signes.includes(s));
    signes = [...signes, ...new Set(appris)];
  }
  if (droits.grimoire && Array.isArray(recu.grimoire)) {
    // Sorts gardés ou retirés librement ; un nouveau sort doit n'utiliser que des signes connus, dans les emplacements.
    const res: ProfilPJ['grimoire'] = [];
    for (const s of recu.grimoire) {
      if (res.length >= actuel.emplacements) break;
      const ancien = actuel.grimoire.find((x) => x.id === s.id);
      if (ancien) res.push(ancien);
      else if (s?.sceau && peutInscrire({ ...actuel, signes, grimoire: res }, s.sceau).ok) res.push({ id: String(s.id), nom: String(s.nom ?? 'Sort'), notes: String(s.notes ?? ''), sceau: s.sceau, cree: s.cree ?? Date.now() });
    }
    grimoire = res;
  }
  return { ...actuel, calibrage, defis, lecons, signes, grimoire };
}
