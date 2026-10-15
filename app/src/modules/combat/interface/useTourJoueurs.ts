// Tour des joueurs (côté MJ) : la table part sur l'écran joueurs comme vue interactive (« table »), avec les actions
// possibles du PJ actif d'après sa fiche. Les demandes des joueurs reviennent ici : le MJ vérifie qui demande (lien
// personnel ou tablette), puis joue l'action sur la table (annulable par Ctrl+Z). Un sceau tracé est lu ici, devient
// un sort de la table, et son effet 3D est montré à tous.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ecouterJoueurs, montrerAuxJoueurs } from '../../../noyau/bus';
import { nouvelId, type Campagne } from '../../../noyau/contrat';
import { aUneFiche, type SystemeRegles } from '../../../noyau/regles';
import { effetDe, lireTracePartage, profilDe } from '../../magie';
import { distantsDe, persoDuJeton } from '../../joueurs';
import { gabarit } from '../logique';
import { ajouterSort, centre, deplacer, jetonActif, jouerAction, lancerSort, modifierJeton, TERRAINS, tourSuivant, zoneDeSort } from '../moteur';
import { capacitesCombat, synchroniserJeton } from '../capacites';
import { emettreParticules, imageEtCamera, jetonVisible, type Fond } from '../rendu';
import { analyseDeSceau } from '../sorts';
import { attaqueAvecArme, attaquesDuJeton, estDemandeTour, idTour, optionsTour, refus, type EffetTour, type TraceTour, type VueTable } from '../tour';
import { SONS } from './sons';
import type { Controleur } from './types';

/** Réglages (modules.combat) : les joueurs jouent leur tour sur leur écran ; temps du tracé d'un sceau (s). */
export function reglagesTour(c: Campagne): { actif: boolean; dureeTrace: number } {
  const m = (c.modules?.combat ?? {}) as { tourJoueurs?: boolean; dureeTrace?: number };
  return { actif: m.tourJoueurs !== false, dureeTrace: m.dureeTrace ?? 30 };
}

export interface TraceEnCours { demande: TraceTour; tour: string; persoId: string; nom: string; traits: unknown[]; fini: boolean }

