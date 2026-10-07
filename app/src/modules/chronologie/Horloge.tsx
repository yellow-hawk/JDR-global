// Horloge du temps de jeu : date et heure dans le calendrier de référence, boutons d'avance, lunes, fêtes à venir,
// date montrée aux joueurs, réglage manuel.
import { useState } from 'react';
import type { Campagne, DateMonde } from '../../noyau/contrat';
import { Champ } from '../../interface/composants';
import { AVANCES, avancer, calendriersDisponibles, changerTemps, dateLisible, fetesAVenir, lunes, moment, reference, tempsDe } from './logique';

interface Props { c: Campagne; ro: boolean; modifier(f: (c: Campagne) => Campagne): void; onNoter(): void; bandeau: boolean; setBandeau(v: boolean): void }

function Lune({ phase }: { phase: number }) {
  // disque éclairé : ellipse du terminateur selon la phase
  const k = Math.cos(phase * 2 * Math.PI); // 1 nouvelle, -1 pleine
  const droite = phase < 0.5;
  const rx = Math.abs(k) * 10;
  const d = `M12,2 A10,10 0 0 ${droite ? 1 : 0} 12,22 A${rx},10 0 0 ${(k > 0) === droite ? 0 : 1} 12,2 Z`;
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#2a2620" stroke="#6b5d48" />
      <path d={d} fill="#efe3c2" />
    </svg>
  );
}

export function Horloge({ c, ro, modifier, onNoter, bandeau, setBandeau }: Props) {
  const r = reference(c);
  const t = tempsDe(c);
  const [reglage, setReglage] = useState<DateMonde & { heure: number } | null>(null);
  const dispo = calendriersDisponibles(c);
  const fetes = fetesAVenir(t, r, 90);
  const ls = lunes(t, r);
  const pas = (p: { heures?: number; jours?: number; mois?: number }) => modifier((x) => changerTemps(x, (tt) => avancer(tt, reference(x), p)));

  return (
    <div className="chrono-horloge carte-ui">
      <div className="chrono-date">
        <div className="chrono-jour">{dateLisible(t.date, r.cal)}</div>
        <div className="discret">{t.heure} h ({moment(t.heure, r.heuresJour)}) · calendrier {r.civ ? r.civ.nom.replace(/^les /, 'des ') : 'par défaut'} · {r.cal.joursParAn} jours, {r.heuresJour} h par jour</div>
      </div>
      {!ro && (
        <div className="ligne chrono-avances">
          <button className="btn btn-petit" onClick={() => pas({ jours: -1 })} title="Reculer d'un jour">−1 jour</button>
          {AVANCES.map((a) => <button key={a.libelle} className="btn btn-petit" onClick={() => pas(a)}>{a.libelle}</button>)}
        </div>
      )}
      {ls.length > 0 && (
        <div className="chrono-lunes">
          {ls.map((l) => (
            <span key={l.nom} className="chrono-lune" title={`Pleine lune dans ${l.pleineDans} jour(s)`}><Lune phase={l.phase} /> {l.nom} : {l.libelle}</span>
          ))}
        </div>
      )}
      <div>
        <h3>Fêtes à venir</h3>
        {fetes.length ? (
          <ul className="chrono-fetes">{fetes.slice(0, 5).map((f) => (
            <li key={`${f.nom}${f.date.an}`}><strong>{f.nom}</strong> <span className="discret">{f.dans === 0 ? "aujourd'hui" : `dans ${f.dans} j`} · {dateLisible(f.date, r.cal)}</span></li>
          ))}</ul>
        ) : <p className="discret">Aucune fête dans les 90 prochains jours.</p>}
      </div>
      {!ro && (
        <div className="ligne" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-petit btn-principal" onClick={onNoter}>Noter un événement maintenant</button>
          <label className="ligne discret"><input type="checkbox" checked={bandeau} onChange={(e) => setBandeau(e.target.checked)} /> Date sur l’écran joueurs</label>
          <button className="btn btn-petit" onClick={() => setReglage(reglage ? null : { ...t.date, heure: t.heure })}>Régler…</button>
        </div>
      )}
      {reglage && (
        <div className="chrono-reglage">
          <div className="ligne">
            <Champ libelle="Jour"><input type="number" value={reglage.jour} onChange={(e) => setReglage({ ...reglage, jour: Number(e.target.value) })} /></Champ>
            <Champ libelle="Mois">
              <select value={reglage.mois} onChange={(e) => setReglage({ ...reglage, mois: Number(e.target.value) })}>
                {r.cal.mois.map((m, i) => <option key={i} value={i + 1}>{m.nom}</option>)}
              </select>
            </Champ>
            <Champ libelle="An"><input type="number" value={reglage.an} onChange={(e) => setReglage({ ...reglage, an: Number(e.target.value) })} /></Champ>
            <Champ libelle="Heure"><input type="number" min={0} max={r.heuresJour - 1} value={reglage.heure} onChange={(e) => setReglage({ ...reglage, heure: Number(e.target.value) })} /></Champ>
          </div>
          {dispo.length > 1 && (
            <Champ libelle="Calendrier de référence">
              <select value={r.civ ? `${r.univers?.id}|${String(r.civ.cle)}` : ''}
                onChange={(e) => { const [univers, peuple] = e.target.value.split('|'); modifier((x) => changerTemps(x, (tt) => ({ ...tt, reference: { univers, peuple } }))); }}>
                {dispo.map((d) => <option key={`${d.univers.id}|${String(d.civ.cle)}`} value={`${d.univers.id}|${String(d.civ.cle)}`}>{d.civ.nom} ({d.univers.nom})</option>)}
              </select>
            </Champ>
          )}
          <div className="ligne">
            <button className="btn btn-petit btn-principal" onClick={() => {
              const { heure, ...date } = reglage;
              modifier((x) => changerTemps(x, (tt) => ({ ...tt, heure: Math.max(0, Math.min(r.heuresJour - 1, heure)), date: { ...date, jour: Math.max(1, date.jour) } })));
              setReglage(null);
            }}>Valider</button>
            <button className="btn btn-petit" onClick={() => setReglage(null)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
