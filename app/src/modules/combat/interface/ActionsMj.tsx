// Panneau du MJ (jeton choisi) : jouer une action de combat pour ce jeton (foncer, esquiver, rage, second souffle…).
// Un personnage lié a les actions de sa fiche (classe, talents, dons) ; une créature, celles de tous.
import { useState } from 'react';
import { regles } from '../../../noyau/regles';
import { useCampagne } from '../../../interface/etat';
import { ACTIONS_DE_BASE, capacitesCombat } from '../capacites';
import { actionCombat, empechement, jouerAction, type Jeton } from '../moteur';
import type { Controleur } from './types';

export function ActionsMj({ ctl, j }: { ctl: Controleur; j: Jeton }) {
  const { campagne } = useCampagne();
  const [id, setId] = useState('');
  const [cible, setCible] = useState<number | ''>('');
  const p = j.persoId ? campagne?.personnages.find((x) => x.id === j.persoId) : undefined;
  const ids = p && campagne ? capacitesCombat(p, regles(campagne.campagne.regles)).actions : ACTIONS_DE_BASE;
  const a = actionCombat(id);
  const autres = ctl.etat.jetons.filter((x) => x.id !== j.id);
  const jouer = () => {
    if (!a) return;
    const r = jouerAction(ctl.etat, j.id, a.id, cible === '' ? null : cible, Math.random);
    if (r.erreur) ctl.dire(r.erreur, 'erreur');
    else { ctl.faire(() => r.etat); ctl.dire(`${j.nom} — ${r.texte}`, 'succes'); }
  };
  return (
    <details className="combat-actions-joueurs">
      <summary>Actions de combat ({ids.length})</summary>
      <div className="ligne">
        <select value={id} onChange={(e) => { setId(e.target.value); setCible(''); }}>
          <option value="">Choisir…</option>
          {ids.map((x) => actionCombat(x)!).map((x) => { const non = empechement(j, x, ctl.etat.combat.actif); return <option key={x.id} value={x.id} disabled={!!non}>{x.icone} {x.nom}{non ? ` (${non})` : ''}</option>; })}
        </select>
        {a && (a.cible === 'allie' || a.cible === 'ennemi') && (
          <select value={cible} onChange={(e) => setCible(e.target.value ? Number(e.target.value) : '')}>
            <option value="">{a.cible === 'allie' ? 'Soi-même' : 'Cible…'}</option>
            {autres.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
          </select>
        )}
        <button className="btn btn-petit btn-mj" disabled={!a} onClick={jouer}>Jouer</button>
      </div>
      {a && <p className="discret" style={{ margin: 0 }}>{a.texte}</p>}
    </details>
  );
}
