import { useMemo, useState } from 'react';
import type { Analyse } from '../engine/analyse';
import { decrire, type Description } from '../engine/effets';
import type { Sceau } from '../engine/types';
import { RANGS } from '../data/signes';
import { imprimer } from '../engine/impression';

export function Rang({ n }: { n: number }) {
  return <span className={`rank t${n}`} title={RANGS[n as 1 | 2 | 3]}>{[1, 2, 3].map((k) => <i key={k} className={k > n ? 'off' : ''} />)}</span>;
}

function Jauge({ value, max, tone }: { value: number; max: number; tone: string }) {
  return <div className="jauge"><div className={`jauge-fill ${tone}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>;
}

export function texteFiche(nom: string, a: Analyse, d: Description): string {
  return [
    nom.toUpperCase(),
    d.composition,
    `Rang ${RANGS[a.rang]} · difficulté +${a.difficulte}${a.interdit ? ' · MAGIE INTERDITE' : ''}`,
    '',
    `En bref : ${d.enBref}`,
    '',
    'Ce qui se passe',
    d.declenchement, ...d.formes, d.sensation, ...d.reglages,
    '',
    'Effets sur les cibles',
    ...d.surCibles.map((s) => `- ${s.label} : ${s.texte}`),
    '',
    'Valeurs de jeu',
    ...d.stats.map((s) => `- ${s.label} : ${s.valeur}`),
    `- Puissance ${a.puissance} (${a.puissanceLabel}) · Stabilité ${a.stabilite} % (${a.stabiliteLabel})`,
    '',
    `Fin du sort : ${d.fin}`,
    `Contre : ${d.contre}`,
    ...(d.risque ? [`Risque : ${d.risque}`] : []),
    ...a.alertes.map((x) => `⚠ ${x}`),
  ].join('\n');
}

interface Props {
  analyse: Analyse;
  sceau: Sceau;
  nom?: string;
  onLancer?: () => void;
  peutLancer?: boolean;
  libelleLancer?: string;
  mj?: boolean;
}

export function Fiche({ analyse: a, sceau, nom, onLancer, peutLancer, libelleLancer, mj }: Props) {
  const [copie, setCopie] = useState(false);
  const d = useMemo(() => decrire(sceau, a), [sceau, a]);
  const titre = nom || a.nomSuggere;
  const stabTone = a.stabilite >= 85 ? 'ok' : a.stabilite >= 60 ? 'mid' : a.stabilite >= 35 ? 'warn' : 'bad';
  const copier = async () => {
    try { await navigator.clipboard.writeText(texteFiche(titre, a, d)); setCopie(true); setTimeout(() => setCopie(false), 1600); } catch { /* presse-papiers refusé */ }
  };
  return (
    <section className="fiche" aria-label="Fiche du sort">
      <div className="fiche-head">
        <div className="tag">Sort</div>
        <h2>{a.coeur ? titre : 'Sceau en cours'}</h2>
        {d.composition && <p className="composition">{d.composition}</p>}
        <div className="badges">
          <span className="badge"><Rang n={a.rang} /> {RANGS[a.rang]}</span>
          <span className="badge">Difficulté +{a.difficulte}</span>
          {a.interdit && <span className="badge interdit">Magie interdite</span>}
          <span className={`badge etat ${a.actif ? 'on' : a.pret ? 'pret' : ''}`}>{a.actif ? 'Cerne fermée' : a.pret ? 'Préparé' : 'Incomplet'}</span>
        </div>
      </div>

      <p className="en-bref">{d.enBref}</p>

      {a.coeur && (
        <div className="fiche-bloc">
          <h3>Ce qui se passe</h3>
          <div className="recit">
            <p>{d.declenchement}</p>
            {d.formes.map((t, i) => <p key={i}>{t}</p>)}
            <p className="impact">{d.sensation}</p>
            {d.reglages.length > 0 && <ul className="reglages">{d.reglages.map((x, i) => <li key={i}>{x}</li>)}</ul>}
          </div>
        </div>
      )}

      {d.surCibles.length > 0 && (
        <div className="fiche-bloc">
          <h3>Effets sur les cibles</h3>
          <dl className="props cibles">
            {d.surCibles.map((c) => (<div key={c.label} className="prop"><dt>{c.label}</dt><dd>{c.texte}</dd></div>))}
          </dl>
        </div>
      )}

      {d.stats.length > 0 && (
        <div className="fiche-bloc">
          <h3>Valeurs de jeu</h3>
          <dl className="props">
            {d.stats.map((s) => (<div key={s.label} className="prop"><dt>{s.label}</dt><dd>{s.valeur}</dd></div>))}
            <div className="prop"><dt>Déclencheur</dt><dd>{a.declencheur}</dd></div>
          </dl>
          <div className="stats">
            <div className="stat"><span className="tag">Puissance</span><b>{a.puissance} <small>{a.puissanceLabel}</small></b><Jauge value={a.puissance} max={12} tone="acc" /></div>
            <div className="stat"><span className="tag">Stabilité</span><b>{a.stabilite} % <small>{a.stabiliteLabel}</small></b><Jauge value={a.stabilite} max={100} tone={stabTone} /></div>
          </div>
        </div>
      )}

      {a.coeur && (
        <div className="fiche-bloc">
          <dl className="props">
            <div className="prop"><dt>Fin du sort</dt><dd>{d.fin}</dd></div>
            <div className="prop"><dt>Contre</dt><dd>{d.contre}</dd></div>
          </dl>
        </div>
      )}
      {d.risque && <p className="risque">{d.risque}</p>}
      {a.alertes.length > 0 && <ul className="alertes">{a.alertes.map((x, i) => <li key={i}>{x}</li>)}</ul>}

      {mj && a.formes.length > 0 && (
        <details className="mj-detail">
          <summary>Lecture technique</summary>
          <ul>{a.formes.map((f) => <li key={f.id + f.inv}><b className={f.inv ? 'inv-t' : ''}>{f.nom}{f.nombre > 1 ? ` ×${f.nombre}` : ''}</b> : {f.effet}</li>)}</ul>
          <p className="muted">Direction : {a.direction.label}. Cible : {a.cible}. {d.impact}</p>
        </details>
      )}

      <div className="fiche-actions">
        {onLancer && <button className="btn primary" onClick={onLancer} disabled={!peutLancer}>{libelleLancer ?? 'Lancer le sort'}</button>}
        <button className="btn" onClick={copier} disabled={!a.coeur}>{copie ? 'Fiche copiée' : 'Copier la fiche'}</button>
        <button className="btn" onClick={() => imprimer([{ nom: titre, sceau: { ...sceau, trace: undefined, sansCerne: undefined } }], titre)} disabled={!a.coeur}>Imprimer la fiche</button>
      </div>
    </section>
  );
}
