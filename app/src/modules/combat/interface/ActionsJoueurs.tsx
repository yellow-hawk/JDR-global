// Panneau du MJ (jeton choisi) : faire agir les joueurs depuis l'écran joueurs — viser un sort de la table,
// se déplacer, ou tracer un sceau de l'Atelier (chrono fixé par le MJ ; le sort tracé devient un sort de la table).
import { useState } from 'react';
import { regles } from '../../../noyau/regles';
import { nouvelId } from '../../../noyau/contrat';
import { useCampagne } from '../../../interface/etat';
import { PanneauTrace, profilDe, type SortTrace } from '../../magie';
import { gabarit } from '../logique';
import { ajouterSort, type Jeton } from '../moteur';
import { analyseDeSceau } from '../sorts';
import type { Controleur } from './types';

/* Demandes d'action, traitées par la page Combat (qui a l'image de la table). */
export type Demande = { id: string; sorte: 'sort'; sortId: number; lanceur: number } | { id: string; sorte: 'deplacement'; jeton: number };
let traiter: ((d: Demande) => void) | null = null;
export const surDemandeAction = (f: (d: Demande) => void): (() => void) => { traiter = f; return () => { if (traiter === f) traiter = null; }; };

export function ActionsJoueurs({ ctl, j }: { ctl: Controleur; j: Jeton }) {
  const { campagne } = useCampagne();
  const [sortId, setSortId] = useState<number | ''>('');
  const [tracer, setTracer] = useState(false);
  const perso = j.persoId ? campagne?.personnages.find((p) => p.id === j.persoId) : undefined;
  const sorts = [...ctl.etat.sorts].sort((a, b) => Number(!!b.lanceurs?.includes(j.persoId ?? '')) - Number(!!a.lanceurs?.includes(j.persoId ?? '')));
  const demander = (d: Demande) => { if (traiter) traiter(d); else ctl.dire('Ouvre la Table de combat pour faire agir les joueurs.', 'erreur'); };

  // Sceau tracé par les joueurs → sort de la table, puis visée sur l'écran joueurs.
  const surSort = (s: SortTrace) => {
    const a = analyseDeSceau(s.nom, s.sceau);
    if (!a || !campagne) { ctl.dire('Ce tracé ne donne pas de sort utilisable en combat.', 'erreur'); return; }
    const g = { ...gabarit(a, regles(campagne.campagne.regles)), lanceurs: j.persoId ? [j.persoId] : [] };
    const id = Math.max(99, ...ctl.etat.sorts.map((x) => x.id)) + 1; // même numérotation que ajouterSort
    ctl.faire((e) => ajouterSort(e, g));
    window.setTimeout(() => { demander({ id: nouvelId('action'), sorte: 'sort', sortId: id, lanceur: j.id }); setTracer(false); }, 0);
  };

  return (
    <details className="combat-actions-joueurs" open>
      <summary>Faire agir {j.nom} sur l’écran joueurs</summary>
      <div className="ligne">
        <select value={sortId} onChange={(e) => setSortId(e.target.value ? Number(e.target.value) : '')}>
          <option value="">Sort à viser…</option>
          {sorts.map((s) => <option key={s.id} value={s.id}>{s.lanceurs?.includes(j.persoId ?? '') ? '★ ' : ''}{s.nom}</option>)}
        </select>
        <button className="btn btn-petit btn-mj" disabled={sortId === ''} onClick={() => sortId !== '' && demander({ id: nouvelId('action'), sorte: 'sort', sortId, lanceur: j.id })}>Viser</button>
      </div>
      <div className="ligne">
        <button className="btn btn-petit btn-mj" onClick={() => demander({ id: nouvelId('action'), sorte: 'deplacement', jeton: j.id })}>Se déplacer</button>
        <button className="btn btn-petit btn-mj" aria-pressed={tracer} onClick={() => setTracer(!tracer)}>Tracer un sceau (Atelier)</button>
      </div>
      {tracer && <PanneauTrace profil={perso ? profilDe(perso) : null} onSort={surSort} libelleSort="Viser ce sort sur la table" />}
      <p className="discret">Les joueurs visent au doigt ou à la souris ; l’aperçu s’affiche ici en direct ; « Valider » sur leur écran joue l’action (Ctrl+Z pour annuler).</p>
    </details>
  );
}
