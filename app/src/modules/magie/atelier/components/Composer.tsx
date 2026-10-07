import { useEffect, useMemo, useState } from 'react';
import { COEURS, NOEUDS, RAMEAUX, RANGS, nomSigne, effetSigne, type Signe } from '../data/signes';
import { analyser } from '../engine/analyse';
import { generer, INTENTIONS, type Intention } from '../engine/generateur';
import type { Placement, Sceau } from '../engine/types';
import { Vue3D } from './Vue3D';
import { dessinDuSceau } from './Grimoire';
import { Fiche, Rang } from './Fiche';
import { GlyphIcon } from './Glyph';
import { SceauSVG, STAGE, rayonTaille, type Selection } from './SceauSVG';

type Onglet = 'coeur' | 'rameau' | 'noeud';

const norm = (a: number) => ((Math.round(a) % 360) + 360) % 360;
const ecart = (a: number, b: number) => { const d = Math.abs(norm(a) - norm(b)); return Math.min(d, 360 - d); };

interface Props {
  sceau: Sceau;
  setSceau: (s: Sceau) => void;
  mj: boolean;
  nom: string;
  setNom: (n: string) => void;
  onSave: (nom: string, notes: string) => void;
}

export function Composer({ sceau, setSceau, mj, nom, setNom, onSave }: Props) {
  const [onglet, setOnglet] = useState<Onglet>('rameau');
  const [outil, setOutil] = useState<string | null>('jet');
  const [inverse, setInverse] = useState(false);
  const [aimant, setAimant] = useState(true);
  const [guides, setGuides] = useState(true);
  const [selection, setSelection] = useState<Selection>(null);
  const [play, setPlay] = useState(0);
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');
  const [gIntention, setGIntention] = useState<Intention>('Hasard');
  const [gRang, setGRang] = useState<1 | 2 | 3>(2);
  const [gCoeur, setGCoeur] = useState('hasard-element');
  const generer1 = () => {
    const g = generer({ intention: gIntention, rangMax: gRang, coeur: gCoeur, scelles: mj });
    setSceau(g.sceau); setNom(g.nom); setSelection(null); setPlay((k) => k + 1);
  };
  const analyse = useMemo(() => analyser(sceau), [sceau]);
  const traits = useMemo(() => dessinDuSceau(sceau), [sceau]);
  // sceau édité : le principal (A) ou le sceau greffé (B)
  const [edition, setEdition] = useState<'A' | 'B'>('A');
  const ed = edition === 'B' && sceau.greffe ? 'B' : 'A';
  const courant: Sceau = ed === 'B' ? sceau.greffe! : sceau;
  const setCourant = (x: Sceau) => (ed === 'B' ? setSceau({ ...sceau, greffe: x }) : setSceau({ ...x, greffe: sceau.greffe ?? null }));
  type Cle = 'rameau' | 'noeud' | 'crameau' | 'cnoeud';
  const liste_ = (x: Sceau, k: Cle): Placement[] => (k === 'rameau' ? x.rameaux : k === 'noeud' ? x.noeuds : k === 'crameau' ? x.couronne?.rameaux ?? [] : x.couronne?.noeuds ?? []);
  const avec = (x: Sceau, k: Cle, l: Placement[]): Sceau => (k === 'rameau' ? { ...x, rameaux: l } : k === 'noeud' ? { ...x, noeuds: l } : { ...x, couronne: { rameaux: k === 'crameau' ? l : x.couronne?.rameaux ?? [], noeuds: k === 'cnoeud' ? l : x.couronne?.noeuds ?? [] } });

  const liste: Signe[] = onglet === 'coeur' ? COEURS.filter((c) => mj || c.categorie !== 'scelle') : onglet === 'rameau' ? RAMEAUX : NOEUDS;

  const placer = (angle: number, rFrac: number) => {
    if (!outil) { setSelection(null); return; }
    const a = aimant ? norm(Math.round(angle / 15) * 15) : norm(angle);
    if (onglet === 'coeur') { setCourant({ ...courant, coeur: { id: outil, inv: inverse } }); setSelection({ kind: 'coeur' }); return; }
    const dbl = !!courant.couronne;
    const k: Cle = onglet === 'rameau' ? (dbl && rFrac > 1.08 ? 'crameau' : 'rameau') : (dbl && rFrac > 1.36 ? 'cnoeud' : 'noeud');
    const inv = k === 'noeud' ? rFrac < 1 : k === 'cnoeud' ? rFrac < 1.52 : inverse;
    const list = liste_(courant, k).filter((p) => ecart(p.angle, a) > 8);
    setCourant(avec(courant, k, [...list, { id: outil, angle: a, inv }]));
    setSelection({ kind: k, index: list.length });
  };

  const sel = selection;
  const selItem = sel && sel.kind !== 'coeur' ? liste_(courant, sel.kind)[sel.index] ?? null : null;
  const modifier = (fn: (p: Placement) => Placement) => {
    if (!sel || sel.kind === 'coeur') return;
    setCourant(avec(courant, sel.kind, liste_(courant, sel.kind).map((p, i) => (i === sel.index ? fn(p) : p))));
  };
  const supprimer = () => {
    if (!sel) return;
    if (sel.kind === 'coeur') setCourant({ ...courant, coeur: null });
    else setCourant(avec(courant, sel.kind, liste_(courant, sel.kind).filter((_, i) => i !== sel.index)));
    setSelection(null);
  };
  const repartir = (n: number) => {
    if (!sel || sel.kind === 'coeur' || !selItem) return;
    const autres = liste_(courant, sel.kind).filter((p) => !(p.id === selItem.id && p.inv === selItem.inv));
    const copies = Array.from({ length: n }, (_, k) => ({ ...selItem, angle: norm(selItem.angle + (k * 360) / n) }));
    const libres = autres.filter((p) => copies.every((c) => ecart(c.angle, p.angle) > 8));
    setCourant(avec(courant, sel.kind, [...libres, ...copies]));
    setSelection({ kind: sel.kind, index: libres.length });
  };
  const inverserCoeur = () => courant.coeur && setCourant({ ...courant, coeur: { ...courant.coeur, inv: !courant.coeur.inv } });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select')) return;
      if (!sel) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); supprimer(); }
      if (e.key === 'i' || e.key === 'I') sel.kind === 'coeur' ? inverserCoeur() : modifier((p) => ({ ...p, inv: !p.inv }));
      if (e.key === 'ArrowLeft') modifier((p) => ({ ...p, angle: norm(p.angle - 15) }));
      if (e.key === 'ArrowRight') modifier((p) => ({ ...p, angle: norm(p.angle + 15) }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const lancer = () => {
    if (sceau.entaille !== null) setSceau({ ...sceau, entaille: null });
    setPlay((k) => k + 1);
  };
  const basculerGreffe = (on: boolean) => {
    if (on) { setSceau({ ...sceau, greffe: { ...sceau, greffe: null, trace: undefined } }); setEdition('B'); }
    else { setSceau({ ...sceau, greffe: null }); setEdition('A'); }
    setSelection(null);
  };
  const enregistrer = () => { onSave(nom || analyse.nomSuggere, notes); setMsg('Enregistré dans le grimoire'); setTimeout(() => setMsg(''), 1800); };

  const kindOf = (s: Signe) => s.famille;
  const groupes: [string, Signe[]][] = onglet === 'coeur'
    ? [['Élémentaires', liste.filter((s) => s.categorie === 'element')], ['De nature', liste.filter((s) => s.categorie === 'nature')], ...(mj ? [['Scellés · MJ', liste.filter((s) => s.categorie === 'scelle')] as [string, Signe[]]] : [])]
    : ([1, 2, 3] as const).map((r) => [RANGS[r], liste.filter((s) => s.rang === r)] as [string, Signe[]]);

  return (
    <div className="atelier">
      <aside className="palette" aria-label="Palette de signes">
        <details className="generateur" open>
          <summary>Générateur de sort</summary>
          <div className="gen-champs">
            <label>Intention<select id="g-intention" value={gIntention} onChange={(e) => setGIntention(e.target.value as Intention)}>{INTENTIONS.map((i) => <option key={i}>{i}</option>)}</select></label>
            <label>Rang max<select id="g-rang" value={gRang} onChange={(e) => setGRang(Number(e.target.value) as 1 | 2 | 3)}><option value={1}>Apprenti</option><option value={2}>Compagnon</option><option value={3}>Maître</option></select></label>
            <label>Cœur<select id="g-coeur" value={gCoeur} onChange={(e) => setGCoeur(e.target.value)}>
              <option value="hasard-element">Élément au hasard</option>
              <option value="hasard">N’importe lequel</option>
              {COEURS.filter((c) => mj || c.categorie !== 'scelle').map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select></label>
          </div>
          <button className="btn primary" onClick={generer1}>Générer un sort</button>
        </details>
        <div className="tabs" role="tablist">
          {(['coeur', 'rameau', 'noeud'] as Onglet[]).map((o) => (
            <button key={o} role="tab" aria-selected={onglet === o} className={onglet === o ? 'on' : ''} onClick={() => { setOnglet(o); setOutil(null); }}>
              {o === 'coeur' ? 'Cœurs' : o === 'rameau' ? 'Rameaux' : 'Nœuds'}
            </button>
          ))}
        </div>
        <p className="aide">
          {onglet === 'coeur' && 'Choisissez un Cœur puis cliquez dans le sceau.'}
          {onglet === 'rameau' && 'Choisissez un Rameau puis cliquez autour du Cœur pour le placer.'}
          {onglet === 'noeud' && 'Cliquez à l’extérieur de la cerne (à l’endroit) ou à l’intérieur (inversé).'}
          {courant.couronne && ' Double cerne : cliquez entre les deux anneaux pour placer dans la couronne.'}
        </p>
        {onglet !== 'noeud' && (
          <label className="check"><input id="inv-outil" type="checkbox" checked={inverse} onChange={(e) => setInverse(e.target.checked)} /> Placer inversé</label>
        )}
        {groupes.map(([titre, sg]) => sg.length > 0 && (
          <div key={titre} className="pal-groupe">
            <div className="pal-titre">{titre}{onglet !== 'coeur' && <Rang n={sg[0].rang} />}</div>
            <div className="pal-grid">
              {sg.map((s) => (
                <button key={s.id} className={`pal-item ${outil === s.id ? 'on' : ''} ${s.categorie === 'scelle' ? 'scelle' : ''}`} onClick={() => setOutil(outil === s.id ? null : s.id)}
                  title={`${nomSigne(s.id, inverse && onglet !== 'noeud')} : ${effetSigne(s.id, inverse && onglet !== 'noeud')}`}>
                  <GlyphIcon id={s.id} kind={kindOf(s)} inv={inverse && onglet !== 'noeud'} size={38} />
                  <span>{nomSigne(s.id, inverse && onglet !== 'noeud')}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <div className="scene-col">
        <div className="toolbar">
          <div className="seg" role="group" aria-label="Taille du sceau">
            {([1, 2, 3] as const).map((t) => <button key={t} className={courant.taille === t ? 'on' : ''} onClick={() => setCourant({ ...courant, taille: t })}>{['', 'Petit', 'Moyen', 'Grand'][t]}</button>)}
          </div>
          <label className="check"><input id="entaille" type="checkbox" checked={courant.entaille !== null} onChange={(e) => setCourant({ ...courant, entaille: e.target.checked ? 180 : null, fendu: null })} /> Entaille</label>
          <label className="check"><input id="double" type="checkbox" checked={!!courant.couronne} onChange={(e) => { setCourant({ ...courant, couronne: e.target.checked ? { rameaux: [], noeuds: [] } : null }); setSelection(null); }} /> Double cerne</label>
          <label className="check"><input id="fendu" type="checkbox" checked={!!courant.fendu} onChange={(e) => setCourant({ ...courant, fendu: e.target.checked ? { axe: 90 } : null, entaille: null })} /> Fendu</label>
          <label className="check"><input id="greffe" type="checkbox" checked={!!sceau.greffe} onChange={(e) => basculerGreffe(e.target.checked)} /> Greffe</label>
          {sceau.greffe && (
            <div className="seg" role="group" aria-label="Sceau édité">
              <button className={ed === 'A' ? 'on' : ''} onClick={() => { setEdition('A'); setSelection(null); }}>Sceau A</button>
              <button className={ed === 'B' ? 'on' : ''} onClick={() => { setEdition('B'); setSelection(null); }}>Sceau B</button>
            </div>
          )}
          <label className="check"><input id="aimant" type="checkbox" checked={aimant} onChange={(e) => setAimant(e.target.checked)} /> Aimant 15°</label>
          <label className="check"><input id="guides" type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} /> Guides</label>
          <button className="btn ghost" onClick={() => { setSceau({ coeur: null, rameaux: [], noeuds: [], taille: 2, entaille: null }); setSelection(null); }}>Tout effacer</button>
        </div>
        <div className={`scene ${outil ? 'placing' : ''}`}>
          <SceauSVG sceau={courant} selection={selection} guides={guides} onStageClick={placer} onSelect={(s) => { setSelection(s); }}
            actif={play > 0 && analyse.actif} couleur={analyse.coeur?.couleur} ariaLabel="Sceau en cours de composition" />
          {sceau.greffe && <div className="mini-paire" title="Aperçu de la greffe"><SceauSVG sceau={sceau} paire ariaLabel="Les deux sceaux greffés" /></div>}
        </div>

        {sel && (
          <div className="selbar" aria-live="polite">
            {sel.kind === 'coeur' && courant.coeur ? (
              <>
                <b>{nomSigne(courant.coeur.id, courant.coeur.inv)}</b><span className="muted">{effetSigne(courant.coeur.id, courant.coeur.inv)}</span>
                <button className="btn" onClick={inverserCoeur}>Inverser (gerce)</button>
                <button className="btn danger" onClick={supprimer}>Supprimer</button>
              </>
            ) : selItem ? (
              <>
                <b className={selItem.inv ? 'inv-t' : ''}>{nomSigne(selItem.id, selItem.inv)}</b>
                <span className="muted">{effetSigne(selItem.id, selItem.inv)} · {selItem.angle}°</span>
                <button className="btn" onClick={() => modifier((p) => ({ ...p, angle: norm(p.angle - 15) }))} aria-label="Tourner de -15°">↺</button>
                <button className="btn" onClick={() => modifier((p) => ({ ...p, angle: norm(p.angle + 15) }))} aria-label="Tourner de +15°">↻</button>
                <button className="btn" onClick={() => modifier((p) => ({ ...p, inv: !p.inv }))}>Inverser</button>
                <span className="seg mini" role="group" aria-label="Répartir symétriquement">
                  {[2, 3, 4, 6].map((n) => <button key={n} onClick={() => repartir(n)} title={`Répartir ${n} exemplaires autour du Cœur`}>×{n}</button>)}
                </span>
                <button className="btn danger" onClick={supprimer}>Supprimer</button>
              </>
            ) : null}
          </div>
        )}

        <div className="save">
          <input id="nom-sort" placeholder={analyse.nomSuggere} value={nom} onChange={(e) => setNom(e.target.value)} aria-label="Nom du sort" />
          <input id="notes-sort" placeholder="Notes (PNJ, rencontre, lieu…)" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notes" />
          <button className="btn" onClick={enregistrer} disabled={!sceau.coeur}>Enregistrer</button>
          {msg && <span className="ok-t" role="status">{msg}</span>}
        </div>
      </div>

      <div className="cote">
        <Vue3D traits={traits} centre={{ x: STAGE / 2, y: STAGE / 2 }} R={rayonTaille(sceau.taille)} sceau={sceau} analyse={analyse} playKey={play} />
        <Fiche analyse={analyse} sceau={sceau} nom={nom} mj onLancer={lancer} peutLancer={analyse.pret || analyse.actif}
          libelleLancer={sceau.fendu ? 'Rejoindre les moitiés et lancer' : sceau.entaille !== null ? 'Fermer l’entaille et lancer' : 'Lancer le sort'} />
      </div>
    </div>
  );
}

