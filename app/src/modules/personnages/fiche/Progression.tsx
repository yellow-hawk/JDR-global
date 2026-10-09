// Onglet Progression : classes et sous-classes (catalogue du système), expérience et montée de niveau,
// aptitudes actives (classes, peuple), incantation, aptitudes et dons notés à la main, historique d'XP.
import { useState } from 'react';
import { Champ } from '../../../interface/composants';
import type { FicheCalculee, SystemeAvecFiche } from '../../../noyau/regles';
import { aUneFiche } from '../../../noyau/regles';
import { MonteeNiveau } from '../progression/MonteeNiveau';
import { appliquerNiveau, etatProgression } from '../progression/logique';
import { majFiche, type PropsOnglet } from './types';

export function Progression({ p, R, role, lectureSeule, maj, calcul }: PropsOnglet & { calcul: FicheCalculee | null }) {
  const [monter, setMonter] = useState(false);
  const pr = p.fiche?.progression ?? {};
  const classes = pr.classes ?? [];
  const aptitudes = pr.aptitudes ?? [];
  const majPr = (f: (x: typeof pr) => typeof pr) => majFiche(maj, 'progression', (x) => f(x ?? {}));
  const S = aUneFiche(R) ? (R as SystemeAvecFiche) : null;
  const etat = S ? etatProgression(p, S) : null;
  const pourcent = etat?.suivant ? Math.min(100, Math.round(((etat.xp - etat.precedent) / (etat.suivant - etat.precedent)) * 100)) : 100;
  const parSource = new Map<string, NonNullable<FicheCalculee['aptitudes']>>();
  for (const a of calcul?.aptitudes ?? []) parSource.set(a.source, [...(parSource.get(a.source) ?? []), a]);

  if (monter && S) {
    return <MonteeNiveau p={p} R={S} onAnnuler={() => setMonter(false)}
      onValider={(choix) => { maj((x) => appliquerNiveau(x, S, choix, new Date().toLocaleDateString('fr-FR'))); setMonter(false); }} />;
  }

  return (
    <fieldset disabled={lectureSeule} className="perso-groupe pile">
      <section>
        <h3>Classes {calcul ? <small className="discret">— niveau {calcul.niveau}{calcul.bonusMaitrise ? `, maîtrise +${calcul.bonusMaitrise}` : ''}</small> : null}</h3>
        {classes.map((c, i) => {
          const cl = S?.catalogue.classes.find((x) => x.id === c.id);
          const set = (patch: Partial<typeof c>) => majPr((x) => ({ ...x, classes: classes.map((y, j) => (j === i ? { ...y, ...patch } : y)) }));
          return (
            <div key={i} className="ligne">
              {S ? (
                <select value={c.id} onChange={(e) => set({ id: e.target.value, sousClasse: null })}>
                  {!cl && <option value={c.id}>{c.id || '—'}</option>}
                  {S.catalogue.classes.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
                </select>
              ) : <input value={c.id} placeholder="classe" onChange={(e) => set({ id: e.target.value })} />}
              {cl && c.niveau >= cl.niveauSousClasse && (
                <select value={c.sousClasse ?? ''} onChange={(e) => set({ sousClasse: e.target.value || null })}>
                  <option value="">sous-classe…</option>
                  {cl.sousClasses.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              )}
              <label className="ligne discret">niveau
                <input type="number" min={1} max={20} style={{ width: 60 }} value={c.niveau} onChange={(e) => set({ niveau: Number(e.target.value) })} />
              </label>
              <button type="button" className="btn btn-petit" onClick={() => majPr((x) => ({ ...x, classes: classes.filter((_, j) => j !== i) }))}>✕</button>
            </div>
          );
        })}
        {!classes.length && (
          <button type="button" className="btn btn-petit" onClick={() => majPr((x) => ({ ...x, classes: [{ id: S?.catalogue.classes[0].id ?? '', niveau: 1 }] }))}>+ Classe</button>
        )}
      </section>

      {etat && (
        <section className="pile" style={{ gap: 6 }}>
          <div className="ligne">
            <Champ libelle="Expérience (XP)">
              <input type="number" min={0} value={etat.xp} onChange={(e) => majPr((x) => ({ ...x, xp: Number(e.target.value) }))} />
            </Champ>
            <div className="perso-xp" title={etat.suivant ? `${etat.xp} / ${etat.suivant} XP` : 'Niveau maximum'}>
              <div style={{ width: `${pourcent}%` }} />
              <span>{etat.suivant ? `niveau ${etat.niveau + 1} à ${etat.suivant} XP` : 'niveau 20'}</span>
            </div>
            {classes.length > 0 && etat.niveau < 20 && !lectureSeule && (role === 'mj' || p.sorte === 'pj') && (
              <button type="button" className={`btn ${etat.pret ? 'btn-principal' : ''}`} onClick={() => setMonter(true)}
                title={etat.pret ? 'Assez d’expérience pour le niveau suivant' : 'Montée de niveau par jalons (sans XP)'}>
                {etat.pret ? '⬆ Monter de niveau' : 'Monter de niveau'}
              </button>
            )}
          </div>
          {pr.journalXp?.length ? (
            <details><summary className="discret">Historique d’expérience ({pr.journalXp.length})</summary>
              <ul className="perso-aptitudes">{[...pr.journalXp].reverse().map((j, i) => <li key={i}>{j.quand} : +{j.gain} XP — {j.raison}</li>)}</ul>
            </details>
          ) : null}
        </section>
      )}

      {calcul?.incantation?.length ? (
        <section>
          <h3>Incantation</h3>
          <p className="discret">
            {calcul.incantation.map((i) => `${i.classe} : DD ${i.dd}, attaque ${i.attaque >= 0 ? '+' : ''}${i.attaque} (${i.carac.toUpperCase()})`).join(' · ')}
            {calcul.emplacements?.length ? ` · emplacements : ${calcul.emplacements.map((n, k) => `niv. ${k + 1} ×${n}`).join(', ')}` : ''}
            {calcul.pacte ? ` · pacte : ${calcul.pacte.nombre} de niveau ${calcul.pacte.niveau}` : ''}
          </p>
        </section>
      ) : null}

      {parSource.size > 0 && (
        <section>
          <h3>Aptitudes</h3>
          {[...parSource].map(([source, liste]) => (
            <details key={source} open={parSource.size <= 2}>
              <summary>{source} ({liste.length})</summary>
              <ul className="perso-aptitudes">{liste.map((a) => <li key={a.nom + a.niveau}><span className="discret">niv. {a.niveau}</span> <strong>{a.nom}</strong> — {a.texte}</li>)}</ul>
            </details>
          ))}
        </section>
      )}

      <section>
        <h3>Dons et aptitudes personnelles</h3>
        {aptitudes.map((a, i) => (
          <div key={i} className="pile" style={{ gap: 4 }}>
            <div className="ligne">
              <input value={a.nom} placeholder="Robuste, Vigilant, Maître d’armes…" style={{ flex: 1 }}
                onChange={(e) => majPr((x) => ({ ...x, aptitudes: aptitudes.map((y, j) => (j === i ? { ...y, nom: e.target.value } : y)) }))} />
              <button type="button" className="btn btn-petit" onClick={() => majPr((x) => ({ ...x, aptitudes: aptitudes.filter((_, j) => j !== i) }))}>✕</button>
            </div>
            <textarea rows={2} value={a.texte ?? ''} placeholder="Effet, usages par repos…"
              onChange={(e) => majPr((x) => ({ ...x, aptitudes: aptitudes.map((y, j) => (j === i ? { ...y, texte: e.target.value } : y)) }))} />
          </div>
        ))}
        <button type="button" className="btn btn-petit" onClick={() => majPr((x) => ({ ...x, aptitudes: [...aptitudes, { nom: '' }] }))}>+ Don ou aptitude</button>
      </section>
    </fieldset>
  );
}
