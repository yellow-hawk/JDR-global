// Grimoire de la table : lancer (avec le jeton choisi), créer, modifier, supprimer un sort.
// Si le lanceur est lié à un personnage, ses propres sorts sont listés en premier.
import { useState } from 'react';
import type { Gabarit } from '../moteur';
import { ModaleSort } from './ModaleSort';
import { NOMS_FORMES, type Controleur } from './types';

function CarteSort({ ctl, s, modifier }: { ctl: Controleur; s: Gabarit; modifier: (s: Gabarit) => void }) {
  return (
    <div className={`combat-sort ${ctl.ui.sort?.id === s.id ? 'actif' : ''}`} onClick={() => !ctl.lectureSeule && ctl.viser(s)}>
      <div className="ligne">
        <span className="combat-pastille" style={{ background: s.couleur }} />
        <strong style={{ flex: 1 }}>{s.nom}</strong>
        {s.atelier && <span className="combat-badge" title="Sort de la campagne (Atelier de tracé)">Atelier</span>}
        {!ctl.lectureSeule && <button className="combat-oeil" title="Modifier" onClick={(ev) => { ev.stopPropagation(); modifier(s); }}>✎</button>}
        {!ctl.lectureSeule && <button className="combat-oeil" title="Supprimer" onClick={(ev) => { ev.stopPropagation(); ctl.faire((e) => ({ ...e, sorts: e.sorts.filter((x) => x.id !== s.id) })); }}>×</button>}
      </div>
      {s.desc && <div className="discret">{s.desc}</div>}
      <div className="combat-meta">
        <span>{NOMS_FORMES[s.forme]} {s.rayon}</span><span>{s.origine === 'soi' ? 'depuis soi' : `portée ${s.portee}`}</span>
        {s.effets.map((f, i) => <span key={i}>{f.type === 'degats' ? `−${f.valeur} ${f.nature ?? ''}` : f.type === 'soin' ? `+${f.valeur} PV` : f.valeur}</span>)}
        {s.concentration && <span className="combat-conc">⟡ conc.</span>}
      </div>
    </div>
  );
}

export function Sorts({ ctl }: { ctl: Controleur }) {
  const [edition, setEdition] = useState<Gabarit | 'nouveau' | null>(null);
  const lanceur = ctl.etat.jetons.find((j) => j.id === ctl.ui.selection);
  const connus = lanceur?.persoId ? ctl.etat.sorts.filter((s) => s.lanceurs?.includes(lanceur.persoId!)) : [];
  const autres = ctl.etat.sorts.filter((s) => !connus.includes(s));
  return (
    <div className="combat-onglet">
      <p className="discret">{lanceur ? `Lanceur : ${lanceur.nom}. Clique un sort pour viser.` : 'Choisis d’abord le lanceur sur la table.'}</p>
      {connus.length > 0 && <h3>Sorts de {lanceur!.nom}</h3>}
      {connus.map((s) => <CarteSort key={`c${s.id}`} ctl={ctl} s={s} modifier={setEdition} />)}
      {connus.length > 0 && <h3>Autres sorts</h3>}
      {autres.map((s) => <CarteSort key={`a${s.id}`} ctl={ctl} s={s} modifier={setEdition} />)}
      {!ctl.lectureSeule && <button className="btn btn-petit" onClick={() => setEdition('nouveau')}>+ Nouveau sort</button>}
      {edition && <ModaleSort ctl={ctl} sort={edition === 'nouveau' ? null : edition} fermer={() => setEdition(null)} />}
    </div>
  );
}
