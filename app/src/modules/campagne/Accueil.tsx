// Sans campagne ouverte : liste des campagnes, création, import.
import { useEffect, useState } from 'react';
import type { ResumeCampagne } from '../../noyau/stockage';
import { listerCampagnes } from '../../noyau/stockage';
import { useCampagne } from '../../interface/etat';
import { importerCampagne } from './echanges';

export function Accueil() {
  const { ouvrir, creer, installer } = useCampagne();
  const [liste, setListe] = useState<ResumeCampagne[] | null>(null);
  const [nom, setNom] = useState('');

  useEffect(() => { void listerCampagnes().then(setListe); }, []);

  const importer = async () => {
    const r = await importerCampagne();
    if (r) await installer(r.campagne, r.fichiers, r.alertes);
  };

  return (
    <div className="pile" style={{ maxWidth: 760 }}>
      <h1>Tes campagnes</h1>
      <form
        className="carte-ui ligne"
        onSubmit={(e) => { e.preventDefault(); if (nom.trim()) void creer(nom.trim()); }}
      >
        <input
          className="camp-nom" placeholder="Nom de la nouvelle campagne" value={nom}
          onChange={(e) => setNom(e.target.value)} aria-label="Nom de la nouvelle campagne"
        />
        <button className="btn btn-principal" disabled={!nom.trim()}>Créer</button>
        <button type="button" className="btn" onClick={importer}>Importer une archive…</button>
      </form>

      {liste === null && <p className="discret">Chargement…</p>}
      {liste?.length === 0 && <div className="vide">Aucune campagne. Crée la première ci-dessus.</div>}
      <div className="grille-cartes">
        {liste?.map((c) => (
          <button key={c.id} className="carte-ui camp-tuile" onClick={() => void ouvrir(c.id)}>
            <h2>{c.nom}</h2>
            <span className="discret">Modifiée le {new Date(c.majLe).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
