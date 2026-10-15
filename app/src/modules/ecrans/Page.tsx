// Page Écrans (MJ) : le mur des écrans joueurs. Une copie de chaque écran ouvert, à sa vraie taille et sur le même
// onglet que le joueur, plus l'écran de la table ; et un test de toutes les tailles d'écran courantes. Sous chaque
// copie, le contrôle de mise en page dit ce qui déborde, se recouvre ou est trop petit.
import { useEffect, useState } from 'react';
import { salonReseau, suivreJoueursConnectes } from '../../noyau/bus';
import { useCampagne } from '../../interface/etat';
import { assurerSalon } from '../../interface/Tablettes';
import { distantsDe, suivreEcransJoueurs, type EtatEcran } from '../joueurs';
import { Copie } from './Copie';
import './ecrans.css';

const TAILLES: [string, number, number][] = [
  ['Téléphone (portrait)', 390, 844], ['Téléphone (paysage)', 844, 390], ['Tablette', 820, 1180], ['Ordinateur portable', 1366, 768], ['Télé / grand écran', 1920, 1080],
];
const ONGLETS: [string, string][] = [['table', 'Table'], ['fiche', 'Ma fiche'], ['des', 'Dés'], ['inventaire', 'Sac'], ['talents', 'Talents'], ['groupe', 'Groupe'], ['niveau', 'Niveau'], ['entrainement', 'Entraînement'], ['messages', 'Messages']];

export function Page() {
  const { campagne, role } = useCampagne();
  const [salon, setSalon] = useState<string | null>(salonReseau());
  const [ecrans, setEcrans] = useState<Map<string, EtatEcran>>(new Map());
  const [connectes, setConnectes] = useState<Set<string>>(new Set());
  const [taille, setTaille] = useState(4);
  const [test, setTest] = useState<{ source: string; onglet: string } | null>(null);
  const [actualiser, setActualiser] = useState(0);
  useEffect(() => { void assurerSalon().then(setSalon); }, []);
  useEffect(() => suivreEcransJoueurs(setEcrans), []);
  useEffect(() => suivreJoueursConnectes(setConnectes), []);

  if (role !== 'mj' || !campagne) return <div className="vide">Cette page est réservée au MJ.</div>;
  if (!salon) return <div className="vide">Le relais n’est pas disponible : lance JDR Global avec lancer.bat pour voir les écrans des joueurs.</div>;
  const base = location.origin;
  const distants = distantsDe(campagne);
  const pjs = campagne.personnages.filter((p) => p.sorte === 'pj' && distants[p.id]);
  // Copies sans connexion propre (voir Copie) : l'adresse dit seulement quel écran imiter.
  const copie = (jeton?: string) => `${base}/?ecran=joueurs&miroir=1${jeton ? `&joueur=${encodeURIComponent(jeton)}` : ''}&v=${actualiser}`;
  const [nomTable, lTable, hTable] = TAILLES[taille];

  return (
    <div className="ecrans-page pile">
      <section className="carte-ui pile">
        <div className="ligne">
          <h1 style={{ margin: 0, flex: 1 }}>Écrans des joueurs</h1>
          <button className="btn btn-petit" onClick={() => setActualiser((n) => n + 1)}>Recharger les copies</button>
        </div>
        <p className="discret" style={{ margin: 0 }}>Une copie de chaque écran, à sa vraie taille et sur l’onglet que le joueur regarde. Les copies regardent sans agir. Sous chacune, le contrôle de mise en page signale ce qui déborde, se recouvre ou est trop petit.</p>
      </section>

      <div className="ecrans-mur">
        <Copie url={copie()} l={lTable} h={hTable} largeur={420} titre="Écran de la table" sousTitre={nomTable} />
        {pjs.map((p) => {
          const d = distants[p.id], e = ecrans.get(p.id), en = connectes.has(d.jeton);
          return e && en
            ? <Copie key={p.id} url={copie(d.jeton)} jeton={d.jeton} l={e.l} h={e.h} largeur={420} titre={p.nom} sousTitre={`onglet ${ONGLETS.find((o) => o[0] === e.onglet)?.[1] ?? e.onglet}`} onglet={e.onglet} />
            : <figure key={p.id} className="copie copie-absent"><figcaption><b>{p.nom}</b></figcaption><p className="discret">{en ? 'Connecté : son écran va se signaler (quelques secondes).' : 'Pas connecté pour l’instant.'}</p></figure>;
        })}
      </div>
      <label className="ligne discret">Taille de l’écran de la table :
        <select value={taille} onChange={(e) => setTaille(Number(e.target.value))}>{TAILLES.map(([n, l, h], i) => <option key={n} value={i}>{n} ({l} × {h})</option>)}</select>
      </label>

      <section className="carte-ui pile">
        <strong>Tester la mise en page sur toutes les tailles</strong>
        <div className="ligne">
          <select value={test?.source ?? ''} onChange={(e) => setTest(e.target.value ? { source: e.target.value, onglet: test?.onglet ?? 'table' } : null)}>
            <option value="">Choisir un écran…</option>
            <option value="table">Écran de la table</option>
            {pjs.map((p) => <option key={p.id} value={distants[p.id].jeton}>Écran de {p.nom}</option>)}
          </select>
          {test && test.source !== 'table' && (
            <select value={test.onglet} onChange={(e) => setTest({ ...test, onglet: e.target.value })}>{ONGLETS.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
          )}
          {test && <button className="btn btn-petit" onClick={() => setTest(null)}>Fermer le test</button>}
        </div>
        <p className="discret" style={{ margin: 0 }}>Montre l’écran choisi en téléphone (portrait et paysage), tablette, ordinateur et télé, avec ce qui est affiché en ce moment.</p>
      </section>
      {test && (
        <div className="ecrans-mur">
          {TAILLES.map(([n, l, h]) => (
            <Copie key={`${n}-${test.source}-${actualiser}`} url={copie(test.source === 'table' ? undefined : test.source)} jeton={test.source === 'table' ? undefined : test.source} l={l} h={h} largeur={360} hauteurMax={420} titre={n} onglet={test.source === 'table' ? undefined : test.onglet} />
          ))}
        </div>
      )}
    </div>
  );
}
