// Page Joueurs (MJ) : réglages de ce que les joueurs font sur leur écran, jets à demander, journal du groupe,
// montées de niveau à valider.
import { useState } from 'react';
import type { Campagne, Personnage } from '../../noyau/contrat';
import { emettre } from '../../noyau/bus';
import { aUneFiche, type ModeJet, type SystemeRegles } from '../../noyau/regles';
import {
  avecDroitsInventaire, avecEntreeGroupe, avecEntreeModifiee, demanderJet, demandeNiveau, demandesJet, droitsInventaire,
  jetsDeLaFiche, journalGroupe, retirerDemandeJet, trancherNiveau,
} from './actions';
import { avecDroitsEntrainement, avecDroitsTalents, droitsEntrainement, droitsTalents } from './logique';

type Modifier = (f: (c: Campagne) => Campagne) => void;
const Coche = ({ oui, changer, children }: { oui: boolean; changer: (v: boolean) => void; children: string }) =>
  <label className="ligne"><input type="checkbox" checked={oui} onChange={(e) => changer(e.target.checked)} /> {children}</label>;

/** Ce que les joueurs peuvent faire eux-mêmes sur leur écran. */
export function Reglages({ c, modifier }: { c: Campagne; modifier: Modifier }) {
  const t = droitsTalents(c), e = droitsEntrainement(c), i = droitsInventaire(c);
  return (
    <details className="carte-ui pile">
      <summary><strong>Ce que les joueurs font eux-mêmes sur leur écran</strong></summary>
      <p className="discret" style={{ margin: '4px 0' }}>Onglets du joueur : Table, Ma fiche, Dés, Sac, Talents, Niveau (quand il peut monter), Groupe, Entraînement (s’il trace des sorts), Messages. Tout passe par toi : rien n’est gardé hors des règles et de ces réglages.</p>
      <strong>Talents</strong>
      <Coche oui={t.developper} changer={(v) => modifier((x) => avecDroitsTalents(x, { developper: v }))}>Les joueurs dépensent eux-mêmes leurs points de talent</Coche>
      <Coche oui={t.retirer} changer={(v) => modifier((x) => avecDroitsTalents(x, { retirer: v }))}>… et peuvent oublier un talent (points rendus)</Coche>
      <strong>Sac et bourse</strong>
      <Coche oui={i.equiper} changer={(v) => modifier((x) => avecDroitsInventaire(x, { equiper: v }))}>Les joueurs s’équipent eux-mêmes</Coche>
      <Coche oui={i.donner} changer={(v) => modifier((x) => avecDroitsInventaire(x, { donner: v }))}>Les joueurs se donnent objets et argent entre eux</Coche>
      <strong>Entraînement à la magie</strong>
      <Coche oui={e.lecons} changer={(v) => modifier((x) => avecDroitsEntrainement(x, { lecons: v }))}>Une leçon réussie apprend son signe au personnage</Coche>
      <Coche oui={e.grimoire} changer={(v) => modifier((x) => avecDroitsEntrainement(x, { grimoire: v }))}>Les joueurs peuvent inscrire ou retirer des sorts de leur grimoire</Coche>
      <p className="discret" style={{ margin: 0 }}>Les montées de niveau attendent toujours ta validation (carte de chaque joueur).</p>
    </details>
  );
}

