// Panneau d'un membre : identité, dates, liens, et actions (ajouter des proches, étendre, fiche personnage, supprimer).
import type { Campagne, Famille, MembreFamille } from '../../noyau/contrat';
import { emettre } from '../../noyau/bus';
import { regles } from '../../noyau/regles';
import { Champ } from '../../interface/composants';
import { ajouterProche, civilisationDe, etendre, modifierFamille, modifierMembre, promouvoir, supprimerMembre } from './logique';

interface Props { c: Campagne; f: Famille; m: MembreFamille; ro: boolean; modifier: (g: (c: Campagne) => Campagne) => void; choisir: (id: string | null) => void }

export function Membre({ c, f, m, ro, modifier, choisir }: Props) {
  const civ = civilisationDe(c, f.peuple);
  const majF = (g: (x: Famille) => Famille) => modifier((x) => modifierFamille(x, f.id, g));
  const majM = (g: (x: MembreFamille) => MembreFamille) => majF((x) => modifierMembre(x, m.id, g));
  const nomDe = (id: string) => f.membres.find((x) => x.id === id)?.nom ?? '?';
  const enfants = f.membres.filter((x) => x.parents.includes(m.id));
  const fratrie = m.parents.length ? f.membres.filter((x) => x.id !== m.id && x.parents.some((p) => m.parents.includes(p))) : [];
  const ajouter = (lien: 'parent' | 'enfant' | 'conjoint' | 'fratrie') => {
    let nouvel = '';
    majF((x) => { const r = ajouterProche(x, m.id, lien, civ, `${f.id}|${Date.now()}`); nouvel = r.id; return r.famille; });
    window.setTimeout(() => nouvel && choisir(nouvel), 0);
  };
  const Lien = ({ id }: { id: string }) => <button className="gen-lien-nom" onClick={() => choisir(id)}>{nomDe(id)}</button>;
  const num = (v: string) => (v.trim() === '' ? null : Number(v));

  return (
    <aside className="gen-panneau carte-ui">
      <fieldset disabled={ro} className="gen-champs">
        <Champ libelle="Nom"><input value={m.nom} onChange={(e) => majM((x) => ({ ...x, nom: e.target.value }))} /></Champ>
        <div className="gen-ligne">
          <Champ libelle="Sexe"><select value={m.sexe} onChange={(e) => majM((x) => ({ ...x, sexe: e.target.value as MembreFamille['sexe'] }))}>
            <option value="f">Femme</option><option value="m">Homme</option><option value="?">?</option></select></Champ>
          <Champ libelle="Naissance"><input type="number" value={m.naissance ?? ''} onChange={(e) => majM((x) => ({ ...x, naissance: num(e.target.value) }))} /></Champ>
          <Champ libelle="Mort"><input type="number" value={m.mort ?? ''} onChange={(e) => majM((x) => ({ ...x, mort: num(e.target.value) }))} /></Champ>
        </div>
        <div className="gen-ligne">
          <Champ libelle="Titre"><input value={m.titre ?? ''} onChange={(e) => majM((x) => ({ ...x, titre: e.target.value }))} /></Champ>
          <Champ libelle="Rôle"><input value={m.role ?? ''} onChange={(e) => majM((x) => ({ ...x, role: e.target.value }))} /></Champ>
        </div>
        <Champ libelle="Notes"><textarea rows={2} value={m.notes ?? ''} onChange={(e) => majM((x) => ({ ...x, notes: e.target.value }))} /></Champ>
        <Champ libelle="Secrets (MJ)"><textarea rows={2} value={(m.mj as { notes?: string } | undefined)?.notes ?? ''} onChange={(e) => majM((x) => ({ ...x, mj: { ...(x.mj ?? {}), notes: e.target.value } }))} /></Champ>
      </fieldset>
      <div className="gen-liens">
        {m.parents.length > 0 && <p>Parents : {m.parents.map((id) => <Lien key={id} id={id} />)}</p>}
        {m.conjoints.length > 0 && <p>Conjoint(s) : {m.conjoints.map((id) => <Lien key={id} id={id} />)}</p>}
        {fratrie.length > 0 && <p>Frères et sœurs : {fratrie.map((x) => <Lien key={x.id} id={x.id} />)}</p>}
        {enfants.length > 0 && <p>Enfants : {enfants.map((x) => <Lien key={x.id} id={x.id} />)}</p>}
      </div>
      {!ro && (
        <>
          <div className="gen-boutons">
            <button className="btn btn-petit" disabled={m.parents.length >= 2} onClick={() => ajouter('parent')}>+ Parent</button>
            <button className="btn btn-petit" onClick={() => ajouter('conjoint')}>+ Conjoint</button>
            <button className="btn btn-petit" onClick={() => ajouter('enfant')}>+ Enfant</button>
            <button className="btn btn-petit" onClick={() => ajouter('fratrie')}>+ Frère / sœur</button>
            <button className="btn btn-petit" title="Ajoute ce qui manque : parents, conjoint, enfants" onClick={() => majF((x) => etendre(x, m.id, civ, `${f.id}|${m.id}|${x.membres.length}`))}>Étendre</button>
          </div>
          <div className="gen-boutons">
            {m.persoId
              ? <button className="btn btn-petit btn-principal" onClick={() => emettre('naviguer', { page: 'personnages', cible: m.persoId! })}>Ouvrir la fiche</button>
              : <button className="btn btn-petit btn-principal" onClick={() => {
                let id = '';
                modifier((x) => { const r = promouvoir(x, f.id, m.id, regles(x.campagne.regles)); id = r.persoId; return r.campagne; });
                window.setTimeout(() => emettre('message', { texte: `${m.nom} a maintenant une fiche de personnage.`, sorte: 'succes' }), 0);
                void id;
              }}>Créer la fiche personnage</button>}
            {!m.persoId && (
              <select value="" onChange={(e) => e.target.value && majM((x) => ({ ...x, persoId: e.target.value, nom: c.personnages.find((p) => p.id === e.target.value)?.nom ?? x.nom }))}>
                <option value="">Lier à un personnage…</option>
                {c.personnages.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            )}
            {f.racine !== m.id && <button className="btn btn-petit" onClick={() => majF((x) => ({ ...x, racine: m.id }))}>Centrer l’arbre ici</button>}
            <button className="btn btn-petit btn-danger" onClick={() => { if (window.confirm(`Retirer ${m.nom} de l’arbre ?`)) { majF((x) => supprimerMembre(x, m.id)); choisir(null); } }}>Retirer</button>
          </div>
        </>
      )}
    </aside>
  );
}
