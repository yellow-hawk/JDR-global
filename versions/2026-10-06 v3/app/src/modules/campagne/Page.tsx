// Page Campagne : accueil (aucune campagne) ou tableau de bord de la campagne ouverte.
import { listeRegles } from '../../noyau/regles';
import { supprimerCampagne } from '../../noyau/stockage';
import { emettre } from '../../noyau/bus';
import { useCampagne } from '../../interface/etat';
import { BlocMj, Champ } from '../../interface/composants';
import { Accueil } from './Accueil';
import { exporterCampagne } from './echanges';
import './campagne.css';

const COMPTES: { cle: 'univers' | 'cartes' | 'personnages' | 'sorts' | 'rencontres' | 'quetes' | 'seances'; libelle: string; page?: string }[] = [
  { cle: 'personnages', libelle: 'Personnages', page: 'personnages' },
  { cle: 'univers', libelle: 'Univers', page: 'monde' },
  { cle: 'cartes', libelle: 'Cartes', page: 'cartes' },
  { cle: 'sorts', libelle: 'Sorts', page: 'magie' },
  { cle: 'rencontres', libelle: 'Rencontres', page: 'combat' },
  { cle: 'quetes', libelle: 'Quêtes', page: 'journal' },
  { cle: 'seances', libelle: 'Séances', page: 'journal' },
];

export function Page() {
  const { campagne, vue, role, lectureSeule, alertes, modifier, fermer } = useCampagne();
  if (!campagne || !vue) return <Accueil />;
  const infos = vue.campagne;
  const notesMj = ((campagne.campagne.mj ?? {}) as { notes?: string }).notes ?? '';

  const supprimer = async () => {
    if (!window.confirm(`Supprimer définitivement « ${campagne.campagne.nom} » et tous ses fichiers ?\n\nPense à exporter une archive avant.`)) return;
    const id = campagne.campagne.id;
    fermer();
    await supprimerCampagne(id);
    emettre('message', { texte: 'Campagne supprimée.' });
  };

  return (
    <div className="pile" style={{ maxWidth: 860 }}>
      <fieldset disabled={lectureSeule} className="camp-entete">
        <Champ libelle="Nom de la campagne">
          <input
            className="camp-titre" value={infos.nom}
            onChange={(e) => modifier((c) => ({ ...c, campagne: { ...c.campagne, nom: e.target.value } }))}
          />
        </Champ>
        <Champ libelle="Système de règles">
          <select
            value={infos.regles}
            onChange={(e) => modifier((c) => ({ ...c, campagne: { ...c.campagne, regles: e.target.value } }))}
          >
            {listeRegles().map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
          </select>
        </Champ>
      </fieldset>

      {alertes.length > 0 && role === 'mj' && (
        <div className="alertes">
          Au chargement, {alertes.length} point(s) ont été corrigés ou signalés :
          <ul>{alertes.slice(0, 12).map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      )}

      <div className="camp-comptes">
        {COMPTES.map((k) => (
          <button
            key={k.cle} className="carte-ui camp-compte" disabled={!k.page}
            onClick={() => k.page && emettre('naviguer', { page: k.page })}
          >
            <strong>{vue[k.cle].length}</strong><span>{k.libelle}</span>
          </button>
        ))}
      </div>

      {role === 'mj' && (
        <BlocMj>
          <Champ libelle="Notes du MJ sur la campagne">
            <textarea
              value={notesMj}
              onChange={(e) => modifier((c) => ({ ...c, campagne: { ...c.campagne, mj: { ...(c.campagne.mj ?? {}), notes: e.target.value } } }))}
            />
          </Champ>
        </BlocMj>
      )}

      <div className="carte-ui pile" style={{ gap: 10 }}>
        <h2>Sauvegardes</h2>
        <p className="discret">
          Tout est enregistré automatiquement dans ce navigateur. Exporte une archive (.zip) pour garder une copie,
          changer d'ordinateur ou de navigateur. L'archive joueurs ne contient aucun secret ni carte MJ.
        </p>
        <div className="ligne">
          <button className="btn btn-principal" onClick={() => void exporterCampagne(campagne, false)} disabled={role !== 'mj'}>
            Exporter l'archive complète
          </button>
          <button className="btn btn-mj" onClick={() => void exporterCampagne(campagne, true)}>
            Exporter l'archive joueurs
          </button>
        </div>
      </div>

      <div className="ligne">
        <button className="btn" onClick={fermer}>Changer de campagne</button>
        <span style={{ flex: 1 }} />
        {role === 'mj' && <button className="btn btn-danger" onClick={() => void supprimer()}>Supprimer la campagne</button>}
      </div>
    </div>
  );
}
