// Page Monde : l'Atlas des ciels dans un cadre isolé + les univers de la campagne (générés ou faits main).
import { useEffect, useRef, useState } from 'react';
import { emettre } from '../../noyau/bus';
import { regles } from '../../noyau/regles';
import { useCampagne } from '../../interface/etat';
import { ajouterCarte, enregistrerImageCarte } from '../cartes';
import { importerQuetesAtlas, type QueteAtlas } from '../journal';
import { Installation } from './installation/Installation';
import { integrerCivilisations, type CivilisationsAtlas } from './installation/civilisations';
import { UniversFaitMain } from './UniversFaitMain';
import { ajouterUniversFaitMain, enregistrerUnivers, importerPnj, supprimerUnivers } from './logique';
import { demander, ouvrirDansAtlas, type EtatAtlas, type PnjAtlas } from './pont';
import './monde.css';

const URL_ATLAS = 'atlas/index.html';

export function Page() {
  const { campagne, vue, role, lectureSeule, modifier } = useCampagne();
  const [installation, setInstallation] = useState(false);
  const cadre = useRef<HTMLIFrameElement>(null);
  const [pret, setPret] = useState(false);
  const [courant, setCourant] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const c = vue!;
  const u = c.univers.find((x) => x.id === courant) ?? null;

  useEffect(() => { if (role === 'joueurs') setPret(false); }, [role]);
  useEffect(() => {
    const ecoute = (ev: MessageEvent) => { if (ev.source === cadre.current?.contentWindow && ev.data?.type === 'atlas:pret') setPret(true); };
    window.addEventListener('message', ecoute);
    return () => window.removeEventListener('message', ecoute);
  }, []);

  const action = async (f: () => Promise<void>) => {
    setOccupe(true);
    try { await f(); } catch (e) { emettre('message', { texte: (e as Error).message, sorte: 'erreur' }); } finally { setOccupe(false); }
  };

  const enregistrer = (nouveau: boolean) => action(async () => {
    const etat = await demander<EtatAtlas>(cadre.current!, 'atlas:demander');
    let id = '';
    modifier((x) => { const r = enregistrerUnivers(x, etat, nouveau ? null : courant); id = r.id; return r.campagne; });
    window.setTimeout(() => setCourant(id), 0);
    emettre('message', { texte: nouveau ? 'Univers ajouté à la campagne.' : 'Univers mis à jour.', sorte: 'succes' });
  });

  const importerLesPnj = () => action(async () => {
    const { pnj } = await demander<{ pnj: PnjAtlas[] }>(cadre.current!, 'atlas:pnj');
    let n = 0;
    modifier((x) => { const r = importerPnj(x, pnj, regles(x.campagne.regles)); n = r.ajoutes; return r.campagne; });
    window.setTimeout(() => emettre('message', { texte: `${n} PNJ ajouté(s) dans Personnages (secrets dans le bloc MJ).`, sorte: 'succes' }), 0);
  });

  const importerLesQuetes = () => action(async () => {
    const { quetes } = await demander<{ quetes: QueteAtlas[] }>(cadre.current!, 'atlas:quetes-donnees');
    let res = { ajoutees: 0, majs: 0 };
    modifier((x) => { const r = importerQuetesAtlas(x, quetes, u?.sorte === 'genere' ? u.id : null); res = r; return r.campagne; });
    window.setTimeout(() => emettre('message', { texte: `Quêtes : ${res.ajoutees} ajoutée(s), ${res.majs} mise(s) à jour (Journal).`, sorte: 'succes' }), 0);
  });

  const importerPeuples = () => action(async () => {
    if (!u || u.sorte !== 'genere') throw new Error('Choisis d’abord un univers de l’Atlas dans la liste.');
    const civ = await demander<CivilisationsAtlas>(cadre.current!, 'atlas:civilisations');
    modifier((x) => integrerCivilisations(x, u.id, civ));
    emettre('message', { texte: `${civ.peuples.length} peuple(s) mis à jour (fiches pays, calendriers).`, sorte: 'succes' });
  });

  const importerCarteMonde = () => action(async () => {
    const { image, nom } = await demander<{ image: Blob; nom: string }>(cadre.current!, 'atlas:image-monde');
    const { fichier, taille } = await enregistrerImageCarte(c.campagne.id, image, `${nom} - monde.png`);
    modifier((x) => {
      const r = ajouterCarte(x, fichier, taille, `${nom} (carte du monde)`, 'monde');
      return {
        ...r.campagne,
        cartes: r.campagne.cartes.map((k) => (k.id === r.id
          ? { ...k, source: { sorte: 'atlas' as const, cle: nom }, projection: { sorte: 'equirectangulaire' as const, lonMin: -180, lonMax: 180, latMin: -90, latMax: 90, remplissagePoles: 'glace' as const } }
          : k)),
      };
    });
    emettre('message', { texte: 'Carte du monde ajoutée dans Cartes.', sorte: 'succes' });
  });

  const ouvrir = (id: string) => {
    setCourant(id);
    const x = c.univers.find((y) => y.id === id);
    if (x?.sorte === 'genere' && x.atlas && cadre.current) ouvrirDansAtlas(cadre.current, { name: x.nom, ...x.atlas });
  };

  return (
    <div className="monde-page">
      {installation && cadre.current && campagne && (
        <Installation cadre={cadre.current} campagne={campagne} modifier={modifier}
          onFermer={(id) => { setInstallation(false); if (id) setCourant(id); }} />
      )}
      <aside className="monde-cote pile">
        <h1 style={{ margin: 0 }}>Monde</h1>
        <div>
          <h3>Univers de la campagne</h3>
          {c.univers.length === 0 && <p className="discret">Aucun. Génère un ciel dans l'Atlas puis enregistre-le, ou crée un monde fait main.</p>}
          {c.univers.map((x) => (
            <button key={x.id} className="monde-ligne" aria-current={x.id === courant ? 'true' : undefined} onClick={() => ouvrir(x.id)}>
              <span>{c.campagne.univers?.id === x.id && <span title="Monde par défaut de la campagne">★ </span>}{x.nom}</span>
              <span className="discret">{x.sorte === 'genere' ? 'Atlas' : 'fait main'}</span>
            </button>
          ))}
        </div>
        {!lectureSeule && (
          <div className="pile" style={{ gap: 6 }}>
            <button className="btn btn-principal" disabled={!pret || occupe} onClick={() => setInstallation(true)}
              title="Monde par défaut, quêtes, PNJ avec avatars et portraits, toutes les cartes, cartes de bataille et rencontres">Ajouter le ciel affiché</button>
            <p className="discret" style={{ margin: 0 }}>Installe tout : monde par défaut, quêtes, PNJ (avatar + portrait), toutes les cartes classées, cartes de bataille et rencontres des quêtes.</p>
            {u && c.campagne.univers?.id !== u.id && (
              <button className="btn btn-petit" onClick={() => modifier((x) => ({ ...x, campagne: { ...x.campagne, univers: { type: 'univers', id: u.id } } }))}>★ En faire le monde par défaut</button>
            )}
            <details className="monde-unite">
              <summary>Imports à l’unité</summary>
              {u?.sorte === 'genere' && <button className="btn" disabled={!pret || occupe} onClick={() => enregistrer(false)}>Mettre à jour « {u.nom} »</button>}
              <button className="btn" disabled={!pret || occupe} onClick={() => enregistrer(true)}>Ajouter le ciel seul</button>
              <button className="btn" disabled={!pret || occupe} onClick={importerLesPnj}>Importer les PNJ des quêtes</button>
              <button className="btn" disabled={!pret || occupe} onClick={importerLesQuetes}>Importer les quêtes</button>
              <button className="btn" disabled={!pret || occupe} onClick={importerCarteMonde}>Importer la carte du monde</button>
              <button className="btn" disabled={!pret || occupe || u?.sorte !== 'genere'} onClick={importerPeuples}>Mettre à jour les peuples et calendriers</button>
            </details>
            <button className="btn" onClick={() => {
              const nom = window.prompt('Nom du monde fait main :', 'Monde d’Orden');
              if (!nom) return;
              let id = '';
              modifier((x) => { const r = ajouterUniversFaitMain(x, nom); id = r.id; return r.campagne; });
              window.setTimeout(() => setCourant(id), 0);
            }}>Nouveau monde fait main</button>
            {u && role === 'mj' && (
              <button className="btn btn-danger btn-petit" onClick={() => { if (window.confirm(`Retirer « ${u.nom} » de la campagne ?`)) { modifier((x) => supprimerUnivers(x, u.id)); setCourant(null); } }}>
                Retirer cet univers
              </button>
            )}
          </div>
        )}
        <p className="discret">L'Atlas garde aussi ses propres sauvegardes (« Mes ciels »). Ici, l'univers est rangé dans la campagne et voyage avec ses archives.</p>
      </aside>
      <section className="monde-principal">
        {u?.sorte === 'fait-main' && <UniversFaitMain univers={u} onFermer={() => setCourant(null)} />}
        {/* L'Atlas reste chargé (caché) pendant qu'on regarde un monde fait main. */}
        {role === 'joueurs' && u?.sorte !== 'fait-main' && (
          <div className="vide">L'Atlas contient les secrets du MJ (quêtes, antagonistes) : il n'est pas montré en aperçu joueurs.<br />Les mondes faits main restent visibles.</div>
        )}
        {role === 'mj' && (
          <iframe ref={cadre} className="monde-atlas" hidden={u?.sorte === 'fait-main'} src={URL_ATLAS}
            title="Atlas des ciels imaginaires" onLoad={() => window.setTimeout(() => setPret(true), 1500)} />
        )}
      </section>
    </div>
  );
}
