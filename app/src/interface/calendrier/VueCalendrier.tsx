// Calendrier mis en forme : année (mois en grilles), mois (semaines), semaine (jours en colonnes), jour (détail).
// Navigation précédent / suivant, retour à aujourd'hui ; clic sur un jour = vue du jour.
import { useMemo, useState } from 'react';
import type { Calendrier, DateMonde } from '../../noyau/contrat';
import {
  abrege, decaler, decalerMois, fetesDeLAn, grilleMois, jourAbsolu, jourDeLaSemaine, joursDeSemaine, memeJour, parJour, semaineDe, type Marque,
} from './logique';
import './calendrier.css';

export type VueCal = 'annee' | 'mois' | 'semaine' | 'jour';
const VUES: [VueCal, string][] = [['annee', 'Année'], ['mois', 'Mois'], ['semaine', 'Semaine'], ['jour', 'Jour']];

interface Props {
  cal: Calendrier;
  /** Jour de référence (horloge du temps de jeu) ; sinon le 1er jour de l'an `an`. */
  aujourdhui?: DateMonde;
  an?: number;
  marques?: Marque[];
  /** Phase de lune notable ce jour (« 🌕 Séléné pleine »), ou rien. */
  lune?: (jourAbsolu: number) => string | null;
  vueInitiale?: VueCal;
  onOuvrir?: (m: Marque) => void;
}

const ICONE: Record<Marque['sorte'], string> = { fete: '✦', evenement: '●', seance: '◆', histoire: '❖', lune: '◐' };

