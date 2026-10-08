// Page Générateurs : PNJ, taverne, boutique, butin à la volée. « Relancer » tire une nouvelle graine ;
// « Garder » crée le PNJ (stats et sorts selon son rôle, avatar) et/ou un document caché ; « Montrer » l'envoie à l'écran joueurs.
import { useMemo, useState } from 'react';
import type { Campagne } from '../../noyau/contrat';
import { emettre, montrerAuxJoueurs } from '../../noyau/bus';
import { regles } from '../../noyau/regles';
import { useCampagne } from '../../interface/etat';
import { apparenceAuto } from '../avatar';
import { nouveauDocument } from '../documents';
import { donnerSortsAuxPnj } from '../magie';
import { peuplesDeCampagne } from '../pays';
import {
  SORTES_BOUTIQUE, TRANCHES, contexteDe, etalBoutique, genererBoutique, genererButin, genererPnj, genererTaverne, menuTaverne,
  pnjVersPersonnage, texteBoutique, texteButin, texteTaverne, type PnjGenere,
} from './logique';
import './generateurs.css';

type Onglet = 'pnj' | 'taverne' | 'boutique' | 'butin';
const ONGLETS: { id: Onglet; libelle: string }[] = [{ id: 'pnj', libelle: 'PNJ' }, { id: 'taverne', libelle: 'Taverne' }, { id: 'boutique', libelle: 'Boutique' }, { id: 'butin', libelle: 'Butin' }];
const nouvelleGraine = () => Date.now().toString(36);

