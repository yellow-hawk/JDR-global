// Plateau de dés : choisir d'abord Neutre / Avantage / Désavantage, puis cliquer le dé.
// Après chaque jet, le sélecteur revient sur Neutre (pour ne pas l'oublier).
// Un jet public roule en 3D sur l'écran joueurs ; un jet caché reste chez le MJ.
import { useEffect, useState } from 'react';
import { annoncerJet, historiqueJets, suivreJets } from '../../noyau/bus';
import { formuleValide, jeter, texteJet, type JetDes, type ModeJet } from '../../noyau/regles';
import './des.css';

const DES = [4, 6, 8, 10, 12, 20, 100];
const MODES: { id: ModeJet; libelle: string; titre: string }[] = [
  { id: 'desavantage', libelle: 'Désavantage', titre: 'Deux dés, on garde le plus bas' },
  { id: 'normal', libelle: 'Neutre', titre: 'Un seul dé' },
  { id: 'avantage', libelle: 'Avantage', titre: 'Deux dés, on garde le plus haut' },
];

interface Props {
  /** Nom de celui qui lance (jeton sélectionné…), affiché avec le résultat. */
  qui?: string;
  /** Appelé après chaque jet (ex. journal de la table de combat). */
  onJet?: (j: JetDes, texte: string) => void;
  /** Sur une fenêtre étroite (panneau latéral) : historique plus court. */
  compact?: boolean;
  /** Erreur de formule. */
  onErreur?: (texte: string) => void;
}

export function PlateauDes({ qui, onJet, compact, onErreur }: Props) {
  const [mode, setMode] = useState<ModeJet>('normal');
  const [formule, setFormule] = useState('');
  const [cache, setCache] = useState(false);
  const [historique, setHistorique] = useState<JetDes[]>(historiqueJets);
  useEffect(() => suivreJets(setHistorique), []);

  const lancerFormule = (f: string) => {
    if (!formuleValide(f)) { onErreur?.(`Formule invalide : « ${f} »`); return; }
    const j = jeter(f, mode, Math.random, qui || undefined);
    annoncerJet(j, cache);
    onJet?.(j, texteJet(j));
    setMode('normal'); // retour automatique sur Neutre
  };

  return (
    <div className="des-plateau">
      <div className="des-modes" role="radiogroup" aria-label="Mode du prochain jet">
        {MODES.map((m) => (
          <button key={m.id} role="radio" aria-checked={mode === m.id} title={m.titre}
            className={`des-mode des-mode-${m.id} ${mode === m.id ? 'actif' : ''}`} onClick={() => setMode(m.id)}>
            {m.libelle}
          </button>
        ))}
      </div>
      <div className="des-boutons">
        {DES.map((d) => (
          <button key={d} className={`des-de des-d${d}`} onClick={() => lancerFormule(`1d${d}`)} title={`Lancer 1d${d}${mode !== 'normal' ? ` (${mode === 'avantage' ? 'avantage' : 'désavantage'})` : ''}`}>
            d{d}
          </button>
        ))}
      </div>
      <form className="des-formule" onSubmit={(e) => { e.preventDefault(); if (formule.trim()) lancerFormule(formule.trim()); }}>
        <input value={formule} onChange={(e) => setFormule(e.target.value)} placeholder="1d20+5, 2d6+3…" aria-label="Formule" />
        <button className="btn btn-petit btn-principal">Lancer</button>
      </form>
      <label className="des-cache" title="Le jet n'apparaît pas sur l'écran joueurs">
        <input type="checkbox" checked={cache} onChange={(e) => setCache(e.target.checked)} /> Jet caché (derrière l’écran)
      </label>
      {historique.length > 0 && (
        <ol className="des-historique">
          {historique.slice(0, compact ? 4 : 8).map((j, i) => (
            <li key={j.id + i} className={i === 0 ? 'dernier' : ''}><strong>{j.total}</strong> <span>{texteJet(j).replace(/ = -?\d+$/, '')}</span></li>
          ))}
        </ol>
      )}
    </div>
  );
}
