// Dessin interactif d'un arbre généalogique (SVG) : cartes des membres, couples reliés, descendance à angle droit.
import { useEffect, useMemo } from 'react';
import type { Famille } from '../../noyau/contrat';
import { usePanZoom, useTaille } from '../../interface/graphe';
import { disposer, HAUTEUR, LARGEUR } from './disposition';

interface Props { famille: Famille; choisi: string | null; onChoisir: (id: string | null) => void; portraits: Record<string, string | null> }

const COULEUR = { f: '#c2577a', m: '#3f73b8', '?': '#8a7f6e' };

export function ArbreFamille({ famille, choisi, onChoisir, portraits }: Props) {
  const [boite, dims] = useTaille<HTMLDivElement>();
  const { vue, cadrer, centrerSur, gestion } = usePanZoom();
  const d = useMemo(() => disposer(famille), [famille]);
  useEffect(() => {
    const ps = Object.values(d.positions);
    if (!ps.length) return;
    const x0 = Math.min(...ps.map((p) => p.x)) - LARGEUR, y0 = Math.min(...ps.map((p) => p.y)) - HAUTEUR;
    const x1 = Math.max(...ps.map((p) => p.x)) + LARGEUR, y1 = Math.max(...ps.map((p) => p.y)) + HAUTEUR;
    const k = Math.min((dims.l - 80) / (x1 - x0), (dims.h - 80) / (y1 - y0));
    const r = famille.racine ? d.positions[famille.racine] : undefined;
    // Arbre entier s'il reste lisible, sinon le membre de départ en haut à un zoom lisible.
    if (k >= 0.55 || !r) cadrer(x0, y0, x1, y1, dims.l, dims.h); else centrerSur(r.x, r.y, 0.8, dims.l, dims.h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [famille.id, dims.l, dims.h]);
  const lignee = useMemo(() => {
    // Ascendance et descendance du membre choisi, mises en évidence.
    if (!choisi) return null;
    const s = new Set([choisi]);
    const parId = new Map(famille.membres.map((m) => [m.id, m]));
    const monter = (id: string) => parId.get(id)?.parents.forEach((p) => { if (!s.has(p)) { s.add(p); monter(p); } });
    const descendre = (id: string) => famille.membres.filter((m) => m.parents.includes(id)).forEach((m) => { if (!s.has(m.id)) { s.add(m.id); descendre(m.id); } });
    monter(choisi); descendre(choisi);
    parId.get(choisi)?.conjoints.forEach((c) => s.add(c));
    return s;
  }, [choisi, famille]);

  return (
    <div ref={boite} className="graphe-boite">
      <svg className="graphe-svg" {...gestion} onClick={(ev) => { if (!(ev.target as Element).closest('[data-noeud]')) onChoisir(null); }}>
        <g transform={`translate(${vue.x},${vue.y}) scale(${vue.k})`}>
          {d.couples.map(([a, b]) => {
            const p = d.positions[a], q = d.positions[b];
            return <line key={`${a}-${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} className="gen-couple" />;
          })}
          {d.descendance.map(({ parents, enfant }) => {
            const ps = parents.map((id) => d.positions[id]), c = d.positions[enfant];
            const mx = ps.reduce((s, p) => s + p.x, 0) / ps.length, my = ps[0].y;
            const milieu = (my + c.y) / 2;
            const actif = !lignee || (lignee.has(enfant) && parents.some((p) => lignee.has(p)));
            return <path key={enfant} d={`M${mx},${my + (ps.length > 1 ? 0 : HAUTEUR / 2)} V${milieu} H${c.x} V${c.y - HAUTEUR / 2}`} className="gen-lien" style={{ opacity: actif ? 0.8 : 0.15 }} />;
          })}
          {famille.membres.map((m) => {
            const p = d.positions[m.id], actif = !lignee || lignee.has(m.id), url = m.persoId ? portraits[m.persoId] : null;
            const dates = [m.naissance, m.mort].some((v) => v !== null && v !== undefined) ? `${m.naissance ?? '?'} – ${m.mort ?? ''}` : '';
            return (
              <g key={m.id} data-noeud transform={`translate(${p.x - LARGEUR / 2},${p.y - HAUTEUR / 2})`} style={{ opacity: actif ? 1 : 0.3, cursor: 'pointer' }}
                className={`gen-membre ${choisi === m.id ? 'choisi' : ''} ${m.mort !== null && m.mort !== undefined ? 'mort' : ''}`} onClick={(ev) => { ev.stopPropagation(); onChoisir(m.id); }}>
                <rect width={LARGEUR} height={HAUTEUR} rx={10} />
                <rect width={LARGEUR} height={5} rx={2} fill={COULEUR[m.sexe]} stroke="none" />
                {url && <image href={url} x={6} y={11} width={40} height={40} style={{ clipPath: 'inset(0 round 20px)' }} />}
                <text x={url ? 52 : 10} y={28} className="gen-nom">{coupe(m.nom, url ? 13 : 18)}</text>
                <text x={url ? 52 : 10} y={46} className="gen-info">{coupe(m.regne ? `${m.titre ?? ''} ${m.regne[0]}–${m.regne[1]}` : m.titre || dates || m.role || '', url ? 16 : 22)}</text>
                {m.persoId && <circle cx={LARGEUR - 10} cy={14} r={4} className="gen-fiche"><title>A une fiche de personnage</title></circle>}
                {m.regne && <text x={LARGEUR - 18} y={HAUTEUR - 8} className="gen-couronne">♛</text>}
                <title>{m.nom}{m.titre ? `, ${m.titre}` : ''}{dates ? `\n${dates}` : ''}{m.notes ? `\n${m.notes}` : ''}</title>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

const coupe = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
