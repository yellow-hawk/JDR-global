// Onglet Identité : état civil, historique, langues, personnalité, description visible des joueurs.
import { Champ } from '../../../interface/composants';
import { aUneFiche } from '../../../noyau/regles';
import { majFiche, type PropsOnglet } from './types';

const CHAMPS: [string, string, string?][] = [
  ['age', 'Âge'], ['genre', 'Genre'], ['taille', 'Taille'], ['poids', 'Poids'], ['yeux', 'Yeux'], ['cheveux', 'Cheveux'],
  ['origine', 'Origine', 'ville, région, peuple…'], ['divinite', 'Divinité'],
];
const PERSONNALITE: [string, string, string][] = [
  ['traits', 'Traits de personnalité', 'franc, curieux, rancunier…'],
  ['ideaux', 'Idéaux', 'ce qui le guide'],
  ['liens', 'Liens', 'personnes, lieux, serments'],
  ['defauts', 'Défauts', 'faiblesses, vices, peurs'],
];

export function Identite({ p, R, lectureSeule, maj }: PropsOnglet) {
  const id = p.fiche?.identite ?? {};
  const perso = p.fiche?.personnalite ?? {};
  const cat = aUneFiche(R) ? R.catalogue : null;
  const ecrire = (cle: string, v: unknown) => majFiche(maj, 'identite', (x) => ({ ...(x ?? {}), [cle]: v }));
  const ecrirePerso = (cle: string, v: string) => majFiche(maj, 'personnalite', (x) => ({ ...(x ?? {}), [cle]: v }));
  const historique = cat?.historiques.find((h) => h.id === id.historique);

  return (
    <fieldset disabled={lectureSeule} className="perso-groupe pile">
      <div className="perso-champs">
        {CHAMPS.map(([cle, libelle, aide]) => (
          <Champ key={cle} libelle={libelle}>
            <input value={(id as Record<string, string | undefined>)[cle] ?? ''} placeholder={aide} onChange={(e) => ecrire(cle, e.target.value)} />
          </Champ>
        ))}
        <Champ libelle="Alignement">
          {cat ? (
            <select value={id.alignement ?? ''} onChange={(e) => ecrire('alignement', e.target.value)}>
              <option value="">—</option>
              {cat.alignements.map((a) => <option key={a}>{a}</option>)}
            </select>
          ) : <input value={id.alignement ?? ''} onChange={(e) => ecrire('alignement', e.target.value)} />}
        </Champ>
        <Champ libelle="Historique">
          {cat ? (
            <select value={id.historique ?? ''} onChange={(e) => ecrire('historique', e.target.value)}>
              <option value="">—</option>
              {cat.historiques.map((h) => <option key={h.id} value={h.id}>{h.nom}</option>)}
            </select>
          ) : <input value={id.historique ?? ''} onChange={(e) => ecrire('historique', e.target.value)} />}
        </Champ>
      </div>
      {historique?.competences?.length ? (
        <p className="discret">
          Compétences de l’historique : {historique.competences.map((c) => cat?.competences.find((x) => x.id === c)?.libelle ?? c).join(', ')}
          {!lectureSeule && (
            <button type="button" className="btn btn-petit" style={{ marginLeft: 8 }}
              onClick={() => majFiche(maj, 'maitrises', (m) => ({ ...(m ?? {}), competences: { ...(m?.competences ?? {}), ...Object.fromEntries(historique.competences!.map((c) => [c, Math.max(1, m?.competences?.[c] ?? 0)])) } }))}>
              Les maîtriser
            </button>
          )}
        </p>
      ) : null}
      <Champ libelle="Langues (séparées par des virgules)">
        <input list="perso-langues" value={(id.langues ?? []).join(', ')}
          onChange={(e) => ecrire('langues', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} />
      </Champ>
      {cat && <datalist id="perso-langues">{cat.langues.map((l) => <option key={l} value={l} />)}</datalist>}
      <div className="perso-champs perso-champs-larges">
        {PERSONNALITE.map(([cle, libelle, aide]) => (
          <Champ key={cle} libelle={libelle}>
            <textarea rows={2} value={(perso as Record<string, string | undefined>)[cle] ?? ''} placeholder={aide} onChange={(e) => ecrirePerso(cle, e.target.value)} />
          </Champ>
        ))}
      </div>
      <Champ libelle="Description (visible des joueurs)">
        <textarea value={p.notes ?? ''} onChange={(e) => maj((x) => ({ ...x, notes: e.target.value }))} />
      </Champ>
    </fieldset>
  );
}
