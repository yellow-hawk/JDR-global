// Dessin interactif d'un arbre généalogique (SVG) : cartes des membres, couples reliés, descendance à angle droit.
import { useEffect, useMemo } from 'react';
import type { Famille, MembreFamille } from '../../noyau/contrat';
import { ageDe } from './dates';
import { usePanZoom, useTaille } from '../../interface/graphe';
import { disposer, HAUTEUR, LARGEUR } from './disposition';

interface Props { famille: Famille; choisi: string | null; onChoisir: (id: string | null) => void; portraits: Record<string, string | null>; an: number }

/** Ligne des dates d'une carte : vie (et âge), séparée du règne. */
export function texteVie(m: MembreFamille, an: number): string {
  const n = m.naissance, d = m.mort, age = ageDe(m, an);
  if (n === null || n === undefined) return d !== null && d !== undefined ? `† ${d}` : '';
  if (d !== null && d !== undefined) return `${n} – ${d} (${age} ans)`;
  return `né${m.sexe === 'f' ? 'e' : ''} en ${n} (${age} ans)`;
}
export const texteRegne = (m: MembreFamille): string => (m.regne ? `règne ${m.regne[0]}–${m.regne[1]}` : '');

const COULEUR = { f: '#c2577a', m: '#3f73b8', '?': '#8a7f6e' };

export function ArbreFamille({ famille, choisi, onChoisir, portraits, an }: Props) {
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
          {d.fratries.map(({ parents, enfants, rail }) => {
            const ps = parents.map((id) => d.positions[id]);
            const mx = ps.reduce((s, p) => s + p.x, 0) / ps.length, my = Math.max(...ps.map((p) => p.y));
            const xs = enfants.map((e) => d.positions[e].x);
            const actif = !lignee || (enfants.some((e) => lignee.has(e)) && parents.some((p) => lignee.has(p)));
            const chemin = `M${mx},${my + (ps.length > 1 ? 0 : HAUTEUR / 2)} V${rail} M${Math.min(mx, ...xs)},${rail} H${Math.max(mx, ...xs)} `
              + enfants.map((e) => { const c = d.positions[e]; return `M${c.x},${rail} V${c.y - HAUTEUR / 2}`; }).join(' ');
            return <path key={parents.join('+')} d={chemin} className="gen-lien" style={{ opacity: actif ? 0.85 : 0.12 }} />;
          })}
          {d.successions.map(([a, b]) => {
            const p = d.positions[a], q = d.positions[b];
            return <path key={`${a}>${b}`} d={`M${p.x + LARGEUR / 2},${p.y} H${(p.x + q.x) / 2 + LARGEUR / 4} V${q.y} H${q.x - LARGEUR / 2}`} className="gen-succession"><title>Succession sans lien de sang</title></path>;
          })}
          {famille.membres.map((m) => {
            const p = d.positions[m.id], actif = !lignee || lignee.has(m.id), url = m.persoId ? portraits[m.persoId] : null;
            const vie = texteVie(m, an), regne = texteRegne(m);
            const info = regne ? `♛ ${regne}` : m.titre || m.role || '';
            return (
              <g key={m.id} data-noeud transform={`translate(${p.x - LARGEUR / 2},${p.y - HAUTEUR / 2})`} style={{ opacity: actif ? 1 : 0.3, cursor: 'pointer' }}
                className={`gen-membre ${choisi === m.id ? 'choisi' : ''} ${m.mort !== null && m.mort !== undefined ? 'mort' : ''}`} onClick={(ev) => { ev.stopPropagation(); onChoisir(m.id); }}>
                <rect width={LARGEUR} height={HAUTEUR} rx={10} />
                <rect width={LARGEUR} height={5} rx={2} fill={COULEUR[m.sexe]} stroke="none" />
                {url && <image href={url} x={6} y={14} width={44} height={44} style={{ clipPath: 'inset(0 round 22px)' }} />}
                <text x={url ? 56 : 10} y={26} className="gen-nom">{coupe(m.nom, url ? 15 : 20)}</text>
                <text x={url ? 56 : 10} y={45} className="gen-info">{coupe(vie, url ? 18 : 25)}</text>
                <text x={url ? 56 : 10} y={63} className={regne ? 'gen-info gen-regne' : 'gen-info'}>{coupe(info, url ? 18 : 25)}</text>
                {m.persoId && <circle cx={LARGEUR - 10} cy={14} r={4} className="gen-fiche"><title>A une fiche de personnage</title></circle>}
                <title>{m.nom}{m.titre ? `, ${m.titre}` : ''}{vie ? `\nVie : ${vie}` : ''}{regne ? `\n${regne[0].toUpperCase()}${regne.slice(1)}` : ''}{m.notes ? `\n${m.notes}` : ''}</title>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

const coupe = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
