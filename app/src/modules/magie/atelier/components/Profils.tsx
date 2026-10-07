import { useRef, useState } from 'react';
import { nomRang, nouveauProfil, type ProfilPJ } from '../engine/profils';
import { imprimer } from '../engine/impression';
import { LECONS } from '../data/lecons';
import { TOUS, type Rang } from '../data/signes';
import { SceauSVG } from './SceauSVG';
import { Rang as Etoiles } from './Fiche';

interface Props {
  profils: ProfilPJ[];
  setProfils: (l: ProfilPJ[]) => void;
  actif: string | null;
  setActif: (id: string | null) => void;
}

function telecharger(nom: string, contenu: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = nom; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Gestion des personnages (MJ) */
export function Profils({ profils, setProfils, actif, setActif }: Props) {
  const [selId, setSelId] = useState<string | null>(actif ?? profils[0]?.id ?? null);
  const [aSupprimer, setASupprimer] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const sel = profils.find((p) => p.id === selId) ?? null;

  const maj = (fn: (p: ProfilPJ) => ProfilPJ) => sel && setProfils(profils.map((p) => (p.id === sel.id ? fn(p) : p)));
  const creer = () => { const p = nouveauProfil('Nouveau personnage'); setProfils([...profils, p]); setSelId(p.id); };
  const supprimer = () => {
    if (!sel) return;
    setProfils(profils.filter((p) => p.id !== sel.id));
    if (actif === sel.id) setActif(null);
    setSelId(null); setASupprimer(false);
  };
  const importer = async (f: File) => {
    try {
      const d = JSON.parse(await f.text());
      const liste: ProfilPJ[] = (Array.isArray(d) ? d : [d]).filter((p) => p && p.id && p.nom && Array.isArray(p.signes));
      if (!liste.length) throw new Error();
      const ids = new Set(liste.map((p) => p.id));
      setProfils([...profils.filter((p) => !ids.has(p.id)), ...liste]);
      setMsg(`${liste.length} personnage(s) importé(s)`);
    } catch { setMsg('Fichier illisible : choisissez un export de personnage (JSON).'); }
  };
  const basculer = (id: string) => maj((p) => ({ ...p, signes: p.signes.includes(id) ? p.signes.filter((x) => x !== id) : [...p.signes, id] }));

  return (
    <div className="profils">
      <aside className="profils-liste">
        <div className="toolbar">
          <button className="btn primary" onClick={creer}>Nouveau personnage</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Importer</button>
          <button className="btn" disabled={!profils.length} onClick={() => telecharger('personnages.json', JSON.stringify(profils, null, 2))}>Tout exporter</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importer(e.target.files[0])} />
        </div>
        {msg && <p className="muted" role="status">{msg}</p>}
        {!profils.length && <p className="vide">Aucun personnage. Créez-en un par joueur.</p>}
        {profils.map((p) => (
          <button key={p.id} className={`profil-ligne ${p.id === selId ? 'on' : ''}`} onClick={() => { setSelId(p.id); setASupprimer(false); }} style={{ ['--pj' as string]: p.couleur }}>
            <span className="pastille" aria-hidden="true" />
            <span><b>{p.nom}</b><small>{p.joueur || 'joueur ?'} · {nomRang(p.rang)} · {p.grimoire.length}/{p.emplacements} sorts{p.id === actif ? ' · à la table' : ''}</small></span>
          </button>
        ))}
      </aside>

      {sel ? (
        <section className="profil-edit" aria-label={`Fiche de ${sel.nom}`}>
          <div className="profil-champs">
            <label>Personnage<input value={sel.nom} onChange={(e) => maj((p) => ({ ...p, nom: e.target.value }))} /></label>
            <label>Joueur<input value={sel.joueur} onChange={(e) => maj((p) => ({ ...p, joueur: e.target.value }))} /></label>
            <label>Rang
              <select value={sel.rang} onChange={(e) => maj((p) => ({ ...p, rang: Number(e.target.value) as Rang }))}>
                <option value={1}>Apprenti</option><option value={2}>Compagnon</option><option value={3}>Maître</option>
              </select>
            </label>
            <label>Emplacements<input type="number" min={1} max={60} value={sel.emplacements} onChange={(e) => maj((p) => ({ ...p, emplacements: Math.max(1, Math.min(60, Number(e.target.value) || 1)) }))} /></label>
            <label>Couleur<input type="color" value={sel.couleur} onChange={(e) => maj((p) => ({ ...p, couleur: e.target.value }))} /></label>
          </div>
          <div className="toolbar">
            <button className="btn primary" onClick={() => setActif(sel.id)} disabled={actif === sel.id}>{actif === sel.id ? 'À la table' : 'Mettre à la table'}</button>
            <button className="btn" onClick={() => telecharger(`${sel.nom}.json`, JSON.stringify(sel, null, 2))}>Exporter</button>
            <button className="btn" disabled={!sel.grimoire.length} onClick={() => imprimer(sel.grimoire.map((s) => ({ nom: s.nom, sceau: s.sceau, notes: s.notes, categorie: 'Grimoire de ' + sel.nom })), `Grimoire de ${sel.nom}`, nomRang(sel.rang))}>Imprimer son grimoire</button>
            <button className="btn ghost" disabled={!Object.keys(sel.calibrage).length} onClick={() => maj((p) => ({ ...p, calibrage: {} }))}>Oublier le calibrage</button>
            {aSupprimer
              ? <><button className="btn danger" onClick={supprimer}>Supprimer définitivement</button><button className="btn ghost" onClick={() => setASupprimer(false)}>Garder</button></>
              : <button className="btn ghost" onClick={() => setASupprimer(true)}>Supprimer</button>}
          </div>

          <h3>Signes connus ({sel.signes.length}/{TOUS.length})</h3>
          <p className="muted">Cliquez pour accorder ou retirer un signe. Les étoiles indiquent le rang du signe.</p>
          {(['coeur', 'rameau', 'noeud'] as const).map((f) => (
            <div key={f} className="chips" role="group" aria-label={f}>
              {TOUS.filter((s) => s.famille === f).map((s) => (
                <button key={s.id} className={`chip ${sel.signes.includes(s.id) ? 'on' : ''} ${s.rang > sel.rang ? 'au-dela' : ''}`} aria-pressed={sel.signes.includes(s.id)} onClick={() => basculer(s.id)}>
                  {s.nom} <Etoiles n={s.rang} />
                </button>
              ))}
            </div>
          ))}

          <h3>Grimoire ({sel.grimoire.length}/{sel.emplacements})</h3>
          {!sel.grimoire.length && <p className="muted">Vide. Utilisez « Donner à un PJ » dans le grimoire du MJ, ou laissez le joueur inscrire ses propres tracés.</p>}
          <div className="carnet-grim">
            {sel.grimoire.map((s) => (
              <article key={s.id} className="carnet-sort">
                <div className="mini"><SceauSVG sceau={s.sceau} paire ariaLabel={s.nom} /></div>
                <div className="carnet-sort-texte">
                  <b>{s.nom}</b>
                  <span className="muted">{sel.defis[s.id] ? `record ${sel.defis[s.id].score}/100` : 'pas encore entraîné'}</span>
                  <button className="btn ghost" onClick={() => maj((p) => ({ ...p, grimoire: p.grimoire.filter((x) => x.id !== s.id) }))}>Retirer</button>
                </div>
              </article>
            ))}
          </div>

          <h3>Leçons réussies ({sel.lecons.length}/{LECONS.length})</h3>
          <p className="muted">{sel.lecons.length ? LECONS.filter((l) => sel.lecons.includes(l.id)).map((l) => l.titre).join(' · ') : 'Aucune pour l’instant.'}</p>
        </section>
      ) : <p className="vide">Choisissez un personnage.</p>}
    </div>
  );
}