export function VueCalendrier({ cal, aujourdhui, an, marques = [], lune, vueInitiale = 'mois', onOuvrir }: Props) {
  const depart = aujourdhui ?? { an: an ?? 1, mois: 1, jour: 1 };
  const [vue, setVue] = useState<VueCal>(vueInitiale);
  const [d, setD] = useState<DateMonde>(depart);
  const sem = joursDeSemaine(cal);
  const jours = useMemo(() => parJour(cal, [...fetesDeLAn(cal, d.an - 1), ...fetesDeLAn(cal, d.an), ...fetesDeLAn(cal, d.an + 1), ...marques]), [cal, d.an, marques]);
  const de = (x: DateMonde) => jours.get(jourAbsolu(cal, x)) ?? [];
  const nomMois = (x: DateMonde) => cal.mois[x.mois - 1]?.nom ?? `Mois ${x.mois}`;
  const aller = (n: number) => setD(vue === 'annee' ? { ...d, an: d.an + n } : vue === 'mois' ? decalerMois(cal, d, n) : decaler(cal, d, vue === 'semaine' ? n * sem.length : n));
  const titre = vue === 'annee' ? `An ${d.an}` : vue === 'mois' ? `${nomMois(d)} · an ${d.an}`
    : vue === 'semaine' ? `Semaine du ${semaineDe(cal, d)[0].jour} ${nomMois(semaineDe(cal, d)[0])}, an ${d.an}`
      : `${sem[jourDeLaSemaine(cal, d)]} ${d.jour} ${nomMois(d)}, an ${d.an}`;

  const Case = ({ x, petit }: { x: DateMonde | null; petit?: boolean }) => {
    if (!x) return <td className="cal-vide" />;
    const ms = de(x), l = lune?.(jourAbsolu(cal, x));
    return (
      <td className={`cal-case ${memeJour(x, aujourdhui) ? 'cal-auj' : ''} ${ms.some((m) => m.sorte === 'fete') ? 'cal-fete' : ''}`}
        title={[...ms.map((m) => m.titre), l].filter(Boolean).join('\n')} onClick={() => { setD(x); setVue('jour'); }}>
        <span className="cal-num">{x.jour}{l && <i className="cal-lune">{l.slice(0, 2)}</i>}</span>
        {!petit && ms.slice(0, 3).map((m, i) => <span key={i} className={`cal-marque cal-${m.sorte}`} style={m.couleur ? { borderColor: m.couleur } : undefined}>{ICONE[m.sorte]} {m.titre}</span>)}
        {!petit && ms.length > 3 && <span className="cal-plus">+{ms.length - 3}</span>}
        {petit && ms.length > 0 && <span className="cal-point" />}
      </td>
    );
  };
  const Grille = ({ mois, petit }: { mois: number; petit?: boolean }) => (
    <table className={`cal-grille ${petit ? 'cal-petite' : ''}`}>
      <thead><tr>{sem.map((s) => <th key={s}>{petit ? abrege(s).slice(0, 2) : abrege(s)}</th>)}</tr></thead>
      <tbody>{grilleMois(cal, d.an, mois).map((l, i) => <tr key={i}>{l.map((x, k) => <Case key={k} x={x} petit={petit} />)}</tr>)}</tbody>
    </table>
  );

  return (
    <div className="cal">
      <div className="cal-barre">
        <button className="btn btn-petit" onClick={() => aller(-1)} aria-label="Précédent">‹</button>
        <strong className="cal-titre">{titre}</strong>
        <button className="btn btn-petit" onClick={() => aller(1)} aria-label="Suivant">›</button>
        {aujourdhui && <button className="btn btn-petit" onClick={() => setD(aujourdhui)}>Aujourd’hui</button>}
        <span style={{ flex: 1 }} />
        <span className="cal-vues">{VUES.map(([id, l]) => <button key={id} className="btn btn-petit" aria-pressed={vue === id} onClick={() => setVue(id)}>{l}</button>)}</span>
      </div>
      {vue === 'annee' && (
        <div className="cal-annee-vue">
          {cal.mois.map((m, i) => (
            <div key={i} className="cal-mini">
              <button className="cal-mini-titre" onClick={() => { setD({ an: d.an, mois: i + 1, jour: 1 }); setVue('mois'); }}>{m.nom}</button>
              <Grille mois={i + 1} petit />
            </div>
          ))}
        </div>
      )}
      {vue === 'mois' && <Grille mois={d.mois} />}
      {vue === 'semaine' && (
        <div className="cal-semaine">
          {semaineDe(cal, d).map((x) => (
            <div key={jourAbsolu(cal, x)} className={`cal-col ${memeJour(x, aujourdhui) ? 'cal-auj' : ''}`} onClick={() => { setD(x); setVue('jour'); }}>
              <div className="cal-col-titre">{abrege(sem[jourDeLaSemaine(cal, x)])} <b>{x.jour}</b> <small>{nomMois(x)}</small></div>
              {lune?.(jourAbsolu(cal, x)) && <div className="cal-lune-texte">{lune(jourAbsolu(cal, x))}</div>}
              {de(x).map((m, i) => <div key={i} className={`cal-marque cal-${m.sorte}`}>{ICONE[m.sorte]} {m.titre}</div>)}
            </div>
          ))}
        </div>
      )}
      {vue === 'jour' && (
        <div className="cal-jour">
          {lune?.(jourAbsolu(cal, d)) && <p className="cal-lune-texte">{lune(jourAbsolu(cal, d))}</p>}
          {de(d).length === 0 && <p className="discret">Rien de prévu ce jour-là.</p>}
          {de(d).map((m, i) => (
            <div key={i} className={`cal-detail cal-${m.sorte}`}>
              <strong>{ICONE[m.sorte]} {m.titre}</strong>
              {m.texte && <p>{m.texte}</p>}
              {m.cible && onOuvrir && <button className="btn btn-petit" onClick={() => onOuvrir(m)}>Ouvrir</button>}
            </div>
          ))}
        </div>
      )}
      <p className="discret cal-legende">✦ fête · ● événement · ◆ séance{lune ? ' · 🌕 pleine lune, 🌑 nouvelle lune' : ''} · semaine de {sem.length} jours</p>
    </div>
  );
}
