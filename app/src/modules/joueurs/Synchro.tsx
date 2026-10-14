// Côté MJ, toujours actif quand une campagne est ouverte (en-tête) : salons privés des joueurs à distance, envoi de
// leur fiche (en direct) et de leurs messages, réception de leurs notes. Petit indicateur : joueurs connectés.
import { useEffect, useRef, useState } from 'react';
import { definirJoueursPrives, ecouterJoueurs, emettre, envoyerPrive, surArriveeJoueur, suivreJoueursConnectes } from '../../noyau/bus';
import { regles } from '../../noyau/regles';
import { lireFichier } from '../../noyau/stockage';
import { useCampagne } from '../../interface/etat';
import { assurerSalon } from '../../interface/Tablettes';
import { ajouterMessage, avecNotesJoueur, distantsDe, ficheDuJoueur, nonLusMj, notesJoueur, persoDuJeton } from './logique';

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
    envoyerPrive(jeton, { persoId: p.id, fiche, messages });
  };

  useEffect(() => surArriveeJoueur((j, nouveau) => {
    void envoyer(j);
    const p = c.current && persoDuJeton(c.current, j);
    if (p && nouveau) emettre('message', { texte: `${p.joueur || p.nom} a rejoint la partie à distance.`, sorte: 'info' });
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fiche ou messages changés : renvoyés aux joueurs connectés concernés (regroupé toutes les 0,6 s).
  const signature = pjs.map((p) => JSON.stringify([p, distants[p.id].messages.length])).join('|');
  useEffect(() => {
    const t = window.setTimeout(() => { for (const j of jetons) if (connectes.has(j)) void envoyer(j); }, 600);
    return () => window.clearTimeout(t);
  }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notes écrites par un joueur : rangées dans sa fiche. Message d'un joueur : rangé avec les siens, et signalé.
  useEffect(() => ecouterJoueurs((module, d, jeton) => {
    if (module !== 'joueurs' || !jeton) return;
    const x = c.current, p = x && persoDuJeton(x, jeton);
    if (!p) return;
    if (typeof d.notes === 'string' && notesJoueur(p) !== d.notes) modifier((y) => avecNotesJoueur(y, p.id, d.notes as string));
    if (typeof d.message === 'string' && d.message.trim()) {
      const texte = d.message.trim().slice(0, 4000);
      modifier((y) => ajouterMessage(y, p.id, texte, null, undefined, 'joueur'));
      emettre('message', { texte: `✉ ${p.joueur || p.nom} : ${texte.length > 90 ? `${texte.slice(0, 90)}…` : texte}`, sorte: 'info' });
    }
  }), [modifier]);

  if (!pjs.length) return null;
  const n = jetons.filter((j) => connectes.has(j)).length;
  const nonLus = pjs.reduce((s, p) => s + nonLusMj(distants[p.id]), 0);
  return (
    <button className="btn btn-petit" title={nonLus ? `${nonLus} message(s) de joueurs à lire` : 'Joueurs à distance connectés'} onClick={() => emettre('naviguer', { page: 'joueurs' })}>
      🌐 {n}/{pjs.length}{nonLus ? <b className="joueurs-badge">✉ {nonLus}</b> : null}
    </button>
  );
}
