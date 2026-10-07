// Page Cartes : galerie, import (images ou PDF), ouverture d'une carte.
import { useState } from 'react';
import type { Carte } from '../../noyau/contrat';
import { emettre, prendreCible } from '../../noyau/bus';
import { choisirFichier, supprimerFichier } from '../../noyau/stockage';
import { useCampagne } from '../../interface/etat';
import { useUrlFichier } from '../../interface/composants';
import { Detail } from './Detail';
import { ACCEPTE } from './import';
import { enregistrerImageCarte } from './enregistrer';
import { TYPES_CARTE, ajouterCarte, libelleType, supprimerCarte } from './logique';
import './cartes.css';

function Tuile({ k, idC, onClick }: { k: Carte; idC: string; onClick(): void }) {
  const url = useUrlFichier(idC, k.images.joueurs);
  return (
    <button className="carte-ui cartes-tuile" onClick={onClick}>
      <div className="cartes-apercu">{url ? <img src={url} alt="" loading="lazy" /> : null}</div>
      <strong>{k.nom}</strong>
      <span className="discret">
        {libelleType(k.type)}{k.images.mj ? ' · version MJ' : ''}{k.reperes.length ? ` · ${k.reperes.length} repère(s)` : ''}
        {(k.mj as { cache?: boolean } | undefined)?.cache ? ' · cachée' : ''}
      </span>
    </button>
  );
}

export function Page() {
  const { vue, lectureSeule, modifier } = useCampagne();
  const [ouverte, setOuverte] = useState<string | null>(() => prendreCible('cartes') ?? null);
  const [filtre, setFiltre] = useState('');
  const [ouverts, setOuverts] = useState<Set<string>>(new Set());
  const [enCours, setEnCours] = useState(false);
  const c = vue!;
  const idC = c.campagne.id;
  const carte = c.cartes.find((k) => k.id === ouverte);

  const importer = async () => {
    const choix = await choisirFichier(ACCEPTE, true);
    if (!choix) return;
    setEnCours(true);
    let dernier = '';
    try {
      for (const f of choix) {
        const { fichier, taille } = await enregistrerImageCarte(idC, f);
        modifier((x) => { const r = ajouterCarte(x, fichier, taille); dernier = r.id; return r.campagne; });
      }
      emettre('message', { texte: `${choix.length} carte(s) importée(s).`, sorte: 'succes' });
      if (choix.length === 1) window.setTimeout(() => setOuverte(dernier), 0);
    } catch (e) {
      emettre('message', { texte: `Import impossible : ${(e as Error).message}`, sorte: 'erreur' });
    } finally { setEnCours(false); }
  };

  const supprimer = () => {
    if (!carte || !window.confirm(`Supprimer la carte « ${carte.nom} » et ses images ?`)) return;
    let liberes: string[] = [];
    modifier((x) => { const r = supprimerCarte(x, carte.id); liberes = r.liberes; return r.campagne; });
    window.setTimeout(() => liberes.forEach((id) => void supprimerFichier(idC, id)), 0);
    setOuverte(null);
  };

  if (carte) return <Detail key={carte.id} carte={carte} onOuvrir={setOuverte} onSupprimer={supprimer} />;

  const liste = c.cartes.filter((k) => !filtre || k.type === filtre);
  return (
    <div className="pile">
      <div className="ligne">
        <h1 style={{ margin: 0, flex: 1 }}>Cartes</h1>
        <select value={filtre} onChange={(e) => setFiltre(e.target.value)} aria-label="Filtrer par type">
          <option value="">Tous les types</option>
          {TYPES_CARTE.map((t) => <option key={t.id} value={t.id}>{t.libelle}</option>)}
        </select>
        {!lectureSeule && <button className="btn btn-principal" onClick={importer} disabled={enCours}>{enCours ? 'Import…' : 'Importer des cartes…'}</button>}
      </div>
      <p className="discret">
        Images PNG, JPG, WebP ou PDF (la première page est convertie). L'image importée est la version joueurs ;
        ajoute ensuite une version MJ depuis la fiche de la carte.
      </p>
      {liste.length === 0 && <div className="vide">Aucune carte{filtre ? ' de ce type' : ''}.</div>}
      {/* Classement par catégorie ; les grandes catégories sont repliées (leurs vignettes ne se chargent qu'à l'ouverture). */}
      {[...TYPES_CARTE, ...[...new Set(liste.map((k) => k.type))].filter((t) => !TYPES_CARTE.some((x) => x.id === t)).map((id) => ({ id, libelle: id }))].map((t) => {
        const groupe = liste.filter((k) => k.type === t.id).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
        if (!groupe.length) return null;
        return (
          <details key={t.id} className="cartes-groupe" open={!!filtre || groupe.length <= 12 || ouverts.has(t.id)}
            onToggle={(e) => { const o = (e.currentTarget as HTMLDetailsElement).open; setOuverts((s) => { const n = new Set(s); if (o) n.add(t.id); else n.delete(t.id); return n; }); }}>
            <summary>{t.libelle} <span className="discret">({groupe.length})</span></summary>
            {(!!filtre || groupe.length <= 12 || ouverts.has(t.id)) && (
              <div className="grille-cartes">
                {groupe.map((k) => <Tuile key={k.id} k={k} idC={idC} onClick={() => setOuverte(k.id)} />)}
              </div>
            )}
          </details>
        );
      })}
    </div>
  );
}
