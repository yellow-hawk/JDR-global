// Page Réseau : la campagne vue comme un graphe (qui est lié à quoi), colorée par sorte, communauté ou centralité.
import { useEffect, useMemo, useState } from 'react';
import { emettre } from '../../noyau/bus';
import { communautes, degres, disposerForces, intermediarite, type Position } from '../../noyau/graphe';
import { useCampagne } from '../../interface/etat';
import { couleurCentralite, PALETTE_COMMUNAUTES, VueGraphe } from '../../interface/graphe';
import { cibleDe, grapheDeCampagne, SORTES, sorteNoeud } from './logique';
import './reseau.css';

type ModeCouleur = 'sorte' | 'communaute' | 'centralite';

export function Page() {
  const { vue } = useCampagne();
  const c = vue!;
  const [visibles, setVisibles] = useState<Set<string>>(() => new Set(SORTES.filter((s) => s.defaut).map((s) => s.id)));
  const [mode, setMode] = useState<ModeCouleur>('centralite');
  const [choisi, setChoisi] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');
  const [graine, setGraine] = useState(0);

  const complet = useMemo(() => grapheDeCampagne(c), [c]);
  const g = useMemo(() => grapheDeCampagne(c, visibles), [c, visibles]);
  const [deplaces, setDeplaces] = useState<Record<string, Position>>({});
  const positions = useMemo(() => disposerForces(g, { iterations: g.noeuds.length > 400 ? 160 : 300, largeur: 1600 + graine, hauteur: 1200 }), [g, graine]);
  useEffect(() => setDeplaces({}), [positions]);
  const pos = useMemo(() => ({ ...positions, ...deplaces }), [positions, deplaces]);
  const deg = useMemo(() => degres(g), [g]);
  const centr = useMemo(() => intermediarite(g), [g]);
  const comm = useMemo(() => communautes(g), [g]);
  const maxC = Math.max(1e-9, ...Object.values(centr));
  const maxD = Math.max(1, ...Object.values(deg));
  const parId = useMemo(() => new Map(g.noeuds.map((n) => [n.id, n])), [g]);

  const couleur = (id: string) => mode === 'centralite' ? couleurCentralite(centr[id] / maxC)
    : mode === 'communaute' ? PALETTE_COMMUNAUTES[comm[id] % PALETTE_COMMUNAUTES.length]
      : sorteNoeud(parId.get(id)?.sorte ?? '')?.couleur ?? '#888';
  const taille = (id: string) => 5 + 13 * Math.sqrt((deg[id] ?? 0) / maxD);
  const etiquette = (id: string, k: number) => (deg[id] ?? 0) >= Math.max(4, maxD * 0.25) || k > 1.6;

  const n = choisi ? parId.get(choisi) : undefined;
  const voisins = n ? g.liens.filter((l) => l.de === n.id || l.vers === n.id).map((l) => ({ l, autre: parId.get(l.de === n.id ? l.vers : l.de)! })).filter((x) => x.autre) : [];
  const trouves = recherche.trim().length >= 2 ? g.noeuds.filter((x) => x.libelle.toLowerCase().includes(recherche.toLowerCase())).slice(0, 8) : [];
  const ouvrir = () => { const t = n && cibleDe(n); if (t) emettre('naviguer', t); };
  const basculer = (id: string) => setVisibles((s) => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); return x; });

  return (
    <div className="reseau-page">
      <aside className="reseau-cote">
        <h1 style={{ margin: 0 }}>Réseau</h1>
        <p className="discret">{g.noeuds.length} éléments, {g.liens.length} liens. Molette : zoom · glisser : déplacer · clic : voisinage.</p>
        <input className="reseau-recherche" placeholder="Chercher…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        {trouves.map((x) => <button key={x.id} className="reseau-trouve" onClick={() => { setChoisi(x.id); setRecherche(''); }}>{x.libelle}</button>)}
        <h3>Afficher</h3>
        {SORTES.map((s) => {
          const nb = complet.noeuds.filter((x) => x.sorte === s.id).length;
          return (
            <label key={s.id} className="reseau-sorte">
              <input type="checkbox" checked={visibles.has(s.id)} onChange={() => basculer(s.id)} disabled={!nb} />
              <i style={{ background: s.couleur }} /> {s.libelle} <span className="discret">{nb}</span>
            </label>
          );
        })}
        <h3>Couleur</h3>
        <select value={mode} onChange={(e) => setMode(e.target.value as ModeCouleur)}>
          <option value="centralite">Centralité (qui fait le lien)</option>
          <option value="communaute">Communautés (groupes liés)</option>
          <option value="sorte">Sorte d’élément</option>
        </select>
        {mode === 'centralite' && <div className="graphe-legende"><span>faible</span><span className="graphe-degrade" /><span>forte</span></div>}
        <button className="btn btn-petit" onClick={() => setGraine((x) => x + 37)}>Réorganiser</button>
      </aside>
      <section className="reseau-centre">
        <VueGraphe graphe={g} positions={pos} couleur={couleur} taille={taille} etiquette={etiquette} choisi={choisi} onChoisir={setChoisi}
          onDeplacer={(id, p) => setDeplaces((d) => ({ ...d, [id]: p }))} oriente couleurLien={() => '#666'} />
      </section>
      {n && (
        <aside className="reseau-detail carte-ui">
          <span className="discret">{sorteNoeud(n.sorte)?.libelle}</span>
          <h2 style={{ margin: 0 }}>{n.libelle}</h2>
          {n.infos && <p className="discret" style={{ margin: 0 }}>{n.infos}</p>}
          <p className="discret" style={{ margin: 0 }}>{deg[n.id]} lien(s) · centralité {(centr[n.id] ?? 0).toFixed(3)} · groupe {comm[n.id] + 1}</p>
          {cibleDe(n) && <button className="btn btn-petit btn-principal" onClick={ouvrir}>Ouvrir</button>}
          <div className="reseau-voisins">
            {voisins.map(({ l, autre }, i) => (
              <button key={i} onClick={() => setChoisi(autre.id)}>
                <i style={{ background: sorteNoeud(autre.sorte)?.couleur }} /> {autre.libelle} <span className="discret">{l.sorte}</span>
              </button>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