export function Page() {
  const { campagne, lectureSeule, modifier } = useCampagne();
  const c = campagne!;
  const R = regles(c.campagne.regles);
  const [onglet, setOnglet] = useState<Onglet>('pnj');
  const [graine, setGraine] = useState(nouvelleGraine);
  const [peuple, setPeuple] = useState('');
  const [role, setRole] = useState('');
  const [sorteBoutique, setSorteBoutique] = useState('');
  const [tranche, setTranche] = useState(TRANCHES[0].id);
  const ctx = useMemo(() => contexteDe(c, peuple || undefined), [c, peuple]);
  const peuples = peuplesDeCampagne(c);

  const pnj = useMemo(() => genererPnj(graine, ctx, role || undefined), [graine, ctx, role]);
  const taverne = useMemo(() => genererTaverne(graine, ctx), [graine, ctx]);
  const boutique = useMemo(() => genererBoutique(graine, ctx, sorteBoutique || undefined), [graine, ctx, sorteBoutique]);
  const butin = useMemo(() => genererButin(graine, tranche), [graine, tranche]);

  const garderPnj = (g: PnjGenere, graineP: string): string => {
    const p = { ...pnjVersPersonnage(g, R, c.campagne.regles, ctx, graineP), apparence: apparenceAuto({ nom: g.nom, apparence: g.apparence, feminin: g.sexe === 'f', peuple: ctx.peuple?.cle ?? null, role: g.role, peupleNom: ctx.peuple?.nom }) };
    modifier((x) => donnerSortsAuxPnj({ ...x, personnages: [...x.personnages, p] }));
    return p.id;
  };
  const garderDocument = (titre: string, texte: string) => modifier((x: Campagne) => nouveauDocument(x, 'texte', titre, texte).campagne);
  const dire = (texte: string) => emettre('message', { texte, sorte: 'succes' });

  return (
    <div className="gen-page pile">
      <div className="ligne" style={{ flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, flex: 1 }}>Générateurs</h1>
        {ONGLETS.map((o) => <button key={o.id} className={`btn btn-petit ${onglet === o.id ? 'btn-principal' : ''}`} onClick={() => setOnglet(o.id)}>{o.libelle}</button>)}
      </div>
      <div className="ligne gen-reglages">
        {peuples.length > 0 && onglet !== 'butin' && (
          <label className="ligne discret">Noms :
            <select value={peuple} onChange={(e) => setPeuple(e.target.value)}>
              {peuples.map((p) => <option key={`${p.univers.id}:${String(p.civ.cle)}`} value={`${p.univers.id}:${String(p.civ.cle)}`}>{p.civ.nom.replace(/^les /, '')}</option>)}
            </select>
          </label>
        )}
        {onglet === 'pnj' && <input placeholder="Rôle imposé (facultatif)" value={role} onChange={(e) => setRole(e.target.value)} />}
        {onglet === 'boutique' && (
          <select value={sorteBoutique} onChange={(e) => setSorteBoutique(e.target.value)}>
            <option value="">Boutique au hasard</option>
            {SORTES_BOUTIQUE.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
          </select>
        )}
        {onglet === 'butin' && (
          <select value={tranche} onChange={(e) => setTranche(e.target.value)}>{TRANCHES.map((t) => <option key={t.id} value={t.id}>{t.libelle}</option>)}</select>
        )}
        <button className="btn btn-principal" onClick={() => setGraine(nouvelleGraine())}>Relancer</button>
      </div>

      {onglet === 'pnj' && (
        <div className="carte-ui gen-carte">
          <h2>{pnj.nom} <span className="discret">· {pnj.role}</span></h2>
          <p>{pnj.apparence.charAt(0).toUpperCase() + pnj.apparence.slice(1)} ; {pnj.maniere}.</p>
          <p><strong>Veut :</strong> {pnj.motivation}. <strong>Cache :</strong> {pnj.secret}.</p>
          <p><strong>Accroche :</strong> {pnj.accroche}.</p>
          {!lectureSeule && <div className="ligne">
            <button className="btn btn-principal" onClick={() => { const id = garderPnj(pnj, graine); dire(`${pnj.nom} rejoint les personnages (stats et sorts selon son rôle).`); emettre('naviguer', { page: 'personnages', cible: id }); }}>Garder comme PNJ</button>
          </div>}
        </div>
      )}

      {onglet === 'taverne' && (
        <div className="carte-ui gen-carte">
          <h2>{taverne.nom} <span className="discret">· {taverne.sorte}</span></h2>
          <p>Ambiance {taverne.ambiance}.</p>
          <p><strong>{taverne.patron.nom}</strong>, {taverne.patron.role}, {taverne.traitPatron}.</p>
          <pre className="gen-menu">{menuTaverne(taverne)}</pre>
          <p><strong>Clients :</strong> {taverne.clients.join(' ; ')}.</p>
          <p><strong>Ce soir :</strong> {taverne.evenement}.</p>
          <p><strong>Rumeurs :</strong></p>
          <ul>{taverne.rumeurs.map((r, i) => <li key={i}>{r}</li>)}</ul>
          {!lectureSeule && <div className="ligne" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-mj" onClick={() => montrerAuxJoueurs({ sorte: 'document', titre: taverne.nom, texte: menuTaverne(taverne), style: 'affiche' })}>Montrer la carte aux joueurs</button>
            <button className="btn btn-principal" onClick={() => { garderPnj(taverne.patron, `${graine}|patron`); garderDocument(taverne.nom, texteTaverne(taverne)); dire(`${taverne.nom} gardée : le patron est dans Personnages, la fiche dans Documents.`); }}>Garder</button>
          </div>}
        </div>
      )}

      {onglet === 'boutique' && (
        <div className="carte-ui gen-carte">
          <h2>{boutique.nom} <span className="discret">· {boutique.sorte}</span></h2>
          <p><strong>{boutique.proprietaire.nom}</strong>, {boutique.humeur} ; {boutique.particularite}.</p>
          <table className="gen-table"><tbody>{boutique.objets.map((o) => <tr key={o.nom}><td>{o.nom}{o.rare ? ' ★' : ''}</td><td>{o.prix}</td></tr>)}</tbody></table>
          {!lectureSeule && <div className="ligne" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-mj" onClick={() => montrerAuxJoueurs({ sorte: 'document', titre: boutique.nom, texte: etalBoutique(boutique), style: 'parchemin' })}>Montrer l’étal aux joueurs</button>
            <button className="btn btn-principal" onClick={() => { garderPnj(boutique.proprietaire, `${graine}|proprio`); garderDocument(boutique.nom, texteBoutique(boutique)); dire(`${boutique.nom} gardée : le marchand est dans Personnages, l’étal dans Documents.`); }}>Garder</button>
          </div>}
        </div>
      )}

      {onglet === 'butin' && (
        <div className="carte-ui gen-carte">
          <h2>Butin <span className="discret">· environ {butin.valeur.toLocaleString('fr-FR')} po</span></h2>
          <pre className="gen-menu">{texteButin(butin)}</pre>
          {!lectureSeule && <div className="ligne" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-mj" onClick={() => montrerAuxJoueurs({ sorte: 'texte', titre: 'Butin', texte: texteButin(butin) })}>Montrer aux joueurs</button>
            <button className="btn btn-principal" onClick={() => { garderDocument('Butin', texteButin(butin)); dire('Butin gardé dans Documents.'); }}>Garder</button>
          </div>}
        </div>
      )}
    </div>
  );
}
