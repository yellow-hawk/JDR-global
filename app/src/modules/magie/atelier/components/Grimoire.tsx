import { useMemo, useRef, useState } from 'react';
import { analyser } from '../engine/analyse';
import type { SortEnregistre, Sceau } from '../engine/types';
import { traitsDuSceau, type Stroke } from '../engine/geometry';
import { retirerExemple, restaurerExemples, chargerGrimoire } from '../engine/storage';
import { CATEGORIES } from '../data/grimoire';
import { COEURS, NOEUDS, RAMEAUX, RANGS, SIGNE, type Signe } from '../data/signes';
import { Fiche, Rang } from './Fiche';
import { GlyphIcon } from './Glyph';
import { SceauSVG, STAGE, rayonTaille } from './SceauSVG';
import { Vue3D } from './Vue3D';
import { verifierSort, type ProfilPJ } from '../engine/profils';
import { imprimer } from '../engine/impression';

interface Props {
  sorts: SortEnregistre[];
  setSorts: (s: SortEnregistre[]) => void;
  onOuvrir: (s: SortEnregistre) => void;
  profils?: ProfilPJ[];
  setProfils?: (l: ProfilPJ[]) => void;
}

const COULEURS_EXPORT: Record<string, string> = { 'var(--ink)': '#1A2140', 'var(--inv)': '#A33F6C', 'var(--muted)': '#59627F' };

