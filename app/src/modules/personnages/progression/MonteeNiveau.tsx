// Assistant de montée de niveau : classe (ou multiclasse), PV (moyenne ou jet), nouvelles aptitudes,
// sous-classe, amélioration de caractéristiques ou don.
import { useState } from 'react';
import type { Personnage } from '../../../noyau/contrat';
import type { SystemeAvecFiche } from '../../../noyau/regles';
import { lancer } from '../../../noyau/regles';
import { Champ } from '../../../interface/composants';
import type { ChoixNiveau } from './logique';

const CARACS = ['for', 'dex', 'con', 'int', 'sag', 'cha'];

export function MonteeNiveau({ p, R, onValider, onAnnuler }: { p: Personnage; R: SystemeAvecFiche; onValider(c: ChoixNiveau): void; onAnnuler(): void }) {
  const classes = p.fiche?.progression?.classes ?? [];
  const [classe, setClasse] = useState(classes[0]?.id ?? R.catalogue.classes[0].id);
  const actuel = classes.find((c) => c.id === classe)?.niveau ?? 0;
  const n = R.progression.nouveautes(classe, actuel + 1);
  const carac = (p.combat.stats.carac ?? {}) as Record<string, number>;
  const modCon = Math.floor(((carac.con ?? 10) - 10) / 2);
  const [jet, setJet] = useState<number | null>(null);
  const [sousClasse, setSousClasse] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<'deux' | 'un-un' | 'don'>('deux');
  const [c1, setC1] = useState(R.catalogue.classes.find((c) => c.id === classe)?.principales[0] ?? 'for');
  const [c2, setC2] = useState('con');
  const [don, setDon] = useState('');
  // Bonus de PV par niveau (ténacité naine, lignée draconique…) : effets « pvParNiveau » des aptitudes actives.
  const bonusPv = (R.calculer(p).aptitudes ?? []).flatMap((a) => a.effets ?? []).filter((e) => e.cible === 'pvParNiveau').reduce((t, e) => t + e.valeur, 0);
  const pv = R.progression.gainPv(classe, modCon, jet ?? undefined) + bonusPv;
  const sc = sousClasse ?? n?.sousClasse?.[0]?.id;
  const amelioration = !n?.amelioration || mode === 'don' ? undefined : mode === 'deux' ? { [c1]: 2 } : c1 === c2 ? { [c1]: 2 } : { [c1]: 1, [c2]: 1 };

  return (
    <div className="pile perso-montee">
      <h3 style={{ margin: 0 }}>Monter au niveau {classes.reduce((s, c) => s + c.niveau, 0) + 1}</h3>
      <Champ libelle="Classe">
        <select value={classe} onChange={(e) => { setClasse(e.target.value); setJet(null); setSousClasse(undefined); }}>
          {classes.map((c) => <option key={c.id} value={c.id}>{R.catalogue.classes.find((x) => x.id === c.id)?.nom ?? c.id} {c.niveau} → {c.niveau + 1}</option>)}
          <optgroup label="Multiclasser">
            {R.catalogue.classes.filter((c) => !classes.some((x) => x.id === c.id)).map((c) => <option key={c.id} value={c.id}>{c.nom} (niveau 1)</option>)}
          </optgroup>
        </select>
      </Champ>
      <div className="ligne">
        <span>Points de vie : <strong>+{pv}</strong> (d{n?.deVie} {jet === null ? 'moyenne' : `jet ${jet}`}, CON {modCon >= 0 ? '+' : ''}{modCon}{bonusPv ? `, +${bonusPv} aptitudes` : ''})</span>
        <button className="btn btn-petit" onClick={() => setJet(lancer(`1d${n?.deVie ?? 8}`).total)}>Lancer le dé</button>
        {jet !== null && <button className="btn btn-petit" onClick={() => setJet(null)}>Prendre la moyenne</button>}
      </div>
      {n?.aptitudes.length ? (
        <div>
          <strong>Nouvelles aptitudes</strong>
          <ul className="perso-aptitudes">{n.aptitudes.map((a) => <li key={a.nom}><strong>{a.nom}</strong> — {a.texte}</li>)}</ul>
        </div>
      ) : <p className="discret">Pas de nouvelle aptitude de classe à ce niveau (sorts et capacités existantes progressent).</p>}
      {n?.sousClasse && (
        <Champ libelle="Sous-classe">
          <select value={sc} onChange={(e) => setSousClasse(e.target.value)}>{n.sousClasse.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</select>
        </Champ>
      )}
      {n?.amelioration && (
        <div className="pile" style={{ gap: 6 }}>
          <strong>Amélioration de caractéristiques</strong>
          <div className="ligne">
            <label className="ligne"><input type="radio" checked={mode === 'deux'} onChange={() => setMode('deux')} /> +2 à une</label>
            <label className="ligne"><input type="radio" checked={mode === 'un-un'} onChange={() => setMode('un-un')} /> +1 à deux</label>
            <label className="ligne"><input type="radio" checked={mode === 'don'} onChange={() => setMode('don')} /> un don</label>
          </div>
          {mode !== 'don' ? (
            <div className="ligne">
              <select value={c1} onChange={(e) => setC1(e.target.value)}>{CARACS.map((k) => <option key={k} value={k}>{k.toUpperCase()} ({carac[k] ?? 10})</option>)}</select>
              {mode === 'un-un' && <select value={c2} onChange={(e) => setC2(e.target.value)}>{CARACS.map((k) => <option key={k} value={k}>{k.toUpperCase()} ({carac[k] ?? 10})</option>)}</select>}
              <span className="discret">maximum 20</span>
            </div>
          ) : <input value={don} placeholder="Nom du don (Robuste, Vigilant, Maître d’armes…)" onChange={(e) => setDon(e.target.value)} />}
        </div>
      )}
      <div className="ligne">
        <button className="btn btn-principal" onClick={() => onValider({ classe, pv, sousClasse: n?.sousClasse ? sc : undefined, amelioration, don: n?.amelioration && mode === 'don' ? don || 'Don' : undefined })}>Valider le niveau</button>
        <button className="btn" onClick={onAnnuler}>Annuler</button>
      </div>
    </div>
  );
}
