// Installation complète d'un monde de l'Atlas dans la campagne, étape par étape, avec progression.
// Univers par défaut → quêtes → PNJ (apparence auto) → toutes les cartes → cartes de bataille + rencontres.
// Les portraits 3D des PNJ sont faits ensuite par la fabrique du module Avatar (composant React).
import type { Campagne } from '../../../noyau/contrat';
import { nouvelId } from '../../../noyau/contrat';
import { regles } from '../../../noyau/regles';
import { faireInstantane, supprimerFichier } from '../../../noyau/stockage';
import { apparenceAuto } from '../../avatar';
import { donnerSortsAuxPnj, integrerGrimoireDeBase } from '../../magie';
import { choisirCarte, enregistrerImageCarte, genererPlan, imagePlan, libelleChoix, PX_CASE, rectanglesTerrain } from '../../cartes';
import { packsDeLaCampagne, tableDepuisPlan } from '../../combat';
import { importerQuetesAtlas } from '../../journal';
import { enregistrerUnivers, importerPnj } from '../logique';
import { demander, type EtatAtlas, type PnjAtlas } from '../pont';
import { adversairesPour, carteBataille, integrerBataille, lieuxDeBataille, pjDeLaCampagne, type QueteAtlasDetail } from './batailles';
import { carteAtlas, integrerCarte, relierCartes, type EntreeCarteAtlas, type RepereAtlas } from './cartes';
import { integrerCivilisations, type CivilisationsAtlas } from './civilisations';

export type Etape = 'univers' | 'quetes' | 'pnj' | 'cartes' | 'batailles' | 'avatars';
export const ETAPES: [Etape, string][] = [
  ['univers', 'Monde par défaut, peuples et calendriers'], ['quetes', 'Quêtes (Journal)'], ['pnj', 'PNJ (Personnages)'],
  ['cartes', 'Cartes de l’Atlas (Cartes)'], ['batailles', 'Cartes de bataille et rencontres'], ['avatars', 'Avatars et portraits des PNJ'],
];
export interface Progression { etape: Etape; fait: number; total: number; texte: string }

export interface Dependances {
  cadre: HTMLIFrameElement;
  lire: () => Campagne;
  modifier: (f: (c: Campagne) => Campagne) => void;
  progres: (p: Progression) => void;
  annule: () => boolean;
}

const pause = () => new Promise((ok) => window.setTimeout(ok, 0));
const memeCiel = (a: Record<string, unknown> | undefined, b: EtatAtlas['entry']) =>
  !!a && JSON.stringify((a as { params?: unknown }).params) === JSON.stringify(b.params);