function telecharger(nomFichier: string, contenu: string, type: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = nomFichier; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function dessinDuSceau(s: Sceau): Stroke[] {
  return traitsDuSceau(s, STAGE / 2, STAGE / 2, rayonTaille(s.taille));
}

function CarteSigne({ s }: { s: Signe }) {
  const kind = s.famille;
  return (
    <article className={`carte-signe ${s.categorie === 'scelle' ? 'scelle' : ''}`}>
      <div className="cs-glyphes">
        <div><GlyphIcon id={s.id} kind={kind} size={54} /><span className="tag">endroit</span></div>
        <div><GlyphIcon id={s.id} kind={kind} inv size={54} /><span className="tag inv-t">inversé</span></div>
      </div>
      <div className="cs-texte">
        <div className="cs-titre"><b>{s.nom}</b><Rang n={s.rang} /></div>
        <p>{s.effet}</p>
        <div className="cs-titre"><b className="inv-t">{s.nomInverse}</b></div>
        <p>{s.effetInverse}</p>
      </div>
    </article>
  );
}

export function Grimoire({ sorts, setSorts, onOuvrir, profils = [], setProfils }: Props) {
  const [onglet, setOnglet] = useState<'sorts' | 'signes'>('sorts');
  const [filtre, setFiltre] = useState('');
  const [cat, setCat] = useState<string>('Tous');
  const [rang, setRang] = useState(0);
  const [aSupprimer, setASupprimer] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [courant, setCourant] = useState<SortEnregistre | null>(sorts[0] ?? null);
  const [play, setPlay] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const analyses = useMemo(() => new Map(sorts.map((s) => [s.id, analyser(s.sceau)])), [sorts]);
  const cats = ['Tous', ...CATEGORIES.filter((c) => sorts.some((s) => s.categorie === c)), ...(sorts.some((s) => !s.categorie || s.categorie === 'Mes sorts') ? ['Mes sorts'] : [])];
  const visibles = sorts.filter((s) =>
    (cat === 'Tous' || (s.categorie ?? 'Mes sorts') === cat) &&
    (!rang || analyses.get(s.id)!.rang === rang) &&
    (s.nom + ' ' + s.notes).toLowerCase().includes(filtre.toLowerCase()));

  const lancer = (s: SortEnregistre) => { setCourant(s); setPlay((k) => k + 1); };
  const exporterSVG = (s: SortEnregistre) => {
    const el = document.querySelector(`[data-sort="${s.id}"] svg`);
    if (!el) return;
    let xml = el.outerHTML;
    for (const [k, v] of Object.entries(COULEURS_EXPORT)) xml = xml.split(k).join(v);
    xml = xml.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    telecharger(`${s.nom}.svg`, xml, 'image/svg+xml');
  };
  const importer = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as SortEnregistre[];
      if (!Array.isArray(data)) throw new Error();
      const ids = new Set(sorts.map((s) => s.id));
      setSorts([...sorts, ...data.filter((d) => d.sceau && !ids.has(d.id))]);
      setMsg(`${data.length} sort(s) importé(s)`);
    } catch { setMsg('Fichier illisible : choisissez un export JSON du grimoire.'); }
  };
  const supprimer = (s: SortEnregistre) => {
    retirerExemple(s.id);
    setSorts(sorts.filter((x) => x.id !== s.id));
    setASupprimer(null);
    if (courant?.id === s.id) setCourant(null);
  };
  const donner = (s: SortEnregistre, pid: string) => {
    const p = profils.find((x) => x.id === pid);
    if (!p || !setProfils) return;
    if (p.grimoire.length >= p.emplacements) { setMsg(`Le grimoire de ${p.nom} est plein (${p.emplacements}).`); return; }
    if (p.grimoire.some((x) => x.nom === s.nom)) { setMsg(`${p.nom} possède déjà « ${s.nom} ».`); return; }
    const copie: SortEnregistre = { ...s, id: Math.random().toString(36).slice(2, 10), exemple: undefined, cree: Date.now() };
    setProfils(profils.map((x) => (x.id === pid ? { ...x, grimoire: [...x.grimoire, copie] } : x)));
    const v = verifierSort(p, s.sceau);
    setMsg(`« ${s.nom} » ajouté au grimoire de ${p.nom}` + (v.inconnus.length ? ` — signes encore inconnus : ${v.inconnus.map((i) => SIGNE[i].nom).join(', ')}` : ''));
  };
  const traits = useMemo(() => (courant ? dessinDuSceau(courant.sceau) : []), [courant]);
  const aCourant = courant ? analyses.get(courant.id) ?? analyser(courant.sceau) : null;

  return (
    <div className="grimoire">
      <div className="tabs grim-tabs" role="tablist">
        <button role="tab" aria-selected={onglet === 'sorts'} className={onglet === 'sorts' ? 'on' : ''} onClick={() => setOnglet('sorts')}>Sorts ({sorts.length})</button>
        <button role="tab" aria-selected={onglet === 'signes'} className={onglet === 'signes' ? 'on' : ''} onClick={() => setOnglet('signes')}>Signes (32)</button>
      </div>

      {onglet === 'signes' ? (
        <div className="signes-ref">
          <p className="muted">Inversion : le Cœur est barré d’une gerce ; le Rameau pointe vers le Cœur ; le Nœud est tracé à l’intérieur de la cerne.</p>
          <h3>Cœurs</h3>
          <div className="cs-grille">{COEURS.map((s) => <CarteSigne key={s.id} s={s} />)}</div>
          {([1, 2, 3] as const).map((r) => (
            <div key={r}>
              <h3>Rameaux · {RANGS[r]} <Rang n={r} /></h3>
              <div className="cs-grille">{RAMEAUX.filter((s) => s.rang === r).map((s) => <CarteSigne key={s.id} s={s} />)}</div>
            </div>
          ))}
          {([1, 2, 3] as const).map((r) => (
            <div key={'n' + r}>
              <h3>Nœuds · {RANGS[r]} <Rang n={r} /></h3>
              <div className="cs-grille">{NOEUDS.filter((s) => s.rang === r).map((s) => <CarteSigne key={s.id} s={s} />)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grim-corps">
          <div className="grim-liste">
            <div className="toolbar">
              <input id="filtre" placeholder="Chercher un sort, un PNJ, un lieu…" value={filtre} onChange={(e) => setFiltre(e.target.value)} aria-label="Chercher" />
              <select id="filtre-rang" value={rang} onChange={(e) => setRang(Number(e.target.value))} aria-label="Rang">
                <option value={0}>Tous les rangs</option><option value={1}>Apprenti</option><option value={2}>Compagnon</option><option value={3}>Maître</option>
              </select>
            </div>
            <div className="chips" role="group" aria-label="Catégories">
              {cats.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
            </div>
            <div className="toolbar">
              <button className="btn" onClick={() => telecharger('grimoire.json', JSON.stringify(sorts, null, 2), 'application/json')}>Exporter (JSON)</button>
              <button className="btn" onClick={() => fileRef.current?.click()}>Importer</button>
              <button className="btn" disabled={!visibles.length} onClick={() => imprimer(visibles.map((s) => ({ nom: s.nom, sceau: s.sceau, notes: s.notes, categorie: s.categorie })), cat === 'Tous' ? 'Grimoire de l’atelier' : cat, `${visibles.length} sorts`)}>Imprimer ({visibles.length})</button>
              <button className="btn ghost" onClick={() => { restaurerExemples(); setSorts(chargerGrimoire()); setMsg('Sorts de base restaurés'); }}>Restaurer les sorts de base</button>
              <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importer(e.target.files[0])} />
              {msg && <span className="muted" role="status">{msg}</span>}
            </div>
            {visibles.length === 0 && <p className="vide">Aucun sort ne correspond. Changez de catégorie ou composez-en un dans le Composeur.</p>}
            <div className="cartes">
              {visibles.map((s) => {
                const a = analyses.get(s.id)!;
                return (
                  <article key={s.id} className={`carte ${courant?.id === s.id ? 'sel' : ''}`} data-sort={s.id}>
                    <button className="carte-vignette" onClick={() => lancer(s)} aria-label={`Lancer ${s.nom} en 3D`}>
                      <SceauSVG sceau={s.sceau} ariaLabel={s.nom} />
                    </button>
                    <div className="carte-corps">
                      <div className="tag">{s.categorie ?? 'Mes sorts'}</div>
                      <h3>{s.nom}</h3>
                      <div className="badges">
                        <span className="badge"><Rang n={a.rang} /> {RANGS[a.rang]}</span>
                        <span className="badge">+{a.difficulte}</span>
                        <span className="badge">Puiss. {a.puissance}</span>
                        {a.interdit && <span className="badge interdit">Interdit</span>}
                        {s.sceau.entaille !== null && <span className="badge pret">Préparé</span>}
                      </div>
                      {s.notes && <p className="muted">{s.notes}</p>}
                      <div className="carte-actions">
                        <button className="btn primary" onClick={() => lancer(s)}>Lancer</button>
                        <button className="btn" onClick={() => onOuvrir(s)}>Modifier</button>
                        <button className="btn" onClick={() => exporterSVG(s)}>SVG</button>
                        {profils.length > 0 && (
                          <select className="donner" value="" aria-label={`Donner ${s.nom} à un personnage`} onChange={(e) => e.target.value && donner(s, e.target.value)}>
                            <option value="">Donner à un PJ…</option>
                            {profils.map((p) => <option key={p.id} value={p.id}>{p.nom} ({p.grimoire.length}/{p.emplacements})</option>)}
                          </select>
                        )}
                        {aSupprimer === s.id ? (
                          <>
                            <button className="btn danger" onClick={() => supprimer(s)}>Confirmer</button>
                            <button className="btn ghost" onClick={() => setASupprimer(null)}>Garder</button>
                          </>
                        ) : <button className="btn ghost" onClick={() => setASupprimer(s.id)}>Supprimer</button>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
          <div className="cote">
            {courant && aCourant ? (
              <>
                <Vue3D traits={traits} centre={{ x: STAGE / 2, y: STAGE / 2 }} R={rayonTaille(courant.sceau.taille)} sceau={courant.sceau} analyse={aCourant} playKey={play} />
                <Fiche analyse={aCourant} sceau={courant.sceau} nom={courant.nom} mj onLancer={() => setPlay((k) => k + 1)} peutLancer libelleLancer="Relancer" />
              </>
            ) : <p className="vide">Choisissez un sort pour le voir en 3D.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
