// Écran d'un joueur : sa montée de niveau, étape par étape (classe, points de vie, ce qu'il gagne, sous-classe,
// amélioration ou don, récapitulatif). Chaque étape explique le choix ; la proposition part au MJ, qui la valide.
import { useMemo, useState } from 'react';
import type { Personnage } from '../../../noyau/contrat';
import { aUneFiche, lancer, regles, type AptitudeRegles } from '../../../noyau/regles';
import type { PropsVueJoueurs } from '../../../interface/types';
import { donsAuChoix, type ChoixNiveau } from '../progression/logique';
import { texteEffet } from '../fiche/Talents';
import '../personnages.css';

interface Donnees { perso: Personnage; regles: string; attente: { choix: ChoixNiveau; quand: string } | null }
const CARACS: [string, string][] = [['for', 'Force'], ['dex', 'Dextérité'], ['con', 'Constitution'], ['int', 'Intelligence'], ['sag', 'Sagesse'], ['cha', 'Charisme']];
const signe = (n: number) => (n >= 0 ? `+${n}` : String(n));

function Aptitudes({ liste, niveau }: { liste: AptitudeRegles[]; niveau?: number }) {
  return <ul className="niveau-aptitudes">{liste.map((a, i) => <li key={i} className={niveau !== undefined && a.niveau === niveau ? 'maintenant' : ''}>{niveau !== undefined && <small>niv. {a.niveau} </small>}<b>{a.nom}</b> — {a.texte}</li>)}</ul>;
}

