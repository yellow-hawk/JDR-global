// Fenêtre « écran joueurs » (adresse ?ecran=joueurs) : affiche ce que le MJ lui envoie.
// Ne lit jamais la campagne : elle ne reçoit que des scènes déjà filtrées par le bus.
// Par-dessus la scène : les jets de dés en 3D, l'historique des jets et un bandeau (date du monde).
import { lazy, Suspense, useEffect, useState } from 'react';
import type { Scene } from '../noyau/bus';
import { envoyerAuMj, recevoirEcran } from '../noyau/bus';
import { moduleParId } from './registre';
import { Zoomable } from './Zoomable';
import { SvgZoomable } from './SvgZoomable';
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
  const blob = scene.sorte === 'image' || scene.sorte === 'document' || scene.sorte === 'vide' || scene.sorte === 'fiche' ? scene.image : scene.sorte === 'personnage' ? scene.portrait : null;
  // Vue interactive d'un module (tracé de l'Atelier, visée en combat…).
  const VueModule = scene.sorte === 'module' ? moduleParId(scene.module)?.ecranJoueurs?.[scene.vue] : undefined;
  const image = useUrlBlob(blob);

  const pleinEcran = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  };

  return (
    <div className={`ecran ${scene.sorte === 'module' ? 'ecran-interactif' : ''}`}>
      {scene.sorte === 'vide' && (
        <div className="ecran-attente">
          <div className="ecran-titre">{scene.campagne ?? 'JDR Global'}</div>
          {image && <img src={image} alt="" />}
          {scene.message ? <div className="ecran-texte">{scene.message}</div> : <div className="ecran-sous" style={{ textAlign: 'center' }}>En attente du maître du jeu…</div>}
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
          <div className="ecran-perso-info">
            <div className="ecran-titre" style={{ textAlign: 'left', margin: 0 }}>{scene.nom}</div>
            <div className="ecran-sous">{scene.sousTitre}</div>
            {scene.details?.length ? (
              <div className="ecran-etiquettes">{scene.details.map((d) => <span key={d.libelle}><small>{d.libelle}</small>{d.valeur}</span>)}</div>
            ) : null}
            {scene.caracs?.length ? (
              <div className="ecran-caracs">{scene.caracs.map((c) => <div key={c.libelle}><small>{c.libelle}</small><b>{c.mod}</b> <small>{c.valeur}</small></div>)}</div>
            ) : null}
            {scene.texte && <div className="ecran-texte">{scene.texte}</div>}
            {scene.blocs?.length ? (
              <div className="ecran-blocs">{scene.blocs.map((b) => <div key={b.titre}><h4>{b.titre}</h4><p>{b.texte}</p></div>)}</div>
            ) : null}
          </div>
        </div>
      )}
      {scene.sorte === 'image' && (
        <div className="ecran-image">
          <div className="ecran-titre">{scene.titre}</div>
          <Zoomable cle={image}>{image && <img src={image} alt={scene.titre} draggable={false} />}</Zoomable>
        </div>
      )}
      {scene.sorte === 'svg' && (
        <div className="ecran-image">
          <div className="ecran-titre">{scene.titre}</div>
          <SvgZoomable svg={scene.svg} />
          {scene.texte && <div className="ecran-sous" style={{ textAlign: 'center' }}>{scene.texte}</div>}
        </div>
      )}
      {scene.sorte === 'fiche' && (
        <div className="ecran-doc ecran-doc-parchemin">
          <div className="ecran-doc-feuille ecran-fiche">
            <div className="ecran-doc-titre">{scene.titre}</div>
            {scene.sousTitre && <div className="ecran-fiche-sous">{scene.sousTitre}</div>}
            {image && <img src={image} alt="" />}
            <div className="ecran-fiche-sections">
              {scene.sections.map((x) => <section key={x.titre}><h3>{x.titre}</h3><p>{x.texte}</p></section>)}
            </div>
          </div>
        </div>
      )}
      {scene.sorte === 'module' && (
        VueModule
          ? <Suspense fallback={<div className="ecran-sous">Chargement…</div>}><VueModule donnees={scene.donnees} titre={scene.titre} envoyer={(d) => envoyerAuMj(scene.module, d)} /></Suspense>
          : <div className="ecran-sous">{scene.titre ?? ''}</div>
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
