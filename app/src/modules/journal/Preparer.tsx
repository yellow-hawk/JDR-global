// Onglet « Préparer » du Journal : tout ce qui compte pour la prochaine séance, à cocher, et « Démarrer la séance ».
import { useState } from 'react';
import { emettre } from '../../noyau/bus';
import { useCampagne } from '../../interface/etat';
import { tempsDe } from '../chronologie';
import { nouvelleSeance } from './logique';
import { ajouterNote, basculerCoche, etatPreparation, pointsPreparation, reinitialiserPreparation, retirerNote } from './preparation';

export function Preparer({ versSeances }: { versSeances(): void }) {
  const { campagne, lectureSeule, modifier } = useCampagne();
  const c = campagne!;
  const [note, setNote] = useState('');
  const points = pointsPreparation(c);
  const { coches } = etatPreparation(c);
  const groupes = [...new Set(points.map((p) => p.groupe))];
  const faits = points.filter((p) => coches.includes(p.id)).length;

  const demarrer = () => {
    modifier((x) => reinitialiserPreparation(nouvelleSeance(x, new Date().toISOString().slice(0, 10), tempsDe(x).date).campagne));
    emettre('message', { texte: 'Séance démarrée : bonne partie !', sorte: 'succes' });
    versSeances();
  };

  return (
    <div className="pile">
      <div className="ligne">
        <p className="discret" style={{ flex: 1, margin: 0 }}>{points.length ? `${faits} / ${points.length} points prêts.` : 'Rien à préparer : passe des quêtes « En cours » ou ajoute tes propres points.'} La liste suit les quêtes en cours.</p>
        {!lectureSeule && <button className="btn btn-principal" onClick={demarrer}>Démarrer la séance</button>}
      </div>
      {groupes.map((g) => (
        <div key={g} className="carte-ui journal-prep">
          <h3>{g}</h3>
          {points.filter((p) => p.groupe === g).map((p) => (
            <div key={p.id} className={`ligne journal-prep-point ${coches.includes(p.id) ? 'fait' : ''}`}>
              <input type="checkbox" disabled={lectureSeule} checked={coches.includes(p.id)} onChange={() => modifier((x) => basculerCoche(x, p.id))} aria-label={p.texte} />
              <span style={{ flex: 1 }}>
                {p.texte}
                {p.detail && <span className={p.alerte ? 'journal-prep-alerte' : 'discret'}> · {p.detail}</span>}
              </span>
              {p.aller && <button className="btn btn-petit" onClick={() => emettre('naviguer', p.aller!)}>Ouvrir</button>}
              {p.perso && !lectureSeule && <button className="btn btn-petit" onClick={() => modifier((x) => retirerNote(x, p.id))}>×</button>}
            </div>
          ))}
        </div>
      ))}
      {!lectureSeule && (
        <form className="ligne" onSubmit={(e) => { e.preventDefault(); if (note.trim()) { modifier((x) => ajouterNote(x, note.trim())); setNote(''); } }}>
          <input style={{ flex: 1 }} placeholder="Ajouter un point (ex. imprimer la carte du donjon)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn btn-petit">Ajouter</button>
        </form>
      )}
    </div>
  );
}