export default function Niveau({ donnees, envoyer }: PropsVueJoueurs) {
  const d = donnees as unknown as Donnees;
  const R = useMemo(() => regles(d.regles), [d.regles]);
  const p = d.perso;
  const classes = p.fiche?.progression?.classes ?? [];
  const [classe, setClasse] = useState(classes[0]?.id ?? '');
  const [multi, setMulti] = useState(false);
  const [jet, setJet] = useState<number | null>(null);
  const [sousClasse, setSousClasse] = useState<string | null>(null);
  const [mode, setMode] = useState<'deux' | 'un-un' | 'don'>('deux');
  const [c1, setC1] = useState('for');
  const [c2, setC2] = useState('con');
  const [don, setDon] = useState('');
  const [etape, setEtape] = useState(0);
  if (!aUneFiche(R)) return null;

  const nomClasse = (id: string) => R.catalogue.classes.find((x) => x.id === id)?.nom ?? id;
  if (d.attente) {
    const c = d.attente.choix;
    return (
      <div className="vue-niveau pile">
        <h3 style={{ margin: 0 }}>Montée de niveau envoyée ✔</h3>
        <p style={{ margin: 0 }}>{nomClasse(c.classe)}{c.sousClasse ? ` · ${R.catalogue.classes.find((x) => x.id === c.classe)?.sousClasses.find((s) => s.id === c.sousClasse)?.nom ?? ''}` : ''} · +{c.pv} PV{c.amelioration ? ` · ${Object.entries(c.amelioration).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ')}` : ''}{c.don ? ` · don : ${R.catalogue.dons?.find((x) => x.id === c.don)?.nom ?? c.don}` : ''}</p>
        <p className="discret">Le maître du jeu va la valider. S’il la refuse, tu pourras recommencer ici.</p>
      </div>
    );
  }

  const total = classes.reduce((s, c) => s + c.niveau, 0);
  const actuel = classes.find((c) => c.id === classe)?.niveau ?? 0;
  const scActuelle = classes.find((c) => c.id === classe)?.sousClasse ?? null;
  const n = R.progression.nouveautes(classe, actuel + 1, scActuelle);
  const carac = (p.combat.stats.carac ?? {}) as Record<string, number>;
  const modCon = Math.floor(((carac.con ?? 10) - 10) / 2);
  const bonusPv = (R.calculer(p).aptitudes ?? []).flatMap((a) => a.effets ?? []).filter((e) => e.cible === 'pvParNiveau').reduce((t, e) => t + e.valeur, 0);
  const moyenne = R.progression.gainPv(classe, modCon) + bonusPv;
  const pv = (jet === null ? moyenne : R.progression.gainPv(classe, modCon, jet) + bonusPv);
  const sc = n?.sousClasse ? (sousClasse ?? null) : undefined;
  const amelioration = !n?.amelioration || mode === 'don' ? undefined : mode === 'deux' || c1 === c2 ? { [c1]: 2 } : { [c1]: 1, [c2]: 1 };
  const choix: ChoixNiveau = { classe, pv, sousClasse: sc ?? undefined, amelioration, don: n?.amelioration && mode === 'don' && don ? don : undefined };
  const nomDon = R.catalogue.dons?.find((x) => x.id === choix.don)?.nom ?? choix.don;
  // Gains de ce niveau : classe, sous-classe déjà prise, ou celle qu'on vient de choisir.
  const gagne = [...(n?.aptitudes ?? []), ...(n?.aptitudesSousClasse ?? []), ...(n?.sousClasse?.find((x) => x.id === sousClasse)?.aptitudes.filter((a) => a.niveau === actuel + 1) ?? [])];

  // Étapes présentes selon le niveau ; chacune dit si elle est complète.
  const etapes: { titre: string; ok: boolean; corps: JSX.Element }[] = [
    { titre: 'Classe', ok: !!classe, corps: (
      <div className="pile">
        <p className="discret">En général, on continue dans sa classe. Prendre une autre classe (multiclasse) donne ses aptitudes de niveau 1, mais retarde les pouvoirs de la première.</p>
        {classes.map((c) => (
          <button key={c.id} className={`niveau-carte ${classe === c.id ? 'choisie' : ''}`} onClick={() => { setClasse(c.id); setJet(null); setSousClasse(null); }}>
            <b>Continuer en {nomClasse(c.id)}</b><span>niveau {c.niveau} → {c.niveau + 1}</span>
          </button>
        ))}
        <button className="btn btn-petit" onClick={() => setMulti(!multi)}>{multi ? 'Masquer' : 'Prendre une autre classe…'}</button>
        {multi && R.catalogue.classes.filter((c) => !classes.some((x) => x.id === c.id)).map((c) => (
          <button key={c.id} className={`niveau-carte ${classe === c.id ? 'choisie' : ''}`} onClick={() => { setClasse(c.id); setJet(null); setSousClasse(null); }}>
            <b>{c.nom}</b><span>{c.texte ?? 'nouvelle classe, niveau 1'}</span>
          </button>
        ))}
      </div>
    ) },
    { titre: 'Points de vie', ok: true, corps: (
      <div className="pile">
        <p className="discret">Ton maximum de PV augmente. La moyenne est sûre ; le dé peut donner plus… ou moins. Le résultat compte une fois lancé.</p>
        <div className="ligne">
          <button className={`niveau-carte ${jet === null ? 'choisie' : ''}`} disabled={jet !== null} onClick={() => setJet(null)}><b>Moyenne</b><span>+{moyenne} PV</span></button>
          <button className={`niveau-carte ${jet !== null ? 'choisie' : ''}`} disabled={jet !== null} onClick={() => setJet(lancer(`1d${n?.deVie ?? 8}`).total)}>
            <b>{jet === null ? `Lancer le d${n?.deVie ?? 8}` : `Dé : ${jet}`}</b><span>{jet === null ? `d${n?.deVie ?? 8} ${signe(modCon)} CON${bonusPv ? ` +${bonusPv}` : ''}` : `+${pv} PV`}</span>
          </button>
        </div>
      </div>
    ) },
    ...(n?.sousClasse ? [{ titre: 'Sous-classe', ok: !!sousClasse, corps: (
      <div className="pile">
        <p className="discret">Ta spécialisation pour toute la suite : choisis celle qui ressemble à ton personnage. Tu vois tout ce qu’elle apporte, niveau par niveau (en gras : dès maintenant).</p>
        {n.sousClasse.map((s) => (
          <button key={s.id} className={`niveau-carte large ${sousClasse === s.id ? 'choisie' : ''}`} onClick={() => setSousClasse(s.id)}>
            <b>{s.nom}</b>{s.texte && <span>{s.texte}</span>}
            <Aptitudes liste={s.aptitudes} niveau={actuel + 1} />
          </button>
        ))}
      </div>
    ) }] : []),
    { titre: 'Ce que tu gagnes', ok: true, corps: gagne.length ? <Aptitudes liste={gagne} /> : <p className="discret">Pas de nouvelle aptitude à ce niveau : tes capacités actuelles progressent (sorts, dés, bonus).</p> },
    ...(n?.amelioration ? [{ titre: 'Amélioration ou don', ok: mode !== 'don' || !!don, corps: (
      <div className="pile">
        <p className="discret">Augmente tes caractéristiques (maximum 20), ou choisis un don : une capacité permanente (bonus sur la fiche, action de combat, magie). Les dons grisés demandent un prérequis.</p>
        <div className="ligne">
          <button className={`niveau-carte ${mode === 'deux' ? 'choisie' : ''}`} onClick={() => setMode('deux')}><b>+2 à une</b></button>
          <button className={`niveau-carte ${mode === 'un-un' ? 'choisie' : ''}`} onClick={() => setMode('un-un')}><b>+1 à deux</b></button>
          <button className={`niveau-carte ${mode === 'don' ? 'choisie' : ''}`} onClick={() => setMode('don')}><b>Un don</b></button>
        </div>
        {mode !== 'don' ? (
          <div className="ligne">
            {[c1, ...(mode === 'un-un' ? [c2] : [])].map((v, i) => (
              <select key={i} value={v} onChange={(e) => (i ? setC2 : setC1)(e.target.value)}>
                {CARACS.map(([k, l]) => <option key={k} value={k}>{l} : {carac[k] ?? 10} → {Math.min(20, (carac[k] ?? 10) + (mode === 'deux' ? 2 : 1 + (c1 === c2 && mode === 'un-un' ? 1 : 0)))}</option>)}
              </select>
            ))}
          </div>
        ) : (
          <div className="pile">
            {donsAuChoix(p, R).map(({ don: x, raison }) => (
              <button key={x.id} className={`niveau-carte large ${don === x.id ? 'choisie' : ''}`} disabled={!!raison} onClick={() => setDon(x.id)}>
                <b>{x.nom}</b><span>{x.texte}</span>
                {x.effets?.length ? <small>{x.effets.map((e) => texteEffet(e.cible, e.valeur)).join(' · ')}</small> : null}
                {raison && <small className="perso-erreur">Il faut : {raison}</small>}
              </button>
            ))}
          </div>
        )}
      </div>
    ) }] : []),
    { titre: 'Récapitulatif', ok: true, corps: (
      <div className="pile">
        <ul className="niveau-recap">
          <li>Niveau {total} → <b>{total + 1}</b> : {nomClasse(classe)} {actuel + 1}</li>
          <li>Points de vie : <b>+{pv}</b> ({jet === null ? 'moyenne' : `dé ${jet}`})</li>
          {gagne.map((a, i) => <li key={i}>Aptitude : <b>{a.nom}</b></li>)}
          {sc && <li>Sous-classe : <b>{n?.sousClasse?.find((s) => s.id === sc)?.nom}</b></li>}
          {amelioration && <li>Amélioration : <b>{Object.entries(amelioration).map(([k, v]) => `+${v} ${CARACS.find((c) => c[0] === k)?.[1]}`).join(', ')}</b></li>}
          {choix.don && <li>Don : <b>{nomDon}</b></li>}
        </ul>
        <button className="btn btn-principal" disabled={!!n?.sousClasse && !sousClasse} onClick={() => envoyer({ choix })}>Envoyer au maître du jeu</button>
        {!!n?.sousClasse && !sousClasse && <span className="perso-erreur">Choisis d’abord ta sous-classe.</span>}
      </div>
    ) },
  ];
  const i = Math.min(etape, etapes.length - 1), e = etapes[i];

  return (
    <div className="vue-niveau pile">
      <h3 style={{ margin: 0 }}>⬆ {p.nom} monte au niveau {total + 1} !</h3>
      <ol className="niveau-etapes">
        {etapes.map((x, k) => <li key={x.titre} className={`${k === i ? 'active' : ''} ${k < i && x.ok ? 'faite' : ''}`}><button onClick={() => setEtape(k)}>{k + 1}. {x.titre}</button></li>)}
      </ol>
      <section className="niveau-etape pile">
        <strong>{i + 1}. {e.titre}</strong>
        {e.corps}
      </section>
      <div className="ligne">
        <button className="btn" disabled={i === 0} onClick={() => setEtape(i - 1)}>← Précédent</button>
        <span style={{ flex: 1 }} />
        {i < etapes.length - 1 && <button className="btn btn-principal" disabled={!e.ok} onClick={() => setEtape(i + 1)}>Suivant →</button>}
      </div>
    </div>
  );
}
