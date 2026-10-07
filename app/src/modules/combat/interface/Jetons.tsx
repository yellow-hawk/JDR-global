// Liste des jetons par camp, bibliothèque de créatures (avec import d'un bloc SRD), ajout rapide.
import { useState } from 'react';
import { ajouterJeton, caseLibre, lireBlocStats, modifierJeton } from '../moteur';
import type { Camp, Modele } from '../moteur';
import { campLibelle } from '../moteur';
import { COULEUR_CAMP, statsVisibles } from '../rendu';
import type { Controleur } from './types';

const CAMPS: Camp[] = ['pj', 'allie', 'ennemi', 'neutre'];

export function Jetons({ ctl, mj }: { ctl: Controleur; mj: boolean }) {
  const { etat: e, ui } = ctl;
  const [srd, setSrd] = useState('');
  const [nombre, setNombre] = useState(1);
  const ro = ctl.lectureSeule || !mj;

  const poser = (m: Partial<Modele>) => {
    let id = 0;
    ctl.faire((x) => {
      let r = x;
      for (let i = 0; i < nombre; i++) {
        const [cx, cy] = caseLibre(r, [2, 2]);
        const nom = nombre > 1 ? `${m.nom ?? '?'} ${i + 1}` : m.nom;
        const a = ajouterJeton(r, { ...m, nom }, cx, cy); r = a.etat; id = a.id;
      }
      return r;
    });
    window.setTimeout(() => ctl.regler({ selection: id }), 0);
  };

  return (
    <div className="combat-onglet">
      {CAMPS.map((camp) => {
        const liste = e.jetons.filter((j) => j.camp === camp && (mj || j.visible));
        if (!liste.length) return null;
        return (
          <section key={camp} className="combat-bloc">
            <h3>{campLibelle[camp]} ({liste.length})</h3>
            {liste.map((j) => (
              <div key={j.id} className={`combat-jeton-ligne ${ui.selection === j.id ? 'choisi' : ''} ${j.pv <= 0 ? 'ko' : ''}`}
                onClick={() => ctl.regler({ selection: j.id, zoneChoisie: null })}>
                <span className="combat-pastille" style={{ background: j.couleur || COULEUR_CAMP[j.camp] }} />
                <span className="combat-nom">{j.nom}{!j.visible && ' (caché)'}</span>
                {j.conditions.length > 0 && <span className="combat-point-etat" title={j.conditions.join(', ')} />}
                {statsVisibles(j, mj ? 'mj' : 'joueurs') && <span className="combat-pv">{j.pv}/{j.pvMax}</span>}
                {!ro && <button className="combat-oeil" title={j.visible ? 'Cacher aux joueurs' : 'Montrer aux joueurs'}
                  onClick={(ev) => { ev.stopPropagation(); ctl.faire((x) => modifierJeton(x, j.id, (y) => ({ ...y, visible: !y.visible }))); }}>{j.visible ? '👁' : '◌'}</button>}
              </div>
            ))}
          </section>
        );
      })}
      {!e.jetons.length && <p className="discret">Aucun jeton. Place des personnages de la campagne ou des créatures de la bibliothèque.</p>}
      {!ro && (
        <section className="combat-bloc">
          <h3>Bibliothèque</h3>
          <label className="combat-mini">Nombre<input type="number" min={1} max={20} value={nombre} onChange={(ev) => setNombre(Math.max(1, Math.min(20, +ev.target.value || 1)))} /></label>
          {e.bibliotheque.map((m, i) => (
            <div key={i} className="combat-jeton-ligne">
              <span className="combat-pastille" style={{ background: m.couleur || COULEUR_CAMP[m.camp] }} />
              <span className="combat-nom" title={m.notes}>{m.nom}</span>
              <span className="combat-pv">CA {m.ca} · {m.pvMax} PV</span>
              <button className="btn btn-petit" onClick={() => poser(m)}>Poser</button>
              <button className="combat-oeil" title="Retirer de la bibliothèque" onClick={() => ctl.faire((x) => ({ ...x, bibliotheque: x.bibliotheque.filter((_, k) => k !== i) }))}>×</button>
            </div>
          ))}
          <div className="ligne">
            <button className="btn btn-petit" onClick={() => poser({ nom: 'Créature', camp: 'ennemi' })}>+ Ennemi</button>
            <button className="btn btn-petit" onClick={() => poser({ nom: 'Allié', camp: 'allie' })}>+ Allié</button>
            <button className="btn btn-petit" onClick={() => poser({ nom: 'PNJ', camp: 'neutre' })}>+ Neutre</button>
          </div>
          <details>
            <summary>Importer un bloc de statistiques (SRD)</summary>
            <textarea rows={5} value={srd} onChange={(ev) => setSrd(ev.target.value)} placeholder={'Gobelin\nArmor Class 15\nHit Points 7\nSpeed 30 ft.\nSTR 8 DEX 14 CON 10 INT 10 WIS 8 CHA 8'} />
            <div className="ligne">
              <button className="btn btn-petit" disabled={!srd.trim()} onClick={() => poser(lireBlocStats(srd))}>Poser</button>
              <button className="btn btn-petit" disabled={!srd.trim()} onClick={() => { ctl.faire((x) => ({ ...x, bibliotheque: [...x.bibliotheque, lireBlocStats(srd)] })); setSrd(''); }}>→ Bibliothèque</button>
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
