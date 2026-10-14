// Côté MJ, toujours actif quand une campagne est ouverte (en-tête) : salons privés des joueurs à distance, envoi de
// leur fiche (en direct) et de leurs messages, réception de leurs notes. Petit indicateur : joueurs connectés.
import { useEffect, useRef, useState } from 'react';
import { definirJoueursPrives, ecouterJoueurs, emettre, envoyerPrive, surArriveeJoueur, suivreJoueursConnectes } from '../../noyau/bus';
import { regles } from '../../noyau/regles';
import { lireFichier } from '../../noyau/stockage';
import { useCampagne } from '../../interface/etat';
import { assurerSalon } from '../../interface/Tablettes';
import { avecNotesJoueur, distantsDe, ficheDuJoueur, notesJoueur, persoDuJeton } from './logique';

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
    envoyerPrive(jeton, { fiche, messages });
  };

  useEffect(() => surArriveeJoueur((j) => {
    void envoyer(j);
    const p = c.current && persoDuJeton(c.current, j);
    if (p) emettre('message', { texte: `${p.joueur || p.nom} a rejoint la partie à distance.`, sorte: 'info' });
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fiche ou messages changés : renvoyés aux joueurs connectés concernés (regroupé toutes les 0,6 s).
  const signature = pjs.map((p) => JSON.stringify([p, distants[p.id].messages.length])).join('|');
  useEffect(() => {
    const t = window.setTimeout(() => { for (const j of jetons) if (connectes.has(j)) void envoyer(j); }, 600);
    return () => window.clearTimeout(t);
  }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notes écrites par un joueur : rangées dans sa fiche.
  useEffect(() => ecouterJoueurs((module, d, jeton) => {
    if (module !== 'joueurs' || !jeton || typeof d.notes !== 'string') return;
    const x = c.current, p = x && persoDuJeton(x, jeton);
    if (p && notesJoueur(p) !== d.notes) modifier((y) => avecNotesJoueur(y, p.id, d.notes as string));
  }), [modifier]);

  if (!pjs.length) return null;
  const n = jetons.filter((j) => connectes.has(j)).length;
  return (
    <button className="btn btn-petit" title="Joueurs à distance connectés" onClick={() => emettre('naviguer', { page: 'joueurs' })}>
      🌐 {n}/{pjs.length}
    </button>
  );
}
