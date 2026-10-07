// Fenêtre « écran joueurs » (adresse ?ecran=joueurs) : affiche ce que le MJ lui envoie.
// Ne lit jamais la campagne : elle ne reçoit que des scènes déjà filtrées par le bus.
import { useEffect, useState } from 'react';
import type { Scene } from '../noyau/bus';
import { recevoirScenes } from '../noyau/bus';

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
  useEffect(() => recevoirScenes(setScene), []);
  useEffect(() => { document.title = 'Écran joueurs · JDR Global'; }, []);
  const image = useUrlBlob(scene.sorte === 'image' ? scene.image : scene.sorte === 'personnage' ? scene.portrait : null);

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
      <button className="btn btn-petit ecran-plein" onClick={pleinEcran}>Plein écran</button>
    </div>
  );
}
