// Côté MJ : faire tracer un sceau sur l'écran joueurs (tablette, écran tactile). Le MJ fixe le temps, voit le tracé
// arriver en direct ; à la fin, le tracé est lu (signes connus du personnage) et l'effet 3D part sur l'écran joueurs.
// Utilisé par la page Magie et par la Table de combat (le sort lu devient alors un sort de la table).
import { useEffect, useMemo, useState } from 'react';
import { ecouterJoueurs, emettre, montrerAuxJoueurs } from '../../noyau/bus';
import { nouvelId } from '../../noyau/contrat';
import type { Analyse } from './atelier/engine/analyse';
import type { Stroke } from './atelier/engine/geometry';
import type { ProfilPJ } from './atelier/engine/profils';
import type { Sceau } from './atelier/engine/types';
import { STAGE } from './atelier/components/SceauSVG';
import { effetDe, estReponseTrace, lireTracePartage, type DemandeTrace, type ReponseTrace } from './partage';

const DUREES: [number, string][] = [[0, 'Sans limite'], [10, '10 s'], [20, '20 s'], [30, '30 s'], [45, '45 s'], [60, '1 min'], [90, '1 min 30'], [120, '2 min']];
const chemin = (s: Stroke) => (s.length === 1 ? `M${s[0].x} ${s[0].y} l0.1 0` : `M${s.map((p) => `${p.x.toFixed(0)} ${p.y.toFixed(0)}`).join(' L')}`);

export interface SortTrace { nom: string; sceau: Sceau; analyse: Analyse }

interface Props {
  /** Personnage qui trace (signes connus, calibrage) ; null : tous les signes sont lus. */
  profil: ProfilPJ | null;
  /** Combat : après l'effet, le sort part sur la table. */
  onSort?: (s: SortTrace) => void;
  libelleSort?: string;
}

export function PanneauTrace({ profil, onSort, libelleSort = 'Viser sur la table' }: Props) {
  const [duree, setDuree] = useState(30);
  const [guide, setGuide] = useState(true);
  const [demande, setDemande] = useState<DemandeTrace | null>(null);
  const [rep, setRep] = useState<ReponseTrace | null>(null);

  // Les traits arrivent de l'écran joueurs au fil du tracé.
  useEffect(() => ecouterJoueurs((module, d) => {
    if (module === 'magie' && demande && estReponseTrace(d) && d.id === demande.id) setRep(d);
  }), [demande]);

  const lu = useMemo(() => (rep?.traits.length ? lireTracePartage(rep.traits, profil) : null), [rep, profil]);

  // Fin du tracé : l'effet 3D est montré aux joueurs.
  useEffect(() => {
    if (!rep?.fini || !lu) return;
    if (!lu.analyse.actif && !lu.lecture.sceau.coeur) { emettre('message', { texte: 'Tracé illisible : aucun Cœur reconnu.', sorte: 'erreur' }); return; }
    montrerAuxJoueurs({ sorte: 'module', module: 'magie', vue: 'effet', titre: lu.analyse.nomSuggere, donnees: effetDe(rep.traits, lu.lecture, lu.analyse) as unknown as Record<string, unknown> }, 'magie:effet');
  }, [rep?.fini]); // eslint-disable-line react-hooks/exhaustive-deps

  const lancer = () => {
    const d: DemandeTrace = { id: nouvelId('trace'), titre: profil ? `Tracé de ${profil.nom}` : 'Tracez votre sceau', duree, guide };
    setDemande(d); setRep(null);
    montrerAuxJoueurs({ sorte: 'module', module: 'magie', vue: 'trace', titre: d.titre, donnees: d as unknown as Record<string, unknown> }, 'magie:trace');
    emettre('message', { texte: `Zone de tracé sur l’écran joueurs${duree ? ` (${duree} s dès le premier trait)` : ''}.`, sorte: 'succes' });
  };

  return (
    <div className="pile panneau-trace" style={{ gap: 6 }}>
      <div className="ligne">
        <label className="ligne">Temps <select value={duree} onChange={(e) => setDuree(Number(e.target.value))}>{DUREES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="ligne"><input type="checkbox" checked={guide} onChange={(e) => setGuide(e.target.checked)} /> Cercles guides</label>
        <button className="btn btn-mj" onClick={lancer}>{demande ? 'Nouvelle zone de tracé' : 'Montrer la zone de tracé'}</button>
      </div>
      {demande && (
        <div className="ligne" style={{ alignItems: 'flex-start' }}>
          <svg viewBox={`0 0 ${STAGE} ${STAGE}`} width={150} height={150} style={{ background: '#efe3c6', borderRadius: 8, flex: 'none' }}>
            {(rep?.traits ?? []).map((s, i) => <path key={i} d={chemin(s)} fill="none" stroke="#2a1b0e" strokeWidth={6} strokeLinecap="round" />)}
          </svg>
          <div className="pile" style={{ gap: 4 }}>
            <span className="discret">{!rep ? 'En attente du premier trait…' : rep.fini ? `Terminé en ${(rep.temps / 1000).toFixed(1)} s${rep.horsDelai ? ' (temps écoulé)' : ''}` : `En cours : ${rep.traits.length} trait(s), ${(rep.temps / 1000).toFixed(0)} s`}</span>
            {lu && <strong>{lu.analyse.nomSuggere}</strong>}
            {lu && <span className="discret">{lu.analyse.resume}</span>}
            {lu && lu.inconnus.length > 0 && <span className="discret">Signes inconnus (sans effet) : {lu.inconnus.join(', ')}</span>}
            {rep?.fini && lu && (
              <div className="ligne">
                <button className="btn btn-petit btn-mj" onClick={() => montrerAuxJoueurs({ sorte: 'module', module: 'magie', vue: 'effet', titre: lu.analyse.nomSuggere, donnees: effetDe(rep.traits, lu.lecture, lu.analyse) as unknown as Record<string, unknown> }, 'magie:effet')}>Remontrer l’effet</button>
                {onSort && lu.lecture.sceau.coeur && <button className="btn btn-petit btn-principal" onClick={() => onSort({ nom: lu.analyse.nomSuggere, sceau: lu.lecture.sceau, analyse: lu.analyse })}>{libelleSort}</button>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
