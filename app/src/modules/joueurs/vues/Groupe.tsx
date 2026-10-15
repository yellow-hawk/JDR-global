// Écran d'un joueur : le journal du groupe, commun à tous les joueurs (indices, PNJ rencontrés, pistes).
// Chacun écrit, modifie et efface ses propres notes ; le MJ peut tout effacer depuis la page Joueurs.
import { useState } from 'react';
import type { PropsVueJoueurs } from '../../../interface/types';
import type { EntreeGroupe } from '../actions';
import '../joueurs.css';

export default function Groupe({ donnees, envoyer }: PropsVueJoueurs) {
  const d = donnees as unknown as { entrees: EntreeGroupe[]; moi: string };
  const [texte, setTexte] = useState('');
  const [edition, setEdition] = useState<{ id: string; texte: string } | null>(null);
  const ajouter = () => { if (texte.trim()) { envoyer({ ajouter: texte.trim() }); setTexte(''); } };

  return (
    <div className="vue-joueur pile">
      <p className="discret" style={{ margin: 0 }}>Notes communes à tout le groupe : tous les joueurs les lisent, le maître du jeu aussi.</p>
      <div className="pile">
        <textarea rows={3} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Un indice, un nom, une piste…" onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) ajouter(); }} />
        <button className="btn btn-principal" style={{ alignSelf: 'flex-end' }} disabled={!texte.trim()} onClick={ajouter}>Ajouter au journal</button>
      </div>
      {!d.entrees.length && <p className="discret">Le journal est vide.</p>}
      {[...d.entrees].reverse().map((e) => (
        <article key={e.id} className={`vue-joueur-note ${e.persoId === d.moi ? 'de-moi' : e.persoId === null ? 'du-mj' : ''}`}>
          <small>{e.auteur} · {new Date(e.quand).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</small>
          {edition?.id === e.id ? (
            <div className="pile">
              <textarea rows={3} value={edition.texte} onChange={(x) => setEdition({ id: e.id, texte: x.target.value })} />
              <div className="ligne">
                <button className="btn btn-petit btn-principal" onClick={() => { envoyer({ id: e.id, texte: edition.texte }); setEdition(null); }}>Enregistrer</button>
                <button className="btn btn-petit" onClick={() => setEdition(null)}>Annuler</button>
              </div>
            </div>
          ) : <p>{e.texte}</p>}
          {e.persoId === d.moi && edition?.id !== e.id && (
            <div className="ligne">
              <button className="btn btn-petit" onClick={() => setEdition({ id: e.id, texte: e.texte })}>Modifier</button>
              <button className="btn btn-petit" onClick={() => window.confirm('Effacer cette note ?') && envoyer({ id: e.id, texte: null })}>Effacer</button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
