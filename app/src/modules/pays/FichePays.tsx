// Fiche d'un pays / peuple : gouvernement, souverain, population, villes, relations, histoire, coutumes, calendrier,
// et ce que la campagne y relie (PNJ, quêtes, cartes, dynastie). Mode édition pour le MJ.
import { useState } from 'react';
import type { Campagne, Civilisation } from '../../noyau/contrat';
import { emettre } from '../../noyau/bus';
import { BlocMj, Champ } from '../../interface/composants';
import { Calendrier } from './Calendrier';
import { JaugeReputation } from './JaugeReputation';
import { cartesDuPeuple, dynastieDuPeuple, modifierCivilisation, pnjDuPeuple, quetesDuPeuple, type PeupleDeCampagne } from './logique';

const COULEUR_REL: Record<string, string> = { alliés: 'var(--succes)', rivaux: 'var(--danger)', 'partenaires commerciaux': '#4a78b0' };
const lignes = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean);

interface Props { c: Campagne; p: PeupleDeCampagne; mj: boolean; ro: boolean; modifier: (f: (c: Campagne) => Campagne) => void; choisir: (cle: string) => void }

export function FichePays({ c, p, mj, ro, modifier, choisir }: Props) {
  const [edition, setEdition] = useState(false);
  const v = p.civ;
  const maj = (f: (x: Civilisation) => Civilisation) => modifier((x) => modifierCivilisation(x, p.univers.id, v.cle, f));
  const dyn = dynastieDuPeuple(c, p);
  const pnj = pnjDuPeuple(c, p), quetes = quetesDuPeuple(c, p), cartes = cartesDuPeuple(c, p);
  const aller = (page: string, cible?: string) => emettre('naviguer', { page, cible });

  if (edition) return (
    <div className="pays-fiche carte-ui">
      <div className="ligne"><h2 style={{ margin: 0, flex: 1 }}>Modifier {v.nom}</h2><button className="btn btn-principal" onClick={() => setEdition(false)}>Terminé</button></div>
      <fieldset className="pays-edition">
        <Champ libelle="Nom"><input value={v.nom} onChange={(e) => maj((x) => ({ ...x, nom: e.target.value }))} /></Champ>
        <Champ libelle="Régime"><input value={v.regime ?? ''} onChange={(e) => maj((x) => ({ ...x, regime: e.target.value }))} /></Champ>
        <Champ libelle="Souverain"><input value={v.souverain ?? ''} onChange={(e) => maj((x) => ({ ...x, souverain: e.target.value }))} /></Champ>
        <Champ libelle="Titres (masculin, féminin)"><input value={(v.titres ?? []).join(', ')} onChange={(e) => maj((x) => ({ ...x, titres: e.target.value.split(',').map((t) => t.trim()) }))} /></Champ>
        <Champ libelle="Fondateur"><input value={v.fondateur ?? ''} onChange={(e) => maj((x) => ({ ...x, fondateur: e.target.value }))} /></Champ>
        <Champ libelle="Capitale"><input value={v.capitale ?? ''} onChange={(e) => maj((x) => ({ ...x, capitale: e.target.value }))} /></Champ>
        <Champ libelle="Population"><input value={v.population ?? ''} onChange={(e) => maj((x) => ({ ...x, population: e.target.value }))} /></Champ>
        <Champ libelle="Année actuelle"><input type="number" value={v.anActuel ?? ''} onChange={(e) => maj((x) => ({ ...x, anActuel: e.target.value ? Number(e.target.value) : undefined }))} /></Champ>
        <Champ libelle="Époque"><input value={v.ere ?? ''} onChange={(e) => maj((x) => ({ ...x, ere: e.target.value }))} /></Champ>
        <Champ libelle="Langue"><input value={v.langue ?? ''} onChange={(e) => maj((x) => ({ ...x, langue: e.target.value }))} /></Champ>
        <Champ libelle="Croyances"><textarea rows={2} value={v.croyance ?? ''} onChange={(e) => maj((x) => ({ ...x, croyance: e.target.value }))} /></Champ>
        <Champ libelle="Villes (une par ligne, * devant la capitale)"><textarea rows={4} value={v.villes.map((x) => `${x.capitale ? '*' : ''}${x.nom}`).join('\n')}
          onChange={(e) => maj((x) => ({ ...x, villes: lignes(e.target.value).map((l) => ({ nom: l.replace(/^\*/, ''), capitale: l.startsWith('*') })) }))} /></Champ>
        <Champ libelle="Traits (un par ligne)"><textarea rows={3} value={v.traits.join('\n')} onChange={(e) => maj((x) => ({ ...x, traits: lignes(e.target.value) }))} /></Champ>
        <Champ libelle="Coutumes (une par ligne)"><textarea rows={3} value={v.coutumes.join('\n')} onChange={(e) => maj((x) => ({ ...x, coutumes: lignes(e.target.value) }))} /></Champ>
        <Champ libelle="Histoire (« an : événement », une ligne chacun)"><textarea rows={4} value={v.histoire.map((h) => `${h.an} : ${h.texte}`).join('\n')}
          onChange={(e) => maj((x) => ({ ...x, histoire: lignes(e.target.value).map((l) => { const m = l.match(/^(-?\d+)\s*:\s*(.*)$/); return m ? { an: Number(m[1]), texte: m[2] } : { an: 0, texte: l }; }) }))} /></Champ>
        <Champ libelle="Mois du calendrier (« nom : jours »)"><textarea rows={4} value={(v.calendrier?.mois ?? []).map((m) => `${m.nom} : ${m.jours}`).join('\n')}
          onChange={(e) => maj((x) => { const mois = lignes(e.target.value).map((l) => { const m = l.match(/^(.*?)\s*:\s*(\d+)$/); return m ? { nom: m[1], jours: Number(m[2]) } : { nom: l, jours: 30 }; });
            return { ...x, calendrier: { joursParAn: mois.reduce((s, m) => s + m.jours, 0), mois, fetes: x.calendrier?.fetes ?? [] } }; })} /></Champ>
        <Champ libelle="Notes MJ"><textarea rows={3} value={(v.mj as { notes?: string } | undefined)?.notes ?? ''} onChange={(e) => maj((x) => ({ ...x, mj: { ...(x.mj ?? {}), notes: e.target.value } }))} /></Champ>
      </fieldset>
    </div>
  );

  return (
    <div className="pays-fiche carte-ui">
      <div className="pays-entete" style={{ borderColor: v.couleur ?? 'var(--accent)' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>{v.nom.replace(/^les /, 'Les ')}</h2>
          <p className="discret" style={{ margin: 0 }}>{[v.regimeTexte ?? v.regime, v.capitale && `capitale ${v.capitale}`, v.population].filter(Boolean).join(' · ')}</p>
        </div>
        {!ro && <button className="btn btn-petit" onClick={() => setEdition(true)}>Modifier</button>}
      </div>
      <div className="pays-grille">
        <section>
          <h3>Réputation du groupe</h3>
          <JaugeReputation univers={p.univers.id} civ={v} ro={ro} modifier={modifier} />
          <h3>Gouvernement</h3>
          {v.souverain && <p><strong>{v.souverain}</strong>{v.fondateur ? `, dans la lignée de ${v.fondateur}, fondateur.` : ''}</p>}
          {v.ere && <p>{v.ere.charAt(0).toUpperCase() + v.ere.slice(1)}. <span className="discret">{v.ereTexte}</span></p>}
          <div className="ligne" style={{ flexWrap: 'wrap', gap: 6 }}>
            {mj && <button className="btn btn-petit" onClick={() => aller('genealogie', dyn ? dyn.id : `peuple:${String(v.cle)}`)}>{dyn ? 'Voir la dynastie' : 'Générer la dynastie'}</button>}
            {mj && <button className="btn btn-petit" onClick={() => aller('organigrammes', `institutions:${p.univers.id}:${String(v.cle)}`)}>Organigramme des institutions</button>}
          </div>
          {v.relations.length > 0 && <>
            <h3>Relations</h3>
            <div className="pays-chips">{v.relations.map((r) => (
              <button key={String(r.peuple)} className="pays-chip" style={{ borderColor: COULEUR_REL[r.sorte] ?? 'var(--trait)' }} onClick={() => choisir(`${p.univers.id}:${String(r.peuple)}`)}>
                {r.nom.replace(/^les /, '')} <span style={{ color: COULEUR_REL[r.sorte] }}>{r.sorte}</span>
              </button>))}</div>
          </>}
          {v.villes.length > 0 && <>
            <h3>Villes</h3>
            <ul className="pays-liste">{v.villes.map((x) => <li key={x.nom}><strong>{x.nom}</strong>{x.capitale ? ' (capitale)' : ''}{x.desc ? <span className="discret"> · {x.desc.replace(`${x.nom} est `, '')}</span> : null}</li>)}</ul>
          </>}
          {(v.traits.length > 0 || v.langue) && <>
            <h3>Le peuple</h3>
            <ul className="pays-liste">{v.traits.map((t, i) => <li key={i}>{t}</li>)}{v.langue && <li>Langue {v.langue}.</li>}</ul>
          </>}
          {v.croyance && <><h3>Croyances</h3><p>{v.croyance}</p></>}
          {v.coutumes.length > 0 && <><h3>Coutumes</h3><ul className="pays-liste">{v.coutumes.map((t, i) => <li key={i}>{t}</li>)}</ul></>}
        </section>
        <section>
          {v.histoire.length > 0 && <>
            <h3>Histoire</h3>
            <ol className="pays-frise">{v.histoire.map((h, i) => <li key={i}><span className="pays-an">An {h.an}</span><span>{h.texte}</span></li>)}</ol>
          </>}
          {v.calendrier && <><h3>Calendrier</h3><Calendrier cal={v.calendrier} an={v.anActuel} /></>}
          {mj && (pnj.length > 0 || quetes.length > 0 || cartes.length > 0) && <>
            <h3>Dans la campagne</h3>
            {cartes.length > 0 && <p>Cartes : {cartes.map((k) => <button key={k.id} className="pays-lien" onClick={() => aller('cartes', k.id)}>{k.nom}</button>)}</p>}
            {pnj.length > 0 && <p>Personnages : {pnj.map((x) => <button key={x.id} className="pays-lien" onClick={() => aller('personnages', x.id)}>{x.nom}</button>)}</p>}
            {quetes.length > 0 && <p>Quêtes : {quetes.map((q) => <button key={q.id} className="pays-lien" onClick={() => aller('journal', q.id)}>{q.titre}</button>)}</p>}
          </>}
          {mj && (v.mj as { notes?: string } | undefined)?.notes && <BlocMj><p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{(v.mj as { notes: string }).notes}</p></BlocMj>}
        </section>
      </div>
    </div>
  );
}