export function useTourJoueurs(ctl: Controleur, c: Campagne, R: SystemeRegles, fond: Fond | null, portraits: Map<number, CanvasImageSource>, diffusion: boolean) {
  const reglages = reglagesTour(c);
  const [trace, setTrace] = useState<TraceEnCours | null>(null);
  const [viser, setViser] = useState<{ tour: string; sort: number } | null>(null);
  const [evenement, setEvenement] = useState<string | null>(null);
  const [effet, setEffet] = useState<EffetTour | null>(null);
  const [reponse, setReponse] = useState<{ n: number; texte: string | null } | null>(null);
  const e = ctl.etat;
  const demandeTrace = trace && !trace.fini ? trace.demande : null;

  const options = useMemo(() => {
    const j = jetonActif(e);
    const p = j?.persoId ? c.personnages.find((x) => x.id === j.persoId) : undefined;
    if (!reglages.actif || !j || !p) return null;
    const fiche = aUneFiche(R) && p.fiche ? R.calculer(p).attaques : null;
    const id = idTour(e);
    const cap = capacitesCombat(p, R);
    return optionsTour(e, {
      attaques: attaquesDuJeton(j, fiche), tablette: !distantsDe(c)[p.id], peutTracer: cap.profil.magie, actions: cap.actions, magie: cap.profil.magie,
      trace: demandeTrace && trace?.tour === id ? demandeTrace : null, viser: viser?.tour === id ? viser.sort : null,
    });
  }, [e, c, R, reglages.actif, demandeTrace, viser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nouveau tour : on oublie l'évènement, la visée et le tracé du tour d'avant.
  const tourCourant = idTour(e);
  useEffect(() => { setViser(null); setTrace((t) => (t && t.tour !== tourCourant ? null : t)); }, [tourCourant]);
  // Début du tour d'un personnage : son jeton reprend les valeurs de sa fiche (niveau, talents, dons, objets).
  useEffect(() => {
    const j = jetonActif(e), p = j?.persoId ? c.personnages.find((x) => x.id === j.persoId) : undefined;
    if (!j || !p || ctl.lectureSeule) return;
    const s = synchroniserJeton(j, p, R);
    if (JSON.stringify(s) !== JSON.stringify(j)) ctl.faire((y) => modifierJeton(y, j.id, () => s), true);
  }, [tourCourant]); // eslint-disable-line react-hooks/exhaustive-deps

  // Diffusion : image de la table + tour en cours, renvoyée à chaque changement (regroupé toutes les 0,4 s).
  const traceur = trace && !trace.fini ? trace.nom : null;
  useEffect(() => {
    if (!diffusion) return;
    let annule = false;
    const t = window.setTimeout(() => {
      imageEtCamera(e, TERRAINS, fond, portraits).then(({ image, camera, largeur, hauteur }) => {
        if (annule) return;
        const j = jetonActif(e);
        const vue: VueTable = {
          image, camera, largeur, hauteur, grille: e.grille, round: e.combat.round,
          actif: j && jetonVisible(e, j, 'joueurs') ? { nom: j.nom, camp: j.camp } : null,
          ordre: e.combat.ordre.map((id) => e.jetons.find((x) => x.id === id)).filter((x) => x && jetonVisible(e, x, 'joueurs')).map((x) => x!.nom),
          options, evenement, effet, traceur, reponse,
        };
        montrerAuxJoueurs({ sorte: 'module', module: 'combat', vue: 'table', titre: 'Combat', donnees: vue as unknown as Record<string, unknown> }, 'combat');
      }).catch(() => { /* rendu impossible : on réessaiera au prochain changement */ });
    }, 400);
    return () => { annule = true; window.clearTimeout(t); };
  }, [diffusion, e, fond, portraits, options, evenement, effet, traceur, reponse]);

  // Demandes des joueurs.
  const dernier = useRef({ ctl, c, R, options, trace, reglages });
  dernier.current = { ctl, c, R, options, trace, reglages };
  useEffect(() => ecouterJoueurs((module, d, jeton) => {
    if (module !== 'combat' || !estDemandeTour(d)) return;
    const { ctl: k, c: x, R: regl, options: o, trace: tr, reglages: rg } = dernier.current;
    const repondre = (texte: string | null) => setReponse((r) => ({ n: (r?.n ?? 0) + 1, texte }));
    const perso = jeton ? persoDuJeton(x, jeton)?.id ?? '?' : null;
    const non = refus(o, d, perso);
    if (non) { if (d.faire !== 'visee' && d.faire !== 'trace') repondre(non); return; }
    const etat = k.etat, j = etat.jetons.find((y) => y.id === o!.jeton.id)!;
    const p = x.personnages.find((y) => y.id === o!.persoId);

    if (d.faire === 'visee') {
      k.regler({ viseeJoueurs: d.sort != null ? { sorte: 'sort', sortId: d.sort, lanceur: j.id, cellule: d.cellule, angle: d.angle } : { sorte: 'deplacement', jeton: j.id, cellule: d.cellule } });
      return;
    }
    k.regler({ viseeJoueurs: null });
    if (d.faire === 'deplacer') {
      const r = deplacer(etat, j.id, [j.x, j.y], d.cellule);
      if (r.ok) { k.faire(() => r.etat); repondre(null); } else repondre(r.raison ?? 'Déplacement impossible.');
    } else if (d.faire === 'attaquer') {
      const a = o!.attaques[d.attaque], cible = etat.jetons.find((y) => y.id === d.cible);
      const r = attaqueAvecArme(etat, j.id, a, d.cible, Math.random);
      if (r.erreur || !r.resultat || !cible) { repondre(r.erreur ?? 'Attaque impossible.'); return; }
      k.faire(() => r.etat);
      const s = r.resultat;
      if (k.ui.sons) (s.touche ? SONS.coup : SONS.rate)();
      const txt = `${j.nom} attaque ${cible.nom} (${a.nom}) : ${s.echec ? 'échec critique' : s.critique ? `coup critique ! ${s.degats} dégâts` : s.touche ? `touché, ${s.degats} dégâts` : 'raté'}`;
      setEvenement(txt); repondre(txt);
    } else if (d.faire === 'sort') {
      const sp = etat.sorts.find((y) => y.id === d.sort)!;
      const zone = zoneDeSort(sp, j, d.cellule, d.angle);
      const r = lancerSort(etat, sp.id, j.id, zone, Math.random);
      if (r.erreur) { repondre(r.erreur); return; }
      k.faire(() => r.etat);
      if (sp.particule) { const [px, py] = centre(etat.grille, [zone.x, zone.y]); emettreParticules(k.particules, px, py, sp.particule, 40); }
      if (k.ui.sons) SONS.sort();
      const txt = `${j.nom} lance ${sp.nom} : ${r.cibles?.length ? r.cibles.join(', ') : 'aucune cible'}`;
      setEvenement(txt); setViser(null); repondre(txt);
    } else if (d.faire === 'agir') {
      const r = jouerAction(etat, j.id, d.action, d.cible, Math.random);
      if (r.erreur) { repondre(r.erreur); return; }
      k.faire(() => r.etat);
      if (k.ui.sons) SONS.sort();
      const txt = `${j.nom} — ${r.texte}`;
      setEvenement(txt); repondre(txt);
    } else if (d.faire === 'tracer') {
      const demande: TraceTour = { id: nouvelId('trace'), titre: `Sceau de ${j.nom}`, duree: rg.dureeTrace, guide: true };
      setTrace({ demande, tour: o!.id, persoId: o!.persoId, nom: j.nom, traits: [], fini: false });
      repondre(null);
    } else if (d.faire === 'trace') {
      if (!tr || tr.fini || d.id !== tr.demande.id) return;
      if (!d.fini) { setTrace({ ...tr, traits: d.traits }); return; }
      setTrace({ ...tr, traits: d.traits, fini: true });
      // Lecture du sceau avec les signes que connaît ce personnage.
      const lu = d.traits.length ? lireTracePartage(d.traits as Parameters<typeof lireTracePartage>[0], p ? profilDe(p) : null) : null;
      const an = lu?.lecture.sceau.coeur ? analyseDeSceau(lu.analyse.nomSuggere, lu.lecture.sceau) : null;
      if (!lu || !an) { const txt = `Le sceau de ${j.nom} reste inerte (aucun Cœur reconnu).`; setEvenement(txt); repondre(txt); return; }
      const g = { ...gabarit(an, regl), lanceurs: [o!.persoId] };
      const id = Math.max(99, ...etat.sorts.map((y) => y.id)) + 1; // même numérotation que ajouterSort
      k.faire((y) => ajouterSort(y, g));
      setViser({ tour: o!.id, sort: id });
      setEffet({ ...(effetDe(d.traits as Parameters<typeof effetDe>[0], lu.lecture, lu.analyse) as unknown as Record<string, unknown>), id: nouvelId('effet') });
      const txt = `${j.nom} trace ${lu.analyse.nomSuggere}${lu.inconnus.length ? ` (signes inconnus sans effet : ${lu.inconnus.join(', ')})` : ''}`;
      setEvenement(txt); repondre(`${txt}. Vise-le maintenant sur la table.`);
    } else if (d.faire === 'finir') {
      k.faire((y) => tourSuivant(y));
      setEvenement(null); repondre(null);
    }
  }), []);

  // L'effet 3D reste quelques secondes sur les écrans, puis la table revient.
  useEffect(() => {
    if (!effet) return;
    const t = window.setTimeout(() => setEffet(null), 14000);
    return () => window.clearTimeout(t);
  }, [effet]);

  return { trace, annulerTrace: () => setTrace(null), options };
}
