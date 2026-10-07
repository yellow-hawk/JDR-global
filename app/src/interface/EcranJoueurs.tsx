// Fenêtre « écran joueurs » (adresse ?ecran=joueurs) : affiche ce que le MJ lui envoie.
// Ne lit jamais la campagne : elle ne reçoit que des scènes déjà filtrées par le bus.
// Par-dessus la scène : les jets de dés en 3D, l'historique des jets et un bandeau (date du monde).
import { lazy, Suspense, useEffect, useState } from 'react';
import type { Scene } from '../noyau/bus';
import { recevoirEcran } from '../noyau/bus';
import { texteJet, type JetDes } from '../noyau/regles';
import './des/des.css';

const Des3D = lazy(() => import('./des/Des3D'));

function useUrlBlob(b: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!b) { setUrl(null); return; }
    const u = URL.createObjectURL(b);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [b]);
  return url;
}

export function EcranJoueurs() {
  const [scene, setScene] = useState<Scene>({ sorte: 'vide' });
  const [jet, setJet] = useState<JetDes | null>(null);
  const [jets, setJets] = useState<JetDes[]>([]);
  const [bandeau, setBandeau] = useState<string | null>(null);
  useEffect(() => recevoirEcran({
    scene: setScene,
    jet: (j) => { setJet(j); setJets((l) => [j, ...l].slice(0, 6)); },
    historique: (h) => setJets(h.filter((j) => !j.qui?.endsWith('caché')).slice(0, 6)),
    bandeau: setBandeau,
  }), []);
  useEffect(() => { document.title = 'Écran joueurs · JDR Global'; }, []);
  const blob = scene.sorte === 'image' ? scene.image : scene.sorte === 'personnage' ? scene.portrait : scene.sorte === 'document' ? scene.image : null;
  const image = useUrlBlob(blob);

  const pleinEcran = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  };

  return (
    <div className="ecran" onDoubleClick={pleinEcran}>
      {scene.sorte === 'vide' && (
        <div>
          <div className="ecran-titre">{scene.campagne ?? 'JDR Global'}</div>
          <div className="ecran-sous" style={{ textAlign: 'center' }}>En attente du maître du jeu…</div>
        </div>
      )}
      {scene.sorte === 'texte' && (
        <div>
          <div className="ecran-titre">{scene.titre}</div>
          <div className="ecran-texte">{scene.texte}</div>
        </div>
      )}
      {scene.sorte === 'personnage' && (
        <div className="ecran-perso">
          {image && <img src={image} alt="" />}
          <div>
            <div className="ecran-titre" style={{ textAlign: 'left' }}>{scene.nom}</div>
            <div className="ecran-sous">{scene.sousTitre}</div>
            {scene.texte && <div className="ecran-texte" style={{ marginTop: '1em' }}>{scene.texte}</div>}
          </div>
        </div>
      )}
      {scene.sorte === 'image' && (
        <div className="ecran-image">
          <div className="ecran-titre">{scene.titre}</div>
          <div>{image && <img src={image} alt={scene.titre} />}</div>
        </div>
      )}
      {scene.sorte === 'document' && (
        <div className={`ecran-doc ecran-doc-${scene.style}`}>
          {scene.texte || !image ? (
            <div className="ecran-doc-feuille">
              <div className="ecran-doc-titre">{scene.titre}</div>
              {image && <img src={image} alt="" />}
              {scene.texte && <div className="ecran-doc-texte">{scene.texte}</div>}
            </div>
          ) : (
            <div className="ecran-image"><div className="ecran-titre">{scene.titre}</div><div><img src={image} alt={scene.titre} /></div></div>
          )}
        </div>
      )}
      {bandeau && <div className="ecran-bandeau">{bandeau}</div>}
      {jets.length > 0 && (
        <ol className="ecran-jets" aria-label="Derniers jets">
          {jets.slice(0, 5).map((j, i) => <li key={j.id + i}><strong>{j.total}</strong>{texteJet(j).replace(/ = -?\d+$/, '')}</li>)}
        </ol>
      )}
      {jet && <Suspense fallback={null}><Des3D key={jet.id} jet={jet} /></Suspense>}
      <button className="btn btn-petit ecran-plein" onClick={pleinEcran}>Plein écran</button>
    </div>
  );
}
