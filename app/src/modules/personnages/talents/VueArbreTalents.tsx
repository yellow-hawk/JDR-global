// Arbre de talents dessiné en étoile (SVG) : tronc au centre, branches en couronnes, liens de prérequis
// (pointillés : « au moins un »), talents acquis en couleur, disponibles qui brillent, verrouillés estompés.
import { useEffect, useMemo } from 'react';
import type { ArbreTalents, NoeudTalent } from '../../../noyau/talents';
import { usePanZoom, useTaille } from '../../../interface/graphe';
import { disposerTalents, RAYON_NOEUD } from './disposition';

export type EtatAffiche = 'acquis' | 'disponible' | 'verrouille' | 'neutre';

interface Props {
  arbre: ArbreTalents;
  etat?: (n: NoeudTalent) => EtatAffiche;
  choisi?: string | null;
  onChoisir?: (n: NoeudTalent | null) => void;
  hauteur?: number;
}

const coupe = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

export function VueArbreTalents({ arbre, etat = () => 'neutre', choisi, onChoisir, hauteur = 560 }: Props) {
  const [boite, dims] = useTaille<HTMLDivElement>();
  const { vue, cadrer, gestion } = usePanZoom();
  const d = useMemo(() => disposerTalents(arbre), [arbre]);
  useEffect(() => { if (dims.l > 0) cadrer(-d.rayon, -d.rayon, d.rayon, d.rayon, dims.l, dims.h); }, [arbre.id, dims.l, dims.h]); // eslint-disable-line react-hooks/exhaustive-deps
  const pos = new Map(d.noeuds.map((p) => [p.noeud.id, p]));
  const etats = new Map(d.noeuds.map((p) => [p.noeud.id, etat(p.noeud)]));

  return (
    <div ref={boite} className="graphe-boite talents-boite" style={{ height: hauteur }}>
      <svg className="graphe-svg" {...gestion} onClick={(ev) => { if (!(ev.target as Element).closest('[data-noeud]')) onChoisir?.(null); }}>
        <defs>
          <radialGradient id="talents-fond"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.10" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></radialGradient>
        </defs>
        <g transform={`translate(${vue.x},${vue.y}) scale(${vue.k})`}>
          <circle r={d.rayon} fill="url(#talents-fond)" />
          {d.liens.map((l) => {
            const a = pos.get(l.de)!, b = pos.get(l.vers)!;
            const ea = etats.get(l.de), eb = etats.get(l.vers);
            const classe = ea === 'acquis' && eb === 'acquis' ? 'talents-lien-acquis' : ea === 'acquis' && eb === 'disponible' ? 'talents-lien-ouvert' : 'talents-lien';
            // Courbe douce : le point de contrôle tire vers le centre de l'arbre.
            const mx = (a.x + b.x) / 2 * 0.92, my = (a.y + b.y) / 2 * 0.92;
            return <path key={`${l.de}>${l.vers}`} d={`M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`} className={classe}
              style={{ stroke: classe === 'talents-lien' ? undefined : b.couleur, strokeDasharray: l.ou ? '6 5' : undefined }} />;
          })}
          {d.branches.map((b) => <text key={b.nom} x={b.x} y={b.y} className="talents-branche" style={{ fill: b.couleur }}>{b.nom}</text>)}
          {d.noeuds.map((p) => {
            const n = p.noeud, e = etats.get(n.id)!;
            const r = n.sorte === 'sommet' ? RAYON_NOEUD + 7 : n.sorte === 'jonction' ? RAYON_NOEUD + 2 : RAYON_NOEUD;
            return (
              <g key={n.id} data-noeud transform={`translate(${p.x},${p.y})`} className={`talents-noeud talents-${e} ${choisi === n.id ? 'talents-choisi' : ''}`}
                onClick={(ev) => { ev.stopPropagation(); onChoisir?.(n); }}>
                {n.sorte === 'jonction'
                  ? <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={6} transform="rotate(45)" style={{ stroke: p.couleur, fill: e === 'acquis' ? p.couleur : undefined }} />
                  : <circle r={r} style={{ stroke: p.couleur, fill: e === 'acquis' ? p.couleur : undefined }} />}
                {n.sorte === 'sommet' && <circle r={r + 5} className="talents-couronne" style={{ stroke: p.couleur }} />}
                <text className="talents-icone" y={1}>{n.icone ?? '✦'}</text>
                <text className="talents-nom" y={r + 15}>{coupe(n.nom, 22)}</text>
                <title>{`${n.nom} (${n.cout} pt, niveau ${n.niveau})\n${n.texte}`}</title>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
