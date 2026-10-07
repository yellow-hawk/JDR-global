// Relations d'un personnage sur sa fiche : liste (dans les deux sens), ajout, suppression ; secrètes pour le MJ.
import { useState } from 'react';
import { emettre } from '../../noyau/bus';
import { useCampagne } from '../../interface/etat';
import { RELATIONS, ajouterRelation, relationsDe, retirerRelation } from './relations';

export function Relations({ persoId }: { persoId: string }) {
  const { vue, role, lectureSeule, modifier } = useCampagne();
  const c = vue!;
  const [vers, setVers] = useState('');
  const [sorte, setSorte] = useState(RELATIONS[0].id);
  const [secret, setSecret] = useState(false);
  const liste = relationsDe(c, persoId);
  const nom = (id: string) => c.personnages.find((p) => p.id === id)?.nom ?? '?';
  return (
    <div className="perso-relations">
      <h3>Relations</h3>
      {liste.length === 0 && <p className="discret">Aucune relation. Elles apparaissent aussi dans le Réseau.</p>}
      {liste.map((r, i) => (
        <div key={i} className="ligne perso-relation">
          <i style={{ background: r.sorte.couleur }} />
          <span>{r.libelle} <button className="perso-lien" onClick={() => emettre('naviguer', { page: 'personnages', cible: r.autre })}>{nom(r.autre)}</button>
            {r.secret && <span className="discret"> (secret)</span>}{r.texte && <span className="discret"> · {r.texte}</span>}</span>
          <span style={{ flex: 1 }} />
          {!lectureSeule && <button className="btn btn-petit" title="Retirer" onClick={() => modifier((x) => retirerRelation(x, r.de, r.index))}>×</button>}
        </div>
      ))}
      {!lectureSeule && (
        <div className="ligne" style={{ flexWrap: 'wrap', gap: 6 }}>
          <select value={sorte} onChange={(e) => setSorte(e.target.value)}>{RELATIONS.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}</select>
          <select value={vers} onChange={(e) => setVers(e.target.value)}>
            <option value="">Personnage…</option>
            {c.personnages.filter((p) => p.id !== persoId).map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
          {role === 'mj' && <label className="ligne discret"><input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} /> secrète</label>}
          <button className="btn btn-petit btn-principal" disabled={!vers} onClick={() => { modifier((x) => ajouterRelation(x, persoId, vers, sorte, '', secret)); setVers(''); }}>Ajouter</button>
        </div>
      )}
    </div>
  );
}
