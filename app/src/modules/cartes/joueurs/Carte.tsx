// Écran joueurs : la carte montrée par le MJ, zoomable, avec les annotations de la table. Si le MJ le permet, chacun
// pose un repère nommé ou dessine un trait ; on efface les siens avec la gomme. Tout passe par le MJ, qui renvoie
// les annotations à jour sur tous les écrans.
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { PropsVueJoueurs } from '../../../interface/types';
import { Zoomable } from '../../../interface/Zoomable';
import { pointSvg } from '../../../interface/pointSvg';
import { cheminTrait, COULEURS_ANNOTATION, type Annotation } from '../annotations';
import './joueurs.css';

interface Donnees { carteId: string; image: Blob; largeur: number; hauteur: number; annotations: Annotation[]; annoter: boolean }
type Outil = 'voir' | 'repere' | 'trait' | 'gomme';

export default function Carte({ donnees, envoyer, moi }: PropsVueJoueurs) {
  const d = donnees as unknown as Donnees;
  const url = useMemo(() => URL.createObjectURL(d.image), [d.image]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const [outil, setOutil] = useState<Outil>('voir');
  const [couleur, setCouleur] = useState(COULEURS_ANNOTATION[0]);
  const [trait, setTrait] = useState<[number, number][] | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const appui = useRef<{ x: number; y: number } | null>(null);
  const r = Math.max(d.largeur, d.hauteur) / 110;
  const moiId = moi?.distant ? moi.persoId : 'table';
  useEffect(() => { if (!d.annoter) setOutil('voir'); }, [d.annoter]);

  const point = (ev: PointerEvent): [number, number] => {
    const [x, y] = pointSvg(svg.current!, ev.clientX, ev.clientY, d.largeur, d.hauteur);
    return [Math.round(x), Math.round(y)];
  };
  const envoyerCarte = (x: Record<string, unknown>) => envoyer({ carteId: d.carteId, ...x });

  const bas = (ev: PointerEvent<SVGSVGElement>) => {
    appui.current = { x: ev.clientX, y: ev.clientY };
    if (outil !== 'trait' || !ev.isPrimary) return;
    ev.stopPropagation(); // le trait se dessine : la vue ne se déplace pas
    try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* pointeur sans capture */ }
    setTrait([point(ev)]);
  };
  const bouge = (ev: PointerEvent<SVGSVGElement>) => {
    if (!trait) return;
    const p = point(ev), l = trait[trait.length - 1];
    if (Math.hypot(p[0] - l[0], p[1] - l[1]) > r * 0.3) setTrait([...trait, p]);
  };
  const haut = (ev: PointerEvent<SVGSVGElement>) => {
    if (trait) { if (trait.length > 1) envoyerCarte({ ajouter: { sorte: 'trait', points: trait, couleur } }); setTrait(null); return; }
    const a = appui.current; appui.current = null;
    if (outil !== 'repere' || !a || Math.hypot(ev.clientX - a.x, ev.clientY - a.y) > 8) return;
    const [x, y] = point(ev);
    const texte = window.prompt('Nom du repère ?', '');
    if (texte !== null) envoyerCarte({ ajouter: { sorte: 'repere', x, y, texte, couleur } });
  };
  const gommer = (a: Annotation) => { if (outil === 'gomme' && a.persoId === moiId) envoyerCarte({ effacer: a.id }); };

  return (
    <div className="carte-joueurs">
      {d.annoter && (
        <div className="carte-outils">
          {([['voir', '👁 Regarder'], ['repere', '📍 Repère'], ['trait', '✏ Dessiner'], ['gomme', '🧽 Effacer les miens']] as [Outil, string][]).map(([o, l]) => (
            <button key={o} className="btn btn-petit" aria-pressed={outil === o} onClick={() => setOutil(o)}>{l}</button>
          ))}
          {(outil === 'repere' || outil === 'trait') && COULEURS_ANNOTATION.map((k) => (
            <button key={k} className="carte-couleur" aria-pressed={couleur === k} title="Couleur" style={{ background: k }} onClick={() => setCouleur(k)} />
          ))}
          <span className="carte-aide">{outil === 'repere' ? 'Touchez la carte pour poser un repère.' : outil === 'trait' ? 'Dessinez avec le doigt ou la souris (Regarder pour déplacer la vue).' : outil === 'gomme' ? 'Touchez une de vos annotations pour l’effacer.' : 'Glissez pour déplacer, pincez ou + / − pour zoomer.'}</span>
        </div>
      )}
      <div className="carte-zone">
        <Zoomable>
          <svg ref={svg} viewBox={`0 0 ${d.largeur} ${d.hauteur}`} preserveAspectRatio="xMidYMid meet" className={`carte-svg outil-${outil}`}
            onPointerDown={bas} onPointerMove={bouge} onPointerUp={haut} onPointerCancel={() => setTrait(null)}>
            <image href={url} x={0} y={0} width={d.largeur} height={d.hauteur} />
            {d.annotations.map((a) => (
              <g key={a.id} className={`carte-annotation ${outil === 'gomme' && a.persoId === moiId ? 'effacable' : ''}`} onPointerUp={() => gommer(a)}>
                {a.sorte === 'trait' && a.points
                  ? <path d={cheminTrait(a.points)} fill="none" stroke={a.couleur} strokeWidth={r * 0.45} strokeLinecap="round" strokeLinejoin="round" />
                  : <>
                      <circle cx={a.x} cy={a.y} r={r} fill={a.couleur} stroke="#1b1308" strokeWidth={r * 0.25} />
                      <text x={a.x + r * 1.4} y={a.y + r * 0.5} fontSize={r * 1.9} fill="#fff" stroke="#1b1308" strokeWidth={r * 0.35} paintOrder="stroke">{a.texte}</text>
                    </>}
                <title>{a.auteur}</title>
              </g>
            ))}
            {trait && trait.length > 1 && <path d={cheminTrait(trait)} fill="none" stroke={couleur} strokeWidth={r * 0.45} strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
        </Zoomable>
      </div>
    </div>
  );
}
