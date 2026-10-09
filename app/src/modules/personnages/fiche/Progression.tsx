// Onglet Progression : classes et niveaux, expérience, aptitudes et dons.
// (Assistant de montée de niveau et arbres de talents : étapes suivantes.)
import { Champ } from '../../../interface/composants';
import type { FicheCalculee } from '../../../noyau/regles';
import { majFiche, type PropsOnglet } from './types';

export function Progression({ p, lectureSeule, maj, calcul }: PropsOnglet & { calcul: FicheCalculee | null }) {
  const pr = p.fiche?.progression ?? {};
  const classes = pr.classes ?? [];
  const aptitudes = pr.aptitudes ?? [];
  const majPr = (f: (x: typeof pr) => typeof pr) => majFiche(maj, 'progression', (x) => f(x ?? {}));

  return (
    <fieldset disabled={lectureSeule} className="perso-groupe pile">
      <section>
        <h3>Classes {calcul ? <small className="discret">— niveau {calcul.niveau}{calcul.bonusMaitrise ? `, maîtrise +${calcul.bonusMaitrise}` : ''}</small> : null}</h3>
        {classes.map((c, i) => (
          <div key={i} className="ligne">
            <input value={c.id} placeholder="classe (guerrier, magicien…)" onChange={(e) => majPr((x) => ({ ...x, classes: classes.map((y, j) => (j === i ? { ...y, id: e.target.value } : y)) }))} />
            <input value={c.sousClasse ?? ''} placeholder="sous-classe" onChange={(e) => majPr((x) => ({ ...x, classes: classes.map((y, j) => (j === i ? { ...y, sousClasse: e.target.value } : y)) }))} />
            <label className="ligne discret">niveau
              <input type="number" min={1} max={20} style={{ width: 60 }} value={c.niveau} onChange={(e) => majPr((x) => ({ ...x, classes: classes.map((y, j) => (j === i ? { ...y, niveau: Number(e.target.value) } : y)) }))} />
            </label>
            <button type="button" className="btn btn-petit" onClick={() => majPr((x) => ({ ...x, classes: classes.filter((_, j) => j !== i) }))}>✕</button>
          </div>
        ))}
        <button type="button" className="btn btn-petit" onClick={() => majPr((x) => ({ ...x, classes: [...classes, { id: '', niveau: 1 }] }))}>
          {classes.length ? '+ Multiclasse' : '+ Classe'}
        </button>
      </section>
      <div className="champs">
        <Champ libelle="Expérience (XP)">
          <input type="number" min={0} value={pr.xp ?? 0} onChange={(e) => majPr((x) => ({ ...x, xp: Number(e.target.value) }))} />
        </Champ>
      </div>
      <section>
        <h3>Aptitudes et dons</h3>
        {aptitudes.map((a, i) => (
          <div key={i} className="pile" style={{ gap: 4 }}>
            <div className="ligne">
              <input value={a.nom} placeholder="Second souffle, Attaque supplémentaire…" style={{ flex: 1 }}
                onChange={(e) => majPr((x) => ({ ...x, aptitudes: aptitudes.map((y, j) => (j === i ? { ...y, nom: e.target.value } : y)) }))} />
              <button type="button" className="btn btn-petit" onClick={() => majPr((x) => ({ ...x, aptitudes: aptitudes.filter((_, j) => j !== i) }))}>✕</button>
            </div>
            <textarea rows={2} value={a.texte ?? ''} placeholder="Effet, usages par repos…"
              onChange={(e) => majPr((x) => ({ ...x, aptitudes: aptitudes.map((y, j) => (j === i ? { ...y, texte: e.target.value } : y)) }))} />
          </div>
        ))}
        <button type="button" className="btn btn-petit" onClick={() => majPr((x) => ({ ...x, aptitudes: [...aptitudes, { nom: '' }] }))}>+ Aptitude ou don</button>
      </section>
    </fieldset>
  );
}