/** Renvoie l'id de l'univers et la liste des PNJ à photographier. */
export async function installerMonde(d: Dependances): Promise<{ univ: string; portraits: string[] }> {
  const { cadre, modifier, progres } = d;
  const idC = d.lire().campagne.id;
  // Instantané de sécurité : l'installation touche beaucoup de choses d'un coup.
  await faireInstantane(d.lire(), 'avant installation du monde').catch(() => undefined);

  // 1. Univers + monde par défaut
  progres({ etape: 'univers', fait: 0, total: 1, texte: 'Lecture du ciel affiché…' });
  const etat = await demander<EtatAtlas>(cadre, 'atlas:demander');
  const exist = d.lire().univers.find((u) => u.sorte === 'genere' && memeCiel(u.atlas, etat.entry));
  let univ = '';
  modifier((x) => {
    const r = enregistrerUnivers(x, etat, exist?.id ?? null); univ = r.id;
    return { ...r.campagne, campagne: { ...r.campagne.campagne, univers: { type: 'univers', id: r.id } } };
  });
  await pause();
  // Peuples et pays détaillés (fiches pays, organigrammes, généalogies).
  const civ = await demander<CivilisationsAtlas>(cadre, 'atlas:civilisations');
  modifier((x) => integrerCivilisations(x, univ, civ));
  await pause();
  progres({ etape: 'univers', fait: 1, total: 1, texte: etat.monde.nom || etat.entry.name });

  // 2. Quêtes
  const { quetes } = await demander<{ quetes: QueteAtlasDetail[] }>(cadre, 'atlas:quetes-donnees');
  modifier((x) => importerQuetesAtlas(x, quetes, univ).campagne);
  progres({ etape: 'quetes', fait: quetes.length, total: quetes.length, texte: `${quetes.length} quête(s)` });

  // 3. PNJ + apparence automatique (tirée de la description)
  const { pnj } = await demander<{ pnj: (PnjAtlas & { feminin?: boolean })[] }>(cadre, 'atlas:pnj');
  modifier((x) => {
    const r = importerPnj(x, pnj, regles(x.campagne.regles)).campagne;
    const parNom = new Map(pnj.map((n) => [n.nom.toLowerCase(), n]));
    return { ...r, personnages: r.personnages.map((p) => {
      const n = parNom.get(p.nom.toLowerCase());
      if (!n) return p;
      let q = p;
      if (!q.apparence) q = { ...q, apparence: apparenceAuto({ nom: q.nom, apparence: n.apparence, feminin: n.feminin, peuple: n.peuple, role: n.role, peupleNom: n.peupleNom }) };
      // PNJ importés avant les stats par rôle : on leur donne des stats cohérentes (une seule fois).
      if (q.combat.stats.niveau === undefined) {
        const R = regles(x.campagne.regles);
        q = { ...q, role: q.role ?? n.role, combat: { ...q.combat, stats: R.statsPourProfil({ role: n.role, description: `${n.apparence}. ${n.humeur}.`, sorte: q.sorte, antagoniste: n.antagoniste, graine: `${n.nom}|${n.peuple}` }) } };
      }
      return q;
    }) };
  });
  modifier((x) => donnerSortsAuxPnj(integrerGrimoireDeBase(x)));
  await pause();
  progres({ etape: 'pnj', fait: pnj.length, total: pnj.length, texte: `${pnj.length} PNJ` });

  // 4. Toutes les cartes de l'Atlas
  const { cartes: plan } = await demander<{ cartes: EntreeCarteAtlas[] }>(cadre, 'atlas:cartes-plan');
  const reperesRendus: Record<string, RepereAtlas[]> = {};
  for (const [i, e] of plan.entries()) {
    if (d.annule()) break;
    progres({ etape: 'cartes', fait: i, total: plan.length, texte: e.nom });
    const k = carteAtlas(d.lire(), univ, e.cle);
    if (k?.images.joueurs) continue; // déjà là : on ne redessine pas
    const r = await demander<{ image: Blob; imageMj?: Blob; reperes?: RepereAtlas[] }>(cadre, 'atlas:carte', { cle: e.cle });
    const j = await enregistrerImageCarte(idC, r.image, `${e.nom}.jpg`);
    const m = r.imageMj ? (await enregistrerImageCarte(idC, r.imageMj, `${e.nom} (MJ).jpg`)).fichier : null;
    if (r.reperes) reperesRendus[e.cle] = r.reperes;
    let liberes: string[] = [];
    modifier((x) => { const res = integrerCarte(x, univ, e, j.fichier, j.taille, m); liberes = res.liberes; return res.campagne; });
    await pause();
    liberes.forEach((f) => void supprimerFichier(idC, f));
  }
  modifier((x) => relierCartes(x, univ, plan, reperesRendus));
  await pause();
  progres({ etape: 'cartes', fait: plan.length, total: plan.length, texte: `${plan.length} carte(s)` });

  // 5. Cartes de bataille + rencontres prêtes
  const lieux = lieuxDeBataille(quetes);
  const graine = String((etat.entry.params as { seed?: string } | undefined)?.seed ?? etat.entry.name);
  for (const [i, b] of lieux.entries()) {
    if (d.annule()) break;
    progres({ etape: 'batailles', fait: i, total: lieux.length, texte: b.lieu.nom });
    if (carteBataille(d.lire(), univ, b.cle)) continue;
    const choix = choisirCarte(b.lieu);
    const p = genererPlan(choix, b.lieu.nom, `${graine}|${b.cle}`);
    const j = await enregistrerImageCarte(idC, await imagePlan(p, false), `${b.lieu.nom} - bataille.jpg`);
    const m = await enregistrerImageCarte(idC, await imagePlan(p, true), `${b.lieu.nom} - bataille (MJ).jpg`);
    const idCarte = nouvelId('carte');
    modifier((x) => {
      const R = regles(x.campagne.regles);
      const table = tableDepuisPlan({ carte: idCarte, pxCase: PX_CASE, rects: rectanglesTerrain(p), depart: p.depart, ennemis: p.ennemis, pj: pjDeLaCampagne(x, R), adversaires: adversairesPour(x, b, R), packs: packsDeLaCampagne(x) });
      return integrerBataille(x, { univ, idCarte, b, libelle: libelleChoix(choix), theme: choix.theme, joueurs: j.fichier, mj: m.fichier, taille: j.taille, pxCase: PX_CASE, table: table as unknown as Record<string, unknown> });
    });
    await pause();
  }
  progres({ etape: 'batailles', fait: lieux.length, total: lieux.length, texte: `${lieux.length} lieu(x)` });

  // 6. PNJ à photographier (apparence automatique, sans portrait)
  const portraits = d.lire().personnages.filter((p) => p.sorte !== 'pj' && !p.portrait && (p.apparence as { auto?: boolean } | null)?.auto).map((p) => p.id);
  return { univ, portraits };
}
