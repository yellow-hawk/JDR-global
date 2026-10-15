// Écran d'un joueur : son sac et sa bourse. Il s'équipe, donne un objet ou de l'argent à un compagnon ; le MJ
// vérifie (objet possédé, quantité, réglages) et la fiche à jour revient.
import { useState } from 'react';
import type { ObjetInventaire } from '../../../noyau/contrat';
import type { PropsVueJoueurs } from '../../../interface/types';
import type { DroitsInventaire } from '../actions';
import '../joueurs.css';

interface Donnees { objets: ObjetInventaire[]; monnaie: Record<string, number>; monnaies: { id: string; nom: string }[]; compagnons: { id: string; nom: string }[]; droits: DroitsInventaire }

export default function Sac({ donnees, envoyer }: PropsVueJoueurs) {
  const d = donnees as unknown as Donnees;
  const [don, setDon] = useState<string | null>(null);
  const [a, setA] = useState(d.compagnons[0]?.id ?? '');
  const [n, setN] = useState(1);
  const [piece, setPiece] = useState(d.monnaies[0]?.id ?? '');
  const [montant, setMontant] = useState(1);
  const poids = d.objets.reduce((s, o) => s + (o.poids ?? 0) * o.quantite, 0);
  const peutDonner = d.droits.donner && d.compagnons.length > 0;

  return (
    <div className="vue-joueur pile">
      <div className="ligne"><strong>Sac</strong><span className="discret">{d.objets.length} objet{d.objets.length > 1 ? 's' : ''}{poids ? ` · ${Math.round(poids * 10) / 10} kg` : ''}</span></div>
      {!d.objets.length && <p className="discret">Ton sac est vide.</p>}
      <div className="vue-joueur-objets">
        {d.objets.map((o) => (
          <article key={o.id} className={`vue-joueur-objet ${o.equipe ? 'equipe' : ''}`}>
            <div className="ligne">
              <b style={{ flex: 1 }}>{o.nom}{o.quantite > 1 ? ` × ${o.quantite}` : ''}</b>
              {o.equipe && <span className="vue-joueur-etiquette">équipé</span>}
            </div>
            {o.description && <p className="discret" style={{ margin: 0 }}>{o.description}</p>}
            <div className="ligne">
              {d.droits.equiper && <button className="btn btn-petit" onClick={() => envoyer({ faire: 'equiper', objet: o.id, equipe: !o.equipe })}>{o.equipe ? 'Retirer' : 'S’équiper'}</button>}
              {peutDonner && <button className="btn btn-petit" onClick={() => { setDon(don === o.id ? null : o.id); setN(1); }}>Donner…</button>}
            </div>
            {don === o.id && (
              <div className="ligne">
                <select value={a} onChange={(e) => setA(e.target.value)}>{d.compagnons.map((x) => <option key={x.id} value={x.id}>à {x.nom}</option>)}</select>
                {o.quantite > 1 && <input type="number" min={1} max={o.quantite} value={n} onChange={(e) => setN(Number(e.target.value))} style={{ width: 70 }} />}
                <button className="btn btn-petit btn-principal" onClick={() => { envoyer({ faire: 'donner', objet: o.id, a, quantite: n }); setDon(null); }}>Donner</button>
              </div>
            )}
          </article>
        ))}
      </div>
      {d.monnaies.length > 0 && (
        <section className="pile">
          <strong>Bourse</strong>
          <div className="ligne">{d.monnaies.map((m) => <span key={m.id} className="vue-joueur-piece">{d.monnaie[m.id] ?? 0} <small>{m.nom}</small></span>)}</div>
          {peutDonner && (
            <div className="ligne">
              <span>Donner</span>
              <input type="number" min={1} value={montant} onChange={(e) => setMontant(Number(e.target.value))} style={{ width: 80 }} />
              <select value={piece} onChange={(e) => setPiece(e.target.value)}>{d.monnaies.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}</select>
              <select value={a} onChange={(e) => setA(e.target.value)}>{d.compagnons.map((x) => <option key={x.id} value={x.id}>à {x.nom}</option>)}</select>
              <button className="btn btn-petit" disabled={!(montant >= 1) || montant > (d.monnaie[piece] ?? 0)} onClick={() => envoyer({ faire: 'argent', a, piece, montant })}>Donner</button>
            </div>
          )}
        </section>
      )}
      {!d.droits.equiper && !d.droits.donner && <p className="discret">Le maître du jeu gère ton sac : demande-lui pour t’équiper ou donner un objet.</p>}
    </div>
  );
}
