// Écran d'un joueur : ses dés. Jets demandés par le MJ en tête, jets de sa fiche (compétences, sauvegardes,
// caractéristiques), dés libres. Le jet est lancé par le MJ avec le bonus de la fiche : il roule en 3D chez tous.
import { useState } from 'react';
import type { PropsVueJoueurs } from '../../../interface/types';
import type { ModeJet } from '../../../noyau/regles';
import type { DemandeJet, JetFiche } from '../actions';
import '../joueurs.css';

interface Donnees { jets: JetFiche[]; demandes: Omit<DemandeJet, 'dd'>[]; nom: string }
const MODES: [ModeJet, string][] = [['desavantage', 'Désavantage'], ['normal', 'Neutre'], ['avantage', 'Avantage']];
const signe = (n: number) => (n >= 0 ? `+${n}` : String(n));

export default function Des({ donnees, envoyer }: PropsVueJoueurs) {
  const d = donnees as unknown as Donnees;
  const [mode, setMode] = useState<ModeJet>('normal');
  const [formule, setFormule] = useState('');
  const [dernier, setDernier] = useState<string | null>(null);
  const lancer = (x: Record<string, unknown>, libelle: string) => { envoyer({ mode, ...x }); setDernier(libelle); setMode('normal'); };
  const groupes = [...new Set(d.jets.map((j) => j.groupe))];

  return (
    <div className="vue-joueur pile">
      <div className="ligne" role="radiogroup" aria-label="Mode du prochain jet">
        {MODES.map(([m, l]) => <button key={m} className={`btn btn-petit ${mode === m ? 'btn-principal' : ''}`} aria-pressed={mode === m} onClick={() => setMode(m)}>{l}</button>)}
        {dernier && <span className="discret">Lancé : {dernier}. Le résultat roule sur tous les écrans.</span>}
      </div>
      {d.demandes.length > 0 && (
        <section className="vue-joueur-demandes pile">
          <strong>Le maître du jeu te demande</strong>
          {d.demandes.map((x) => {
            const j = d.jets.find((y) => y.cle === x.cle);
            return (
              <div key={x.id} className="ligne">
                <span style={{ flex: 1 }}>{x.libelle}{j ? ` (${signe(j.bonus)})` : ''}{x.mode !== 'normal' ? ` · ${x.mode === 'avantage' ? 'avec avantage' : 'avec désavantage'}` : ''}</span>
                <button className="btn btn-principal" onClick={() => { envoyer({ cle: x.cle, mode: x.mode !== 'normal' ? x.mode : mode, demande: x.id }); setDernier(x.libelle); }}>Lancer</button>
              </div>
            );
          })}
        </section>
      )}
      <section className="pile">
        <strong>Dés</strong>
        <div className="ligne">
          {[4, 6, 8, 10, 12, 20, 100].map((n) => <button key={n} className="btn" onClick={() => lancer({ formule: `1d${n}` }, `d${n}`)}>d{n}</button>)}
        </div>
        <form className="ligne" onSubmit={(e) => { e.preventDefault(); if (formule.trim()) lancer({ formule: formule.trim() }, formule.trim()); }}>
          <input value={formule} onChange={(e) => setFormule(e.target.value)} placeholder="2d6+3, 1d8…" aria-label="Formule de dés" style={{ maxWidth: 200 }} />
          <button className="btn" disabled={!formule.trim()}>Lancer</button>
        </form>
      </section>
      {groupes.map((g) => (
        <section key={g} className="pile">
          <strong>{g}</strong>
          <div className="vue-joueur-jets">
            {d.jets.filter((j) => j.groupe === g).map((j) => (
              <button key={j.cle} className="btn btn-petit" onClick={() => lancer({ cle: j.cle }, j.libelle)}>{j.libelle} <b>{signe(j.bonus)}</b></button>
            ))}
          </div>
        </section>
      ))}
      {!d.jets.length && <p className="discret">Ta fiche n’a pas encore de compétences calculées : utilise les dés ci-dessus.</p>}
    </div>
  );
}
