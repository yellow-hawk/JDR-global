// Création d'une relation depuis le Réseau : « Lier à… » puis clic sur un autre personnage, sorte, secret.
import { useState } from 'react';
import { RELATIONS } from '../personnages';

interface Props { de: string; vers: string; nom(id: string): string; mj: boolean; valider(sorte: string, texte: string, secret: boolean): void; annuler(): void }

export function PanneauRelation({ de, vers, nom, mj, valider, annuler }: Props) {
  const [sorte, setSorte] = useState(RELATIONS[0].id);
  const [texte, setTexte] = useState('');
  const [secret, setSecret] = useState(false);
  return (
    <div className="reseau-lien-form pile">
      <strong>{nom(de)}</strong>
      <select value={sorte} onChange={(e) => setSorte(e.target.value)}>{RELATIONS.map((r) => <option key={r.id} value={r.id}>{r.libelle}</option>)}</select>
      <strong>{nom(vers)}</strong>
      <input placeholder="Précision (facultatif)" value={texte} onChange={(e) => setTexte(e.target.value)} />
      {mj && <label className="ligne discret"><input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} /> Relation secrète (MJ)</label>}
      <div className="ligne">
        <button className="btn btn-petit btn-principal" onClick={() => valider(sorte, texte.trim(), secret)}>Créer la relation</button>
        <button className="btn btn-petit" onClick={annuler}>Annuler</button>
      </div>
    </div>
  );
}
