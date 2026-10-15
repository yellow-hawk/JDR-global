// Fenêtre « écran joueurs » (adresse ?ecran=joueurs) : affiche ce que le MJ lui envoie.
// Ne lit jamais la campagne : elle ne reçoit que des scènes déjà filtrées par le bus.
// Par-dessus la scène : les jets de dés en 3D, l'historique des jets et un bandeau (date du monde).
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { EcranDistant, type DonneesPrivees } from './EcranDistant';
import type { Scene } from '../noyau/bus';
import { envoyerAuMj, libelleScene, recevoirEcran } from '../noyau/bus';
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

/**
 * Ce qui distingue une nouvelle chose montrée d'une simple mise à jour : une vue de module (combat) ou un personnage
 * en direct gardent la même clé ; un texte, une fiche, une image ou un document changent de clé avec leur contenu.
 */
function cleScene(s: Scene): string {
  if (s.sorte === 'module') return `module|${s.module}|${s.vue}`;
  if (s.sorte === 'personnage') return `perso|${s.nom}`;
  if (s.sorte === 'texte') return `texte|${s.titre}|${s.texte}`;
  if (s.sorte === 'fiche') return `fiche|${s.titre}|${s.sections.map((x) => x.texte).join('|')}`;
  if (s.sorte === 'image' || s.sorte === 'document') return `${s.sorte}|${s.titre}|${s.image?.size ?? ''}|${s.sorte === 'document' ? s.texte ?? '' : ''}`;
  return `${s.sorte}|${libelleScene(s)}`;
}

export function EcranJoueurs() {
  const [scene, setScene] = useState<Scene>({ sorte: 'vide' });
  const [jet, setJet] = useState<JetDes | null>(null);
  const [jets, setJets] = useState<JetDes[]>([]);
  const [bandeau, setBandeau] = useState<string | null>(null);
  // Joueur à distance (?joueur=…) : sa fiche et ses messages, reçus sur son salon privé.
  const distant = useMemo(() => new URLSearchParams(window.location.search).has('joueur'), []);
  const [prive, setPrive] = useState<DonneesPrivees>({});
  const [refuse, setRefuse] = useState(false);
  useEffect(() => recevoirEcran({
    scene: setScene,
    jet: (j) => { setJet(j); setJets((l) => [j, ...l].slice(0, 6)); },
    historique: (h) => setJets(h.filter((j) => !j.qui?.endsWith('caché')).slice(0, 6)),
    bandeau: setBandeau,
    complement: (d) => setScene((s) => (s.sorte === 'module' ? { ...s, donnees: { ...s.donnees, ...d } } : s)),
    prive: (d) => setPrive((x) => ({ ...x, ...(d as DonneesPrivees) })),
    refuse: () => setRefuse(true),
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

  const ecran = (
    <div className={`ecran ${scene.sorte === 'module' ? 'ecran-interactif' : ''} ${distant ? 'ecran-distant' : ''}`}>
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
          ? <Suspense fallback={<div className="ecran-sous">Chargement…</div>}><VueModule donnees={scene.donnees} titre={scene.titre} envoyer={(d) => envoyerAuMj(scene.module, d)} moi={{ distant, persoId: prive.persoId ?? null }} /></Suspense>
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
      <button className="btn btn-petit ecran-plein" onClick={pleinEcran}>Plein écran</button>
    </div>
  );
  // Dés en 3D : par-dessus tout, même les onglets d'un joueur à distance.
  const des = jet ? <Suspense fallback={null}><Des3D key={jet.id} jet={jet} /></Suspense> : null;
  if (refuse) return <div className="ecran ecran-refuse"><p>Ce lien n’est plus valide : le maître du jeu en a créé un nouveau. Demande-lui ton nouveau lien.</p></div>;
  // Joueur à distance : une nouvelle chose à l'écran (pas une simple mise à jour) ne doit pas rester cachée sous un onglet.
  return distant ? <EcranDistant prive={prive} nouveaute={{ cle: cleScene(scene), titre: libelleScene(scene) }} pardessus={des}>{ecran}</EcranDistant> : <>{ecran}{des}</>;
}
