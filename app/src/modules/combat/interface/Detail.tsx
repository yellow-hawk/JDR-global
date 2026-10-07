// Détail du jeton ou de la zone choisis : PV, CA, caractéristiques, états, actions.
import { useState } from 'react';
import {
  ajouterCondition, CARACS, CONDITIONS, CONDITIONS_BONUS, dupliquerJeton, modCarac, modeleDepuisJeton, modifierJeton, modifierPV, modifierZone,
  retirerCondition, signe, supprimerJeton, supprimerZone, TERRAINS,
} from '../moteur';
import type { Camp, Jeton, Zone } from '../moteur';
import { campLibelle } from '../moteur';
import { statsVisibles } from '../rendu';
import type { Controleur } from './types';

const LIB_CARAC: Record<string, string> = { for: 'FOR', dex: 'DEX', con: 'CON', int: 'INT', sag: 'SAG', cha: 'CHA' };

function Num({ libelle, v, onChange, min = 0 }: { libelle: string; v: number; onChange: (n: number) => void; min?: number }) {
  return <label className="combat-champ">{libelle}<input type="number" value={v} min={min} onChange={(ev) => onChange(Math.max(min, +ev.target.value || 0))} /></label>;
}

function DetailJeton({ ctl, j, mj }: { ctl: Controleur; j: Jeton; mj: boolean }) {
  const [cond, setCond] = useState('');
  const ro = ctl.lectureSeule || !mj;
  const maj = (f: (x: Jeton) => Jeton, fusion = false) => ctl.faire((e) => modifierJeton(e, j.id, f), fusion);
  if (!statsVisibles(j, mj ? 'mj' : 'joueurs')) return <section className="combat-bloc"><h3>{j.nom}</h3><p className="discret">Statistiques cachées.</p></section>;
  return (
    <section className="combat-bloc">
      {ro ? <h3>{j.nom}</h3> : <input className="combat-titre" value={j.nom} onChange={(ev) => maj((x) => ({ ...x, nom: ev.target.value }), true)} />}
      <div className="combat-pvs">
        <strong className={j.pv <= 0 ? 'combat-ko' : ''}>{j.pv} / {j.pvMax} PV</strong>
        {!ro && [-10, -5, -1, 1, 5, 10].map((d) => (
          <button key={d} className={`btn btn-petit ${d < 0 ? 'btn-danger' : ''}`} onClick={() => ctl.faire((e) => modifierPV(e, j.id, d))}>{signe(d)}</button>
        ))}
      </div>
      {!ro && (
        <div className="combat-grille3">
          <Num libelle="PV max" v={j.pvMax} min={1} onChange={(n) => maj((x) => ({ ...x, pvMax: n, pv: Math.min(x.pv, n) }), true)} />
          <Num libelle="CA" v={j.ca} onChange={(n) => maj((x) => ({ ...x, ca: n }), true)} />
          <Num libelle="Vitesse" v={j.vitesse} onChange={(n) => maj((x) => ({ ...x, vitesse: n }), true)} />
          <label className="combat-champ">Camp<select value={j.camp} onChange={(ev) => maj((x) => ({ ...x, camp: ev.target.value as Camp }))}>
            {(Object.keys(campLibelle) as Camp[]).map((c) => <option key={c} value={c}>{campLibelle[c]}</option>)}
          </select></label>
          <label className="combat-champ">Taille<select value={j.taille} onChange={(ev) => maj((x) => ({ ...x, taille: +ev.target.value as Jeton['taille'] }))}>
            {[1, 2, 3, 4].map((t) => <option key={t} value={t}>{t}×{t}</option>)}
          </select></label>
          <label className="combat-champ">Dégâts<input value={j.degats} onChange={(ev) => maj((x) => ({ ...x, degats: ev.target.value }), true)} /></label>
          <Num libelle="Vue" v={j.vision} onChange={(n) => maj((x) => ({ ...x, vision: n }), true)} />
          <label className="combat-champ">Bonus att.<input type="number" value={j.bonusAttaque ?? ''} placeholder="auto"
            onChange={(ev) => maj((x) => ({ ...x, bonusAttaque: ev.target.value === '' ? null : +ev.target.value }), true)} /></label>
          <label className="combat-champ combat-coche"><input type="checkbox" checked={!j.visible} onChange={(ev) => maj((x) => ({ ...x, visible: !ev.target.checked }))} />Caché</label>
        </div>
      )}
      {ro && <p className="discret">CA {j.ca} · vitesse {j.vitesse} · dégâts {j.degats}</p>}
      <div className="combat-caracs">
        {CARACS.map((k) => (
          <div key={k}><span>{LIB_CARAC[k]}</span>
            {ro ? <b>{j.carac[k]}</b> : <input type="number" value={j.carac[k]} onChange={(ev) => maj((x) => ({ ...x, carac: { ...x.carac, [k]: +ev.target.value || 0 } }), true)} />}
            <small>{signe(modCarac(j.carac[k]))}</small></div>
        ))}
      </div>
      {j.concentration && <p className="combat-conc">⟡ Concentration : {j.concentration} {!ro && <button className="btn btn-petit" onClick={() => maj((x) => ({ ...x, concentration: null }))}>×</button>}</p>}
      <div className="combat-etats">
        {j.conditions.map((c) => (
          <span key={c} className={`combat-etat ${CONDITIONS_BONUS.has(c) ? 'bonus' : ''}`}>{c}{!ro && <button onClick={() => ctl.faire((e) => retirerCondition(e, j.id, c))}>×</button>}</span>
        ))}
        {!ro && (
          <select value={cond} onChange={(ev) => { ctl.faire((e) => ajouterCondition(e, j.id, ev.target.value)); setCond(''); }}>
            <option value="">+ état…</option>
            {[...CONDITIONS, ...(ctl.etat.etatsSup ?? [])].filter((c) => !j.conditions.includes(c)).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>
      {!ro && <textarea className="combat-notes" rows={2} placeholder="Notes" value={j.notes} onChange={(ev) => maj((x) => ({ ...x, notes: ev.target.value }), true)} />}
      {!ro && (
        <div className="ligne combat-actions">
          <button className="btn btn-petit" onClick={() => ctl.regler({ outil: 'attaque', attaque: 'melee' })}>⚔ Attaquer</button>
          <button className="btn btn-petit" onClick={() => ctl.regler({ onglet: 'sorts' })}>✦ Sort</button>
          <button className="btn btn-petit" onClick={() => { let id = 0; ctl.faire((e) => { const r = dupliquerJeton(e, j.id); id = r.id; return r.etat; }); window.setTimeout(() => ctl.regler({ selection: id }), 0); }}>Dupliquer</button>
          <button className="btn btn-petit" onClick={() => { ctl.faire((e) => ({ ...e, bibliotheque: [...e.bibliotheque, modeleDepuisJeton(j)] })); ctl.dire(`${j.nom} ajouté à la bibliothèque.`, 'succes'); }}>→ Bibliothèque</button>
          <button className="btn btn-petit btn-danger" onClick={() => { ctl.faire((e) => supprimerJeton(e, j.id)); ctl.regler({ selection: null }); }}>Supprimer</button>
        </div>
      )}
      {j.persoId && <p className="discret">Lié à une fiche de personnage.</p>}
    </section>
  );
}

function DetailZone({ ctl, z }: { ctl: Controleur; z: Zone }) {
  const maj = (f: (x: Zone) => Zone) => ctl.faire((e) => modifierZone(e, z.id, f), true);
  const t = TERRAINS.find((x) => x.id === z.terrain);
  return (
    <section className="combat-bloc">
      <input className="combat-titre" value={z.nom} onChange={(ev) => maj((x) => ({ ...x, nom: ev.target.value }))} disabled={ctl.lectureSeule} />
      <p className="discret">{t ? `Terrain : ${t.desc}` : 'Zone de sort'} · {z.forme}</p>
      {!ctl.lectureSeule && (
        <div className="combat-grille3">
          {z.forme !== 'polygone' && <Num libelle="Rayon" v={z.rayon} onChange={(n) => maj((x) => ({ ...x, rayon: n }))} />}
          {z.forme === 'rectangle' && <Num libelle="Largeur" v={z.largeur ?? 1} min={1} onChange={(n) => maj((x) => ({ ...x, largeur: n }))} />}
          {['cone', 'ligne', 'rectangle'].includes(z.forme) && <Num libelle="Angle °" v={Math.round((z.angle * 180) / Math.PI)} min={-360} onChange={(n) => maj((x) => ({ ...x, angle: (n * Math.PI) / 180 }))} />}
        </div>
      )}
      {!ctl.lectureSeule && <button className="btn btn-petit btn-danger" onClick={() => { ctl.faire((e) => supprimerZone(e, z.id)); ctl.regler({ zoneChoisie: null }); }}>Supprimer la zone</button>}
    </section>
  );
}

export function Detail({ ctl, mj }: { ctl: Controleur; mj: boolean }) {
  const j = ctl.etat.jetons.find((x) => x.id === ctl.ui.selection);
  if (j) return <DetailJeton ctl={ctl} j={j} mj={mj} />;
  const z = mj ? ctl.etat.zones.find((x) => x.id === ctl.ui.zoneChoisie) : undefined;
  return z ? <DetailZone ctl={ctl} z={z} /> : null;
}