/** Demander un jet à un ou plusieurs joueurs ; le DD reste chez toi, le résultat s'affiche ici. */
export function DemandeJets({ c, pjs, R, modifier }: { c: Campagne; pjs: Personnage[]; R: SystemeRegles; modifier: Modifier }) {
  const jets = pjs[0] && aUneFiche(R) ? jetsDeLaFiche(pjs[0], R) : [];
  const [qui, setQui] = useState<string[]>(pjs.map((p) => p.id));
  const [cle, setCle] = useState('competence.perception');
  const [dd, setDd] = useState('');
  const [mode, setMode] = useState<ModeJet>('normal');
  if (!jets.length) return null;
  const libelle = jets.find((j) => j.cle === cle)?.libelle ?? cle;
  const enAttente = pjs.flatMap((p) => demandesJet(c, p.id).map((d) => ({ p, d })));
  const demander = () => {
    modifier((x) => demanderJet(x, qui, { cle, libelle, mode, dd: dd ? Number(dd) : null }));
    emettre('message', { texte: `Jet de ${libelle} demandé à ${qui.length} joueur${qui.length > 1 ? 's' : ''}.`, sorte: 'succes' });
  };
  return (
    <section className="carte-ui pile">
      <strong>Demander un jet</strong>
      <div className="ligne">
        {pjs.map((p) => <label key={p.id} className="ligne"><input type="checkbox" checked={qui.includes(p.id)} onChange={(e) => setQui((q) => (e.target.checked ? [...q, p.id] : q.filter((x) => x !== p.id)))} /> {p.nom}</label>)}
      </div>
      <div className="ligne">
        <select value={cle} onChange={(e) => setCle(e.target.value)}>
          {[...new Set(jets.map((j) => j.groupe))].map((g) => <optgroup key={g} label={g}>{jets.filter((j) => j.groupe === g).map((j) => <option key={j.cle} value={j.cle}>{j.libelle}</option>)}</optgroup>)}
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value as ModeJet)}><option value="normal">Neutre</option><option value="avantage">Avantage</option><option value="desavantage">Désavantage</option></select>
        <input type="number" min={1} max={40} value={dd} onChange={(e) => setDd(e.target.value)} placeholder="DD (secret)" style={{ width: 110 }} />
        <button className="btn btn-mj" disabled={!qui.length} onClick={demander}>Demander</button>
      </div>
      {enAttente.length > 0 && (
        <div className="pile" style={{ gap: 2 }}>
          {enAttente.map(({ p, d }) => (
            <div key={d.id} className="ligne discret">
              <span style={{ flex: 1 }}>⏳ {p.nom} : {d.libelle}{d.dd ? ` (DD ${d.dd})` : ''}</span>
              <button className="combat-oeil" title="Annuler la demande" onClick={() => modifier((x) => retirerDemandeJet(x, p.id, d.id).campagne)}>×</button>
            </div>
          ))}
        </div>
      )}
      <p className="discret" style={{ margin: 0 }}>Le joueur reçoit un son et l’onglet Dés ; son jet roule en 3D chez tous, avec le bonus de sa fiche. Le résultat contre le DD s’affiche ici en notification.</p>
    </section>
  );
}

/** Journal du groupe : tout ce que les joueurs ont noté ; le MJ ajoute ou efface. */
export function JournalGroupe({ c, modifier }: { c: Campagne; modifier: Modifier }) {
  const [texte, setTexte] = useState('');
  const entrees = journalGroupe(c);
  return (
    <details className="carte-ui pile" open={entrees.length > 0}>
      <summary><strong>Journal du groupe ({entrees.length})</strong></summary>
      <div className="ligne">
        <input value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Note pour tout le groupe (signée MJ)" style={{ flex: 1 }} />
        <button className="btn btn-mj" disabled={!texte.trim()} onClick={() => { modifier((x) => avecEntreeGroupe(x, 'MJ', null, texte)); setTexte(''); }}>Ajouter</button>
      </div>
      <div className="joueurs-messages">
        {[...entrees].reverse().map((e) => (
          <div key={e.id} className={`joueurs-message ${e.persoId ? 'du-joueur' : ''}`}>
            <span className="discret">{e.auteur} · {new Date(e.quand).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
            <p>{e.texte}</p>
            <button className="combat-oeil" title="Effacer" onClick={() => modifier((x) => avecEntreeModifiee(x, e.id, null, null))}>×</button>
          </div>
        ))}
      </div>
    </details>
  );
}

/** Montée de niveau proposée par le joueur : résumé, Valider ou Refuser. */
export function NiveauAValider({ c, p, R, modifier }: { c: Campagne; p: Personnage; R: SystemeRegles; modifier: Modifier }) {
  const d = demandeNiveau(c, p.id);
  if (!d || !aUneFiche(R)) return null;
  const k = d.choix;
  return (
    <div className="joueurs-alerte pile" style={{ gap: 4 }}>
      <strong>⬆ Montée de niveau proposée</strong>
      <span>{R.catalogue.classes.find((x) => x.id === k.classe)?.nom ?? k.classe}{k.sousClasse ? ` (${k.sousClasse})` : ''} · +{k.pv} PV{k.amelioration ? ` · ${Object.entries(k.amelioration).map(([a, v]) => `+${v} ${a.toUpperCase()}`).join(', ')}` : ''}{k.don ? ` · don : ${k.don}` : ''}</span>
      <div className="ligne">
        <button className="btn btn-petit btn-principal" onClick={() => { modifier((x) => trancherNiveau(x, p.id, true, R)); emettre('message', { texte: `${p.nom} monte de niveau.`, sorte: 'succes' }); }}>Valider</button>
        <button className="btn btn-petit" onClick={() => modifier((x) => trancherNiveau(x, p.id, false, R))}>Refuser (à refaire)</button>
      </div>
    </div>
  );
}
