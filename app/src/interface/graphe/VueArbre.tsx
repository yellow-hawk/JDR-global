// Vue d'un arbre (organigramme) en SVG : boîtes, liens à angle droit, repli des branches, panoramique / zoom.
import { useEffect, useMemo, useState } from 'react';
import { descendants, disposerArbre, type NoeudArbre } from '../../noyau/graphe';
import { usePanZoom, useTaille } from './panZoom';
import './graphe.css';

const L = 168, H = 56;

interface Props { racine: NoeudArbre; choisi: string | null; onChoisir: (n: NoeudArbre | null) => void; horizontal?: boolean }

function indexer(n: NoeudArbre, m = new Map<string, NoeudArbre>()): Map<string, NoeudArbre> {
  m.set(n.id, n); n.enfants.forEach((e) => indexer(e, m)); return m;
}

export function VueArbre({ racine, choisi, onChoisir, horizontal }: Props) {
  const [boite, dims] = useTaille<HTMLDivElement>();
  const { vue, cadrer, centrerSur, gestion } = usePanZoom();
  const [replies, setReplies] = useState<Set<string>>(new Set());
  useEffect(() => {
    // Repli automatique au-delà de 3 niveaux pour les grands arbres.
    const r = new Set<string>();
    const parcourir = (n: NoeudArbre, p: number) => { if (p >= 3 && n.enfants.length) r.add(n.id); n.enfants.forEach((e) => parcourir(e, p + 1)); };
    if (indexer(racine).size > 60) parcourir(racine, 0);
    setReplies(r);
  }, [racine]);
  const index = useMemo(() => indexer(racine), [racine]);
  const d = useMemo(() => disposerArbre(racine, { replies, horizontal, ecartX: horizontal ? 230 : 190, ecartY: horizontal ? 120 : 110 }), [racine, replies, horizontal]);
  useEffect(() => {
    // Tout l'arbre s'il tient lisiblement, sinon la racine en haut à un zoom lisible.
    const k = Math.min((dims.l - 80) / Math.max(1, d.largeur + L), (dims.h - 80) / Math.max(1, d.hauteur + H));
    if (k >= 0.6) cadrer(-L / 2, -H / 2, d.largeur, d.hauteur, dims.l, dims.h);
    else { const p = d.positions[racine.id]; centrerSur(p.x, p.y, 0.75, dims.l, dims.h); }
  }, [racine, dims.l, dims.h, horizontal]); // eslint-disable-line react-hooks/exhaustive-deps

  const basculer = (id: string) => setReplies((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div ref={boite} className="graphe-boite">
      <svg className="graphe-svg" {...gestion} onClick={(ev) => { if (!(ev.target as Element).closest('[data-noeud]')) onChoisir(null); }}>
        <g transform={`translate(${vue.x},${vue.y}) scale(${vue.k})`}>
          {d.liens.map(([a, b]) => {
            const p = d.positions[a], q = d.positions[b];
            const chemin = horizontal
              ? `M${p.x + L / 2},${p.y} H${(p.x + q.x) / 2} V${q.y} H${q.x - L / 2}`
              : `M${p.x},${p.y + H / 2} V${(p.y + q.y) / 2} H${q.x} V${q.y - H / 2}`;
            return <path key={`${a}-${b}`} d={chemin} className="arbre-lien" />;
          })}
          {Object.entries(d.positions).map(([id, p]) => {
            const n = index.get(id)!;
            const rep = replies.has(id) && n.enfants.length > 0;
            return (
              <g key={id} data-noeud transform={`translate(${p.x - L / 2},${p.y - H / 2})`} className={`arbre-noeud ${choisi === id ? 'choisi' : ''}`}
                onClick={(ev) => { ev.stopPropagation(); onChoisir(n); }}>
                <rect width={L} height={H} rx={8} />
                <rect width={6} height={H} rx={3} fill={n.couleur ?? 'var(--accent)'} stroke="none" />
                <text x={14} y={n.sousTitre ? 22 : 33} className="arbre-titre">{coupe(n.libelle, 22)}</text>
                {n.sousTitre && <text x={14} y={40} className="arbre-sous">{coupe(n.sousTitre, 26)}</text>}
                <title>{n.libelle}{n.sousTitre ? `\n${n.sousTitre}` : ''}</title>
                {n.enfants.length > 0 && (
                  <g transform={horizontal ? `translate(${L},${H / 2})` : `translate(${L / 2},${H})`} onClick={(ev) => { ev.stopPropagation(); basculer(id); }} className="arbre-repli">
                    <circle r={10} />
                    <text y={4}>{rep ? `+${descendants(n)}` : '−'}</text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

const coupe = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
