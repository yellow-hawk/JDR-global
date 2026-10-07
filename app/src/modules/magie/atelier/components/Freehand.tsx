import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { analyser } from '../engine/analyse';
import { lireTrace } from '../engine/freehand';
import type { Stroke } from '../engine/geometry';
import type { Sceau } from '../engine/types';
import { modelesPerso } from '../engine/recognizer';
import { peutInscrire, signesDuSceau, type ProfilPJ } from '../engine/profils';
import { formatTemps, noter, type Notation } from '../engine/defi';
import { SIGNE } from '../data/signes';
import type { Lecon } from '../data/lecons';
import { Vue3D } from './Vue3D';
import { Fiche } from './Fiche';
import { SceauSVG, STAGE } from './SceauSVG';
import { Carnet } from './Carnet';

interface Props {
  mj: boolean;
  profil: ProfilPJ | null;
  majProfil: (fn: (p: ProfilPJ) => ProfilPJ) => void;
  onOuvrir: (s: Sceau) => void;
  onSave: (nom: string, notes: string, s: Sceau) => void;
}

export interface Modele { titre: string; consigne: string; sceau: Sceau; lecon?: Lecon; sortId?: string; fantome: boolean }

const toPath = (s: Stroke) => s.length === 1 ? `M${s[0].x} ${s[0].y} l0.1 0` : 'M' + s.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L');

