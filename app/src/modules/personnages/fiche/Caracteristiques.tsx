// Onglet Caractéristiques : les six caractéristiques (saisies), sauvegardes et compétences (maîtrise / expertise),
// valeurs dérivées calculées par le système de règles.
import type { FicheCalculee, SystemeAvecFiche } from '../../../noyau/regles';
import { ecrireStat } from '../../../noyau/regles';
import { majFiche, type PropsOnglet } from './types';

const PASTILLES = ['○', '●', '◉'];
const TITRES = ['non maîtrisé', 'maîtrise', 'expertise'];

export function Caracteristiques({ p, R, lectureSeule, maj, calcul }: PropsOnglet & { R: SystemeAvecFiche; calcul: FicheCalculee }) {
  const competences = p.fiche?.maitrises?.competences ?? {};
  const sauvegardes = p.fiche?.maitrises?.sauvegardes ?? [];
  const cycler = (id: string) => majFiche(maj, 'maitrises', (m) => ({
    ...(m ?? {}), competences: { ...(m?.competences ?? {}), [id]: ((m?.competences?.[id] ?? 0) + 1) % 3 },
  }));
  const basculerSauvegarde = (id: string) => majFiche(maj, 'maitrises', (m) => {
    const l = m?.sauvegardes ?? [];
    return { ...(m ?? {}), sauvegardes: l.includes(id) ? l.filter((x) => x !== id) : [...l, id] };
  });
  const mod = (v: number) => Math.floor((v - 10) / 2);
  const signe = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

  return (
    <div className="pile">
      <div className="perso-caracs">
        {R.catalogue.caracs.map((c) => {
          const brut = (p.combat.stats.carac as Record<string, number> | undefined)?.[c.id] ?? 10;
          const calc = calcul.caracs.find((x) => x.carac === c.id)!;
          return (
            <label key={c.id} className="perso-carac" title={c.libelle}>
              <span>{c.libelle.slice(0, 3).toUpperCase()}</span>
              <strong>{signe(mod(calc.valeur))}</strong>
              <input type="number" min={1} max={30} value={brut} disabled={lectureSeule}
                onChange={(e) => maj((x) => ({ ...x, combat: { ...x.combat, stats: ecrireStat(x.combat.stats, `carac.${c.id}`, Number(e.target.value)) } }))} />
              {calc.valeur !== brut && <small>{calc.valeur} avec effets</small>}
            </label>
          );
        })}
      </div>

      <div className="perso-derives">
        {calcul.derives.map((d) => (
          <div key={d.cle} className="perso-derive" title={d.detail}>
            <span>{d.libelle}</span><strong>{d.texte}</strong>{d.detail && <small>{d.detail}</small>}
          </div>
        ))}
      </div>

      <div className="perso-colonnes">
        <section>
          <h3>Jets de sauvegarde</h3>
          {calcul.sauvegardes.map((s) => (
            <button key={s.cle} type="button" className="perso-comp" disabled={lectureSeule} onClick={() => basculerSauvegarde(s.carac!)}
              title={sauvegardes.includes(s.carac!) ? 'maîtrise' : 'non maîtrisé'}>
              <i>{PASTILLES[s.maitrise ?? 0]}</i><span>{s.libelle}</span><strong>{s.texte}</strong>
            </button>
          ))}
        </section>
        <section>
          <h3>Compétences</h3>
          {calcul.competences.map((c) => {
            const id = c.cle.replace('competence.', '');
            return (
              <button key={c.cle} type="button" className="perso-comp" disabled={lectureSeule} onClick={() => cycler(id)}
                title={`${TITRES[competences[id] ?? 0]} — cliquer pour changer`}>
                <i>{PASTILLES[c.maitrise ?? 0]}</i><span>{c.libelle} <small>({c.carac?.toUpperCase()})</small></span><strong>{c.texte}</strong>
              </button>
            );
          })}
        </section>
      </div>
      <p className="discret">○ non maîtrisé · ● maîtrise (+{calcul.bonusMaitrise}) · ◉ expertise (×2). Cliquer pour changer.</p>
    </div>
  );
}
