import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { Stroke } from '../engine/geometry';
import { modelesPerso, reconnaitre } from '../engine/recognizer';
import type { ProfilPJ } from '../engine/profils';
import { SIGNE, TOUS } from '../data/signes';
import { GlyphPaths } from './Glyph';

interface Props { profil: ProfilPJ; majProfil: (fn: (p: ProfilPJ) => ProfilPJ) => void; onFermer: () => void }

const MAX = 5;
const chemin = (s: Stroke) => s.length === 1 ? `M${s[0].x} ${s[0].y} l0.1 0` : 'M' + s.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L');

/** Calibrage de la main : le joueur trace ses propres versions des signes, qui servent ensuite de modèles de lecture. */
export function Calibrage({ profil, majProfil, onFermer }: Props) {
  const connus = TOUS.filter((s) => profil.signes.includes(s.id));
  const [id, setId] = useState(connus[0]?.id ?? 'braise');
  const [traits, setTraits] = useState<Stroke[]>([]);
  const [enCours, setEnCours] = useState<Stroke | null>(null);
  const [aide, setAide] = useState(true);
  const ref = useRef<SVGSVGElement>(null);
  const signe = SIGNE[id];
  const exemples = profil.calibrage[id] ?? [];

  useEffect(() => { setTraits([]); }, [id]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onFermer]);

  const perso = useMemo(() => modelesPerso(profil.id, profil.calibrage, (x) => SIGNE[x].famille), [profil]);
  const test = useMemo(() => {
    if (!traits.length) return null;
    const m = reconnaitre(traits, signe.famille, [0], perso);
    if (!m) return null;
    return { nom: m.inv ? SIGNE[m.id].nomInverse : SIGNE[m.id].nom, ok: m.id === id && !m.inv, score: Math.round(m.score * 100) };
  }, [traits, signe, perso, id]);

  const pos = (e: PointerEvent) => {
    const svg = ref.current!; const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };
  const down = (e: PointerEvent<SVGSVGElement>) => { e.currentTarget.setPointerCapture(e.pointerId); setEnCours([pos(e)]); };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!enCours) return;
    const p = pos(e), l = enCours[enCours.length - 1];
    if (Math.hypot(p.x - l.x, p.y - l.y) > 0.6) setEnCours([...enCours, p]);
  };
  const up = () => { if (enCours) { setTraits((t) => [...t, enCours]); setEnCours(null); } };

  const garder = () => {
    if (!traits.length) return;
    majProfil((p) => ({ ...p, calibrage: { ...p.calibrage, [id]: [...(p.calibrage[id] ?? []), traits].slice(-MAX) } }));
    setTraits([]);
  };
  const retirer = (i: number) => majProfil((p) => {
    const l = (p.calibrage[id] ?? []).filter((_, k) => k !== i);
    const c = { ...p.calibrage }; if (l.length) c[id] = l; else delete c[id];
    return { ...p, calibrage: c };
  });

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-calib">
      <div className="modale calibrage">
        <h2 id="titre-calib">Calibrer la main de {profil.nom}</h2>
        <p className="muted">Tracez le signe comme vous le faites à la table. Gardez 2 à 5 exemples par signe : la lecture apprendra votre façon d’écrire. {signe.famille !== 'coeur' && 'Le haut de la case est l’extérieur du sceau, le Cœur est en bas.'}</p>
        <div className="calib-corps">
          <div className="calib-liste" role="listbox" aria-label="Signe à calibrer">
            {connus.map((s) => (
              <button key={s.id} role="option" aria-selected={s.id === id} className={`chip ${s.id === id ? 'on' : ''}`} onClick={() => setId(s.id)}>
                {s.nom}{profil.calibrage[s.id]?.length ? ` · ${profil.calibrage[s.id].length}` : ''}
              </button>
            ))}
          </div>
          <div className="calib-zone">
            <svg ref={ref} viewBox="0 0 100 100" className="calib-feuille" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="img" aria-label={`Case de tracé : ${signe.nom}`}>
              {aide && <g opacity={0.16}><GlyphPaths id={id} color="var(--ink)" width={4} /></g>}
              {signe.famille === 'rameau' && <g className="calib-guide"><circle cx={50} cy={97} r={1.6} /><text x={50} y={8} textAnchor="middle">extérieur ↑</text></g>}
              {signe.famille === 'noeud' && <g className="calib-guide"><path d="M2 66 Q50 50 98 66" fill="none" /><text x={50} y={8} textAnchor="middle">extérieur ↑</text></g>}
              {traits.map((s, i) => <path key={i} d={chemin(s)} className="encre" />)}
              {enCours && <path d={chemin(enCours)} className="encre" />}
            </svg>
            <div className="fiche-actions">
              <button className="btn primary" onClick={garder} disabled={!traits.length}>Garder cet exemple</button>
              <button className="btn ghost" onClick={() => setTraits([])} disabled={!traits.length}>Effacer</button>
              <label className="check"><input type="checkbox" checked={aide} onChange={(e) => setAide(e.target.checked)} /> Modèle</label>
            </div>
            {test && <p className={test.ok ? 'ok-t' : 'erreur'} role="status">Lu : {test.nom} ({test.score} %){test.ok ? '' : ' — gardez cet exemple pour corriger la lecture'}</p>}
          </div>
          <div className="calib-exemples">
            <div className="tag">Exemples gardés ({exemples.length}/{MAX})</div>
            {exemples.map((ex, i) => (
              <div key={i} className="calib-ex">
                <svg viewBox="0 0 100 100" width={56} height={56} aria-hidden="true">{ex.map((s, k) => <path key={k} d={chemin(s)} className="encre fine" />)}</svg>
                <button className="btn ghost" onClick={() => retirer(i)} aria-label={`Retirer l’exemple ${i + 1}`}>×</button>
              </div>
            ))}
            {!exemples.length && <p className="muted">Aucun : la lecture utilise le modèle de l’atelier.</p>}
          </div>
        </div>
        <div className="fiche-actions"><button className="btn" onClick={onFermer}>Terminer</button></div>
      </div>
    </div>
  );
}
