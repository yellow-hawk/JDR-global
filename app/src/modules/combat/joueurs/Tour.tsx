// Écran joueurs : la table de combat, zoomable, et le tour du PJ actif. Le joueur dont c'est le tour (son lien
// personnel, ou la tablette s'il n'en a pas) voit ses actions possibles : se déplacer, attaquer avec ses armes,
// lancer ses sorts, tracer un sceau (zone de tracé pour lui seul ; les autres voient ensuite l'effet), finir son tour.
// Tout part au MJ, qui vérifie et joue l'action ; la table revient à jour sur tous les écrans.
import { Suspense, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { PropsVueJoueurs } from '../../../interface/types';
import { Zoomable } from '../../../interface/Zoomable';
import { VueEffet, VueTrace } from '../../magie';
import { caseVisee, casesDeZone, coteCaseImage, versImage, zoneVisee } from '../actions';
import { cle, distance, type Cellule, type Gabarit } from '../moteur';
import { porteeAttaque, type VueTable } from '../tour';
import './joueurs.css';

type Mode = { sorte: 'regarder' } | { sorte: 'deplacer' } | { sorte: 'attaquer'; arme: number | null } | { sorte: 'sort'; id: number | null };

function useUrl(b: Blob): string {
  const url = useMemo(() => URL.createObjectURL(b), [b]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return url;
}

export default function Tour({ donnees, envoyer, moi }: PropsVueJoueurs) {
  const d = donnees as unknown as VueTable;
  const url = useUrl(d.image);
  const o = d.options;
  const monTour = !!o && (moi?.distant ? o.persoId === moi.persoId : o.tablette);
  const [mode, setMode] = useState<Mode>({ sorte: 'regarder' });
  const [vise, setVise] = useState<{ cellule: Cellule; monde: [number, number]; cible?: number } | null>(null);
  const [attente, setAttente] = useState(false);
  const [effetVu, setEffetVu] = useState<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const appui = useRef<{ x: number; y: number; n: number } | null>(null);
  const dernier = useRef(0);

  // Nouveau tour, ou la table a changé après une action : on repart de zéro.
  const signature = o ? `${o.id}|${o.jeton.x},${o.jeton.y}|${o.actionFaite}|${o.reste}` : '';
  useEffect(() => { setMode({ sorte: 'regarder' }); setVise(null); setAttente(false); }, [signature]);
  // Réponse du MJ (refus, résultat) : le joueur peut recommencer.
  useEffect(() => { if (d.reponse) setAttente(false); }, [d.reponse?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  // Sort tout juste tracé : on le vise directement.
  useEffect(() => { if (monTour && o?.viser != null) { setMode({ sorte: 'sort', id: o.viser }); setVise(null); } }, [monTour, o?.viser]);

  const demander = (x: Record<string, unknown>) => { if (!o) return; envoyer({ tour: o.id, ...x }); };
  const sort = mode.sorte === 'sort' && o ? o.sorts.find((s) => s.id === mode.id) : undefined;
  const arme = mode.sorte === 'attaquer' && o && mode.arme !== null ? o.attaques[mode.arme] : undefined;
  const depart: Cellule = o ? [o.jeton.x, o.jeton.y] : [0, 0];
  const cote = coteCaseImage(d);
  const versSvg = (ev: PointerEvent<SVGSVGElement>) => {
    const p = svg.current!.createSVGPoint();
    p.x = ev.clientX; p.y = ev.clientY;
    const q = p.matrixTransform(svg.current!.getScreenCTM()!.inverse());
    return caseVisee(d, q.x, q.y);
  };

  // Visée : case touchée (ou survolée à la souris) ; le MJ voit l'aperçu en direct.
  const viser = (ev: PointerEvent<SVGSVGElement>, final: boolean) => {
    if (!o || !monTour || attente || mode.sorte === 'regarder') return;
    const { monde, cellule } = versSvg(ev);
    if (mode.sorte === 'attaquer') {
      if (!final) return;
      const c = o.cibles.find((x) => x.x === cellule[0] && x.y === cellule[1]);
      if (c && arme && distance(d.grille, depart, [c.x, c.y]) <= porteeAttaque(arme)) setVise({ cellule, monde, cible: c.id });
      return;
    }
    if (mode.sorte === 'deplacer' && !o.cases.includes(cle(cellule))) { if (final) setVise(null); return; }
    if (mode.sorte === 'sort' && !sort) return;
    setVise({ cellule, monde });
    const t = Date.now();
    if (final || t - dernier.current > 150) {
      dernier.current = t;
      const angle = sort ? zoneVisee(d.grille, { sorte: 'sort', gabarit: sort as Gabarit, lanceur: o.jeton }, monde).angle : 0;
      demander({ faire: 'visee', cellule, angle, sort: sort?.id ?? null });
    }
  };

  const zone = sort && vise && o ? zoneVisee(d.grille, { sorte: 'sort', gabarit: sort as Gabarit, lanceur: o.jeton }, vise.monde) : null;
  const tropLoin = !!(sort && zone && sort.origine === 'point' && sort.portee > 0 && distance(d.grille, depart, zone.cellule) > sort.portee);
  const valider = () => {
    if (!o || !vise) return;
    setAttente(true);
    if (mode.sorte === 'deplacer') demander({ faire: 'deplacer', cellule: vise.cellule });
    else if (mode.sorte === 'attaquer' && mode.arme !== null && vise.cible != null) demander({ faire: 'attaquer', attaque: mode.arme, cible: vise.cible });
    else if (sort && zone) demander({ faire: 'sort', sort: sort.id, cellule: zone.cellule, angle: zone.angle });
  };

  // Ce qu'on dessine par-dessus la table.
  const cases: Cellule[] = !o || !monTour ? [] : mode.sorte === 'deplacer' ? o.cases.map((k) => k.split(',').map(Number) as Cellule) : [];
  const enPortee = (c: { x: number; y: number }) => !!arme && distance(d.grille, depart, [c.x, c.y]) <= porteeAttaque(arme);
  const caseRect = ([x, y]: Cellule, props: Record<string, unknown>) => { const [cx, cy] = versImage(d, [x, y]); return <rect key={`${x},${y}`} x={cx - cote / 2} y={cy - cote / 2} width={cote} height={cote} rx={cote * 0.12} {...props} />; };
  const [dx, dy] = versImage(d, depart);
  const arrivee = vise ? versImage(d, vise.cellule) : null;

  const aide = !o ? '' : attente ? 'Envoyé au maître du jeu…'
    : mode.sorte === 'deplacer' ? `Touchez une case en vert (${o.reste} cases de déplacement).`
    : mode.sorte === 'attaquer' ? (arme ? `Touchez une cible entourée (portée ${porteeAttaque(arme)} cases).` : 'Choisissez une arme.')
    : mode.sorte === 'sort' ? (sort ? (tropLoin ? `Trop loin : ${sort.portee} cases au plus.` : `Touchez la carte pour viser ${sort.nom}.`) : 'Choisissez un sort.')
    : 'Choisissez une action. Glissez pour déplacer la vue, pincez ou + / − pour zoomer.';

  const effet = d.effet && d.effet.id !== effetVu ? d.effet : null;

  return (
    <div className="tour-joueurs">
      <div className="tour-bandeau">
        {d.actif ? <span>Round {d.round} · <b>{monTour ? `À toi, ${d.actif.nom} !` : `Tour de ${d.actif.nom}`}</b></span> : <span>Combat</span>}
        {d.traceur && <span className="tour-trace-encours">✍ {d.traceur} trace un sceau…</span>}
        {d.evenement && <span className="tour-evenement">{d.evenement}</span>}
      </div>
      <div className="tour-carte">
        <Zoomable>
          <svg ref={svg} viewBox={`0 0 ${d.largeur} ${d.hauteur}`} preserveAspectRatio="xMidYMid meet" className={mode.sorte === 'regarder' || !monTour ? '' : 'tour-viser'}
            onPointerDown={(ev) => { appui.current = { x: ev.clientX, y: ev.clientY, n: ev.isPrimary ? 1 : (appui.current?.n ?? 0) + 1 }; }}
            onPointerMove={(ev) => { if (ev.pointerType === 'mouse' && !ev.buttons) viser(ev, false); }}
            onPointerUp={(ev) => { const a = appui.current; appui.current = null; if (a && a.n === 1 && Math.hypot(ev.clientX - a.x, ev.clientY - a.y) < 8) viser(ev, true); }}>
            <image href={url} x={0} y={0} width={d.largeur} height={d.hauteur} />
            {cases.map((c) => caseRect(c, { fill: 'rgba(69,168,74,0.32)', stroke: 'rgba(160,230,160,0.6)', strokeWidth: 1.5 }))}
            {mode.sorte === 'deplacer' && vise && caseRect(vise.cellule, { fill: 'rgba(69,168,74,0.7)', stroke: '#fff', strokeWidth: 3 })}
            {zone && casesDeZone(d.grille, zone.zone).map((c) => caseRect(c, { fill: tropLoin ? 'rgba(120,120,120,0.5)' : sort!.couleur, stroke: 'rgba(255,255,255,0.7)', strokeWidth: 2 }))}
            {mode.sorte === 'attaquer' && o?.cibles.map((c) => { const [cx, cy] = versImage(d, [c.x, c.y]); const ok = enPortee(c); return <circle key={c.id} cx={cx} cy={cy} r={cote * 0.62} fill={vise?.cible === c.id ? 'rgba(217,72,72,0.45)' : 'none'} stroke={ok ? '#e05050' : 'rgba(150,150,150,0.6)'} strokeWidth={ok ? 4 : 2} strokeDasharray={ok ? undefined : '6 6'} />; })}
            {monTour && mode.sorte !== 'regarder' && arrivee && <line x1={dx} y1={dy} x2={arrivee[0]} y2={arrivee[1]} stroke="#f2d27a" strokeWidth={4} strokeDasharray="10 8" pointerEvents="none" />}
            {o && <circle cx={dx} cy={dy} r={cote * 0.66} fill="none" stroke="#f2d27a" strokeWidth={monTour ? 5 : 3} className="tour-actif" pointerEvents="none" />}
          </svg>
        </Zoomable>
      </div>

      {monTour && o && (
        <div className="tour-actions">
          <div className="tour-etat">
            <span>Déplacement : <b>{o.reste}</b> case{o.reste > 1 ? 's' : ''}</span>
            <span>Action : <b>{o.actionFaite ? 'utilisée' : 'disponible'}</b></span>
            <span className="tour-aide">{aide}</span>
            {d.reponse?.texte && !attente && <span className="tour-reponse">{d.reponse.texte}</span>}
          </div>
          <div className="tour-boutons">
            <button className="btn" aria-pressed={mode.sorte === 'deplacer'} disabled={attente || !o.cases.length} onClick={() => { setMode({ sorte: 'deplacer' }); setVise(null); }}>🦶 Se déplacer</button>
            <button className="btn" aria-pressed={mode.sorte === 'attaquer'} disabled={attente || o.actionFaite} onClick={() => { setMode({ sorte: 'attaquer', arme: o.attaques.length === 1 ? 0 : null }); setVise(null); }}>⚔ Attaquer</button>
            <button className="btn" aria-pressed={mode.sorte === 'sort'} disabled={attente || o.actionFaite || !o.sorts.length} onClick={() => { setMode({ sorte: 'sort', id: null }); setVise(null); }}>✦ Sort ({o.sorts.length})</button>
            {o.peutTracer && <button className="btn" disabled={attente || o.actionFaite || !!o.trace} onClick={() => { setAttente(true); demander({ faire: 'tracer' }); }}>✍ Tracer un sceau</button>}
            <span style={{ flex: 1 }} />
            {mode.sorte !== 'regarder' && !attente && <button className="btn btn-principal" disabled={!vise || tropLoin || (mode.sorte === 'attaquer' && vise.cible == null)} onClick={valider}>Valider</button>}
            {mode.sorte !== 'regarder' && !attente && <button className="btn" onClick={() => { setMode({ sorte: 'regarder' }); setVise(null); }}>Annuler</button>}
            <button className="btn" disabled={attente} onClick={() => { if (window.confirm('Finir ton tour ?')) { setAttente(true); demander({ faire: 'finir' }); } }}>Finir mon tour</button>
          </div>
          {mode.sorte === 'attaquer' && o.attaques.length > 1 && (
            <div className="tour-choix">
              {o.attaques.map((a, i) => <button key={i} className="btn btn-petit" aria-pressed={mode.arme === i} onClick={() => { setMode({ sorte: 'attaquer', arme: i }); setVise(null); }}>{a.nom} <small>{a.bonus >= 0 ? '+' : ''}{a.bonus} · {a.degats}{a.portee ? ` · ${a.portee} cases` : ' · contact'}</small></button>)}
            </div>
          )}
          {mode.sorte === 'sort' && (
            <div className="tour-choix">
              {o.sorts.map((s) => <button key={s.id} className="btn btn-petit" aria-pressed={mode.id === s.id} title={s.desc} onClick={() => { setMode({ sorte: 'sort', id: s.id }); setVise(null); }}>{s.nom} <small>{s.portee ? `${s.portee} cases` : 'sur soi'}</small></button>)}
            </div>
          )}
        </div>
      )}

      {monTour && o?.trace && (
        <div className="tour-calque">
          <Suspense fallback={<div className="ecran-sous">Chargement…</div>}>
            <VueTrace donnees={o.trace as unknown as Record<string, unknown>} envoyer={(r) => envoyer({ tour: o.id, faire: 'trace', ...r })} />
          </Suspense>
        </div>
      )}
      {effet && (
        <div className="tour-calque">
          <Suspense fallback={<div className="ecran-sous">Le sceau s’éveille…</div>}>
            <VueEffet donnees={effet} envoyer={() => undefined} />
          </Suspense>
          <button className="btn tour-fermer" onClick={() => setEffetVu(effet.id)}>Revenir à la table</button>
        </div>
      )}
    </div>
  );
}
