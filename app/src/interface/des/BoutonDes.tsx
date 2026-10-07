// Bouton « Dés » de l'en-tête : ouvre le plateau de dés flottant, disponible sur toutes les pages.
import { useState } from 'react';
import { emettre } from '../../noyau/bus';
import { PlateauDes } from './PlateauDes';

export function BoutonDes() {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button className={`btn btn-petit ${ouvert ? 'btn-principal' : ''}`} onClick={() => setOuvert(!ouvert)} title="Plateau de dés (les jets roulent sur l'écran joueurs)">
        Dés
      </button>
      {ouvert && (
        <div className="des-flottant carte-ui" role="dialog" aria-label="Plateau de dés">
          <div className="ligne"><strong style={{ flex: 1 }}>Dés</strong><button className="des-fermer" onClick={() => setOuvert(false)} aria-label="Fermer">×</button></div>
          <PlateauDes onErreur={(t) => emettre('message', { texte: t, sorte: 'erreur' })} />
        </div>
      )}
    </>
  );
}
