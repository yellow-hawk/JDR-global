// Côté MJ, toujours actif quand une campagne est ouverte (en-tête) : salons privés des joueurs à distance, envoi de
// tout ce qui leur est propre (fiche, messages, talents, dés, sac, groupe, niveau…) et traitement de ce qu'ils
// renvoient (`prive.ts`). Petit indicateur : joueurs connectés, messages à lire, niveaux à valider.
import { useEffect, useRef, useState } from 'react';
import { annoncerJet, definirJoueursPrives, ecouterJoueurs, emettre, envoyerPrive, surArriveeJoueur, suivreJoueursConnectes } from '../../noyau/bus';
import { jeter, regles } from '../../noyau/regles';
import { lireFichier } from '../../noyau/stockage';
import { useCampagne } from '../../interface/etat';
import { assurerSalon } from '../../interface/Tablettes';
import { demandeNiveau, journalGroupe } from './actions';
import { distantsDe, droitsEntrainement, droitsTalents, ficheDuJoueur, nonLusMj, notesJoueur, persoDuJeton } from './logique';
import { donneesDuJoueur, traiterRetour } from './prive';
import { noterEcran } from './ecrans';

export function Synchro() {
  const { campagne, modifier } = useCampagne();
  const [connectes, setConnectes] = useState<Set<string>>(new Set());
  const c = useRef(campagne); c.current = campagne;
  const distants = campagne ? distantsDe(campagne) : {};
  const pjs = campagne?.personnages.filter((p) => p.sorte === 'pj' && distants[p.id]) ?? [];
  const jetons = pjs.map((p) => distants[p.id].jeton);

  // Salons privés suivis : un par PJ qui a un lien ; le salon commun s'ouvre si besoin.
  useEffect(() => {
    definirJoueursPrives(jetons);
    if (jetons.length) void assurerSalon();
  }, [jetons.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => suivreJoueursConnectes(setConnectes), []);

  /** Envoie à un joueur sa fiche (et son portrait) et ses messages (avec leurs images). */
  const envoyer = async (jeton: string) => {
    const x = c.current;
    if (!x) return;
    const p = persoDuJeton(x, jeton);
    if (!p) return;
    const lire = async (id?: string | null) => (id ? (await lireFichier(x.campagne.id, id)) ?? null : null);
    const fiche = { ...ficheDuJoueur(p, regles(x.campagne.regles)), notes: notesJoueur(p), portrait: await lire(p.portrait) };
    const messages = await Promise.all((distantsDe(x)[p.id]?.messages ?? []).map(async (m) => ({ ...m, image: await lire(m.image) })));
    envoyerPrive(jeton, { ...donneesDuJoueur(x, p, regles(x.campagne.regles)), fiche, messages });
  };

  useEffect(() => surArriveeJoueur((j, nouveau) => {
    void envoyer(j);
    const p = c.current && persoDuJeton(c.current, j);
    if (p && nouveau) emettre('message', { texte: `${p.joueur || p.nom} a rejoint la partie à distance.`, sorte: 'info' });
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fiche ou messages changés : renvoyés aux joueurs connectés concernés (regroupé toutes les 0,6 s).
  const signature = pjs.map((p) => JSON.stringify([p, distants[p.id]])).join('|') + JSON.stringify(campagne ? [droitsEntrainement(campagne), droitsTalents(campagne), campagne.modules?.joueurs?.inventaire, journalGroupe(campagne)] : null);
  useEffect(() => {
    const t = window.setTimeout(() => { for (const j of jetons) if (connectes.has(j)) void envoyer(j); }, 600);
    return () => window.clearTimeout(t);
  }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ce que renvoie un joueur (notes, message, talent, jet, sac, groupe, niveau) : appliqué dans les limites permises.
  useEffect(() => ecouterJoueurs((module, d, jeton) => {
    if (module !== 'joueurs' || !jeton) return;
    const x = c.current, p = x && persoDuJeton(x, jeton);
    if (!p) return;
    if (d.ecran) { noterEcran(p.id, d.ecran); if (Object.keys(d).length === 1) return; }
    const R = regles(x.campagne.regles);
    const r = traiterRetour(x, p, d, R);
    if (r.campagne !== x) { c.current = r.campagne; modifier(() => r.campagne); }
    r.textes.forEach((texte) => emettre('message', { texte, sorte: 'info' }));
    if (r.jet) {
      const j = { ...jeter(r.jet.formule, r.jet.mode, Math.random, `${p.nom} · ${r.jet.libelle}`), joueur: true, libelle: r.jet.libelle, dd: r.jet.dd };
      annoncerJet(j);
    }
  }), [modifier]);

  if (!pjs.length) return null;
  const n = jetons.filter((j) => connectes.has(j)).length;
  const nonLus = pjs.reduce((s, p) => s + nonLusMj(distants[p.id]), 0);
  const niveaux = pjs.filter((p) => campagne && demandeNiveau(campagne, p.id)).length;
  return (
    <button className="btn btn-petit" title={nonLus ? `${nonLus} message(s) de joueurs à lire` : 'Joueurs à distance connectés'} onClick={() => emettre('naviguer', { page: 'joueurs' })}>
      🌐 {n}/{pjs.length}{nonLus ? <b className="joueurs-badge">✉ {nonLus}</b> : null}{niveaux ? <b className="joueurs-badge">⬆ {niveaux}</b> : null}
    </button>
  );
}