export function Freehand({ mj, profil, majProfil, onOuvrir, onSave }: Props) {
  const [traits, setTraits] = useState<Stroke[]>([]);
  const [enCours, setEnCours] = useState<Stroke | null>(null);
  const [guide, setGuide] = useState(true);
  const [lecture, setLecture] = useState(true);
  const [play, setPlay] = useState(0);
  const [nom, setNom] = useState('');
  const [msg, setMsg] = useState('');
  const [tolerance, setTolerance] = useState(1);
  const [modele, setModele] = useState<Modele | null>(null);
  const [resultat, setResultat] = useState<{ n: Notation; temps: number; appris?: string; record?: boolean } | null>(null);
  const [debut, setDebut] = useState<number | null>(null);
  const [fin, setFin] = useState<number | null>(null);
  const [maintenant, setMaintenant] = useState(Date.now());
  const svgRef = useRef<SVGSVGElement>(null);
  const etaitActif = useRef(false);

  // signes autorisés : ceux du personnage (+ ceux enseignés par la leçon en cours)
  const connus = useMemo(() => {
    if (!profil) return undefined;
    const s = new Set(profil.signes);
    if (modele?.lecon) signesDuSceau(modele.sceau).forEach((x) => s.add(x));
    return s;
  }, [profil, modele]);
  const perso = useMemo(() => (profil && Object.keys(profil.calibrage).length ? modelesPerso(profil.id, profil.calibrage, (id) => SIGNE[id].famille) : undefined), [profil]);

  const L = useMemo(() => lireTrace(traits, STAGE, tolerance, { connus, perso }), [traits, tolerance, connus, perso]);
  const analyse = useMemo(() => analyser(L.sceau), [L]);
  const fendPret = !!L.sceau.fendu && analyse.pret;

  // chrono : démarre au premier trait, s'arrête quand le sort s'éveille (ou qu'un sceau fendu est prêt)
  useEffect(() => {
    if (debut === null || fin !== null) return;
    const id = window.setInterval(() => setMaintenant(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [debut, fin]);
  const temps = debut === null ? 0 : (fin ?? maintenant) - debut;

  // le sort s'éveille quand la cerne se ferme sur un sceau lisible
  useEffect(() => {
    const ok = analyse.actif || fendPret;
    if (ok && !etaitActif.current) {
      const t = debut !== null ? Date.now() - debut : 0;
      if (debut !== null && fin === null) setFin(Date.now());
      if (analyse.actif) setPlay((k) => k + 1);
      if (modele) evaluer(t);
    }
    etaitActif.current = ok;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyse.actif, fendPret]);

  const evaluer = (t: number) => {
    if (!modele) return;
    const n = noter(modele.sceau, L.sceau);
    let appris: string | undefined, record = false;
    if (profil) {
      if (modele.lecon && n.score >= 70) {
        const l = modele.lecon;
        majProfil((p) => ({ ...p, lecons: p.lecons.includes(l.id) ? p.lecons : [...p.lecons, l.id], signes: l.apprend && !p.signes.includes(l.apprend) ? [...p.signes, l.apprend] : p.signes }));
        if (l.apprend && !profil.signes.includes(l.apprend)) appris = SIGNE[l.apprend].nom;
      }
      const cle = modele.sortId ?? modele.lecon?.id;
      if (cle) {
        const ancien = profil.defis[cle];
        if (!ancien || n.score > ancien.score || (n.score === ancien.score && t < ancien.temps)) {
          record = !!ancien;
          majProfil((p) => ({ ...p, defis: { ...p.defis, [cle]: { score: n.score, temps: t, date: Date.now() } } }));
        }
      }
    }
    setResultat({ n, temps: t, appris, record });
  };

  const effacer = () => { setTraits([]); setDebut(null); setFin(null); setResultat(null); etaitActif.current = false; };
  const pos = (e: PointerEvent) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId); setEnCours([pos(e)]);
    if (debut === null) { setDebut(Date.now()); setMaintenant(Date.now()); }
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!enCours) return;
    const p = pos(e), last = enCours[enCours.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) > 1.5) setEnCours([...enCours, p]);
  };
  const up = () => { if (enCours) { setTraits((t) => [...t, enCours]); setEnCours(null); } };

  const flash = (t: string) => { setMsg(t); window.setTimeout(() => setMsg(''), 2200); };
  const enregistrer = () => { onSave(nom || analyse.nomSuggere, 'Tracé à main levée', L.sceau); flash('Enregistré dans le grimoire du MJ'); };
  const inscrire = () => {
    if (!profil) return;
    const v = peutInscrire(profil, L.sceau);
    if (!v.ok) { flash(v.raison!); return; }
    const propre: Sceau = { ...L.sceau, trace: undefined, sansCerne: undefined };
    majProfil((p) => ({ ...p, grimoire: [...p.grimoire, { id: Math.random().toString(36).slice(2, 10), nom: nom || analyse.nomSuggere, notes: `Tracé en ${formatTemps(temps)}`, sceau: propre, cree: Date.now() }] }));
    flash(`« ${nom || analyse.nomSuggere} » inscrit dans le grimoire de ${profil.nom}`);
  };
  const commencer = (m: Modele) => { setModele(m); effacer(); window.requestAnimationFrame(() => document.querySelector('.atelier.libre .toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); };
  const couleur = analyse.coeur?.couleur;
  const inconnus = [...new Set(L.inconnus)];

  return (
    <div className="atelier libre">
      <div className="scene-col">
        <div className="toolbar">
          <span className={`chrono ${fin !== null ? 'arrete' : debut !== null ? 'tourne' : ''}`} aria-live="off" title="Temps de tracé : démarre au premier trait">
            ⏱ {formatTemps(temps)}
          </span>
          <button className="btn" onClick={() => setTraits((t) => t.slice(0, -1))} disabled={!traits.length}>Annuler le trait</button>
          <button className="btn ghost" onClick={effacer} disabled={!traits.length && debut === null}>Effacer</button>
          <label className="check"><input id="guide-libre" type="checkbox" checked={guide} onChange={(e) => setGuide(e.target.checked)} /> Guide</label>
          <label className="check"><input id="lecture-libre" type="checkbox" checked={lecture} onChange={(e) => setLecture(e.target.checked)} /> Montrer la lecture</label>
          {mj && (
            <label className="check">Tolérance
              <select id="tolerance" value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))}>
                <option value={0.5}>Indulgente</option>
                <option value={1}>Normale</option>
                <option value={1.6}>Stricte</option>
              </select>
            </label>
          )}
        </div>

        {modele && (
          <div className="modele">
            <div className="modele-vignette"><SceauSVG sceau={modele.sceau} paire ariaLabel={`Modèle : ${modele.titre}`} /></div>
            <div className="modele-texte">
              <div className="tag">{modele.lecon ? `Leçon${modele.lecon.apprend ? ` · apprend ${SIGNE[modele.lecon.apprend].nom}` : ''}` : 'Défi'}</div>
              <b>{modele.titre}</b>
              <p>{modele.consigne}</p>
              <div className="fiche-actions">
                <label className="check"><input id="fantome" type="checkbox" checked={modele.fantome} onChange={(e) => setModele({ ...modele, fantome: e.target.checked })} /> Modèle en transparence</label>
                <button className="btn ghost" onClick={effacer}>Recommencer</button>
                <button className="btn ghost" onClick={() => { setModele(null); setResultat(null); }}>Quitter</button>
              </div>
            </div>
          </div>
        )}
        {resultat && (
          <div className={`resultat m-${resultat.n.mention}`} role="status">
            <div className="res-tete"><b>{resultat.n.mention}</b><span className="res-score">{resultat.n.score}/100</span><span>⏱ {formatTemps(resultat.temps)}</span>{resultat.record && <span className="badge">Nouveau record</span>}</div>
            {resultat.appris && <p className="ok-t">Signe appris : <b>{resultat.appris}</b>. Il est ajouté au carnet.</p>}
            {modele?.lecon && resultat.n.score < 70 && <p className="muted">Il faut 70 points pour valider la leçon.</p>}
            <ul>{resultat.n.details.map((d) => <li key={d.label}><b>{d.label}</b> {d.points}/{d.max} · <span className="muted">{d.note}</span></li>)}</ul>
          </div>
        )}

        <div className="scene papier">
          <svg ref={svgRef} viewBox={`0 0 ${STAGE} ${STAGE}`} className={`tracer ${analyse.actif ? 'actif' : ''}`} style={analyse.actif && couleur ? ({ ['--glow' as string]: couleur }) : undefined}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="img" aria-label="Feuille de tracé">
            {modele?.fantome && <g className="fantome"><SceauSVG sceau={modele.sceau} paire ariaLabel="Modèle en transparence" /></g>}
            {guide && !modele?.fantome && (
              <g className="guides">
                <circle cx={300} cy={300} r={212} fill="none" strokeDasharray="4 8" />
                <circle cx={300} cy={300} r={127} fill="none" strokeDasharray="2 10" />
                <circle cx={300} cy={300} r={60} fill="none" strokeDasharray="2 10" />
              </g>
            )}
            {traits.map((s, i) => <path key={i} d={toPath(s)} className="encre" />)}
            {enCours && <path d={toPath(enCours)} className="encre" />}
            {lecture && L.groupes.map((g, i) => (
              <g key={i} className={`lu ${g.ok ? 'ok' : g.inconnu ? 'inconnu' : 'ko'}`}>
                <rect x={g.box.x - 6} y={g.box.y - 6} width={g.box.w + 12} height={g.box.h + 12} rx={6} />
                <text x={g.box.x + g.box.w / 2} y={g.box.y - 11} textAnchor="middle">{g.ok || g.inconnu ? g.label : `? ${g.label} (${Math.round(g.score * 100)} %)`}</text>
              </g>
            ))}
            {lecture && L.cerne && L.sceau.entaille !== null && (() => {
              const a = (L.sceau.entaille * Math.PI) / 180;
              return <circle cx={L.centre.x + L.R * Math.sin(a)} cy={L.centre.y - L.R * Math.cos(a)} r={14} className="entaille-mark" />;
            })()}
          </svg>
        </div>
        {inconnus.length > 0 && profil && <p className="alerte-inconnu">{profil.nom} ne connaît pas encore : {inconnus.map((i) => SIGNE[i].nom).join(', ')}. Ces signes n’agissent pas.</p>}
        {fendPret && <div className="toolbar"><button className="btn primary" onClick={() => setPlay((k) => k + 1)}>Rejoindre les deux moitiés</button><span className="muted">Le sceau fendu s’éveille quand ses moitiés se touchent.</span></div>}

        <div className="save">
          <input id="nom-libre" placeholder={analyse.nomSuggere} value={nom} onChange={(e) => setNom(e.target.value)} aria-label="Nom du sort" />
          {profil && <button className="btn primary" onClick={inscrire} disabled={!L.sceau.coeur}>Inscrire dans le grimoire de {profil.nom}</button>}
          {mj && <button className="btn" onClick={enregistrer} disabled={!L.sceau.coeur}>Grimoire du MJ</button>}
          {mj && <button className="btn" onClick={() => onOuvrir({ ...L.sceau, trace: undefined, sansCerne: undefined })} disabled={!L.sceau.coeur}>Ouvrir dans le composeur</button>}
          {msg && <span className="ok-t" role="status">{msg}</span>}
        </div>

        <Carnet profil={profil} majProfil={majProfil} onModele={commencer} />
      </div>

      <div className="cote">
        <Vue3D traits={traits} centre={L.centre} R={L.R} sceau={L.sceau} analyse={analyse} playKey={play} />
        <Fiche analyse={analyse} sceau={L.sceau} nom={nom} mj={mj} onLancer={() => setPlay((k) => k + 1)} peutLancer={analyse.actif || fendPret} libelleLancer="Relancer le sort" />
      </div>
    </div>
  );
}
