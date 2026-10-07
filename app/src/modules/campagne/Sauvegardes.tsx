// Section « Sauvegardes » du tableau de bord : archives à télécharger, instantanés automatiques (restaurer),
// dossier de sauvegarde sur l'ordinateur (archive du jour écrite automatiquement).
import { useEffect, useState } from 'react';
import type { Campagne } from '../../noyau/contrat';
import { emettre } from '../../noyau/bus';
import {
  autoriserDossier, choisirDossier, dossierPossible, etatDossier, faireInstantane, listerInstantanes, lireInstantane, nomArchive, oublierDossier, telecharger,
  type Instantane,
} from '../../noyau/stockage';
import { useCampagne } from '../../interface/etat';
import { archiveDe, exporterCampagne, sauverDansDossier } from './echanges';

const date = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const ko = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1e3))} ko`);

export function Sauvegardes({ c }: { c: Campagne }) {
  const { role, restaurer } = useCampagne();
  const [liste, setListe] = useState<Instantane[]>([]);
  const [dossier, setDossier] = useState<{ nom: string; autorise: boolean } | null>(null);
  const [tout, setTout] = useState(false);
  const recharger = () => { void listerInstantanes(c.campagne.id).then(setListe); void etatDossier().then(setDossier); };
  useEffect(recharger, [c.campagne.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const mj = role === 'mj';
  const dire = (texte: string, sorte: 'succes' | 'erreur' = 'succes') => emettre('message', { texte, sorte });

  const restaurerUn = async (i: Instantane) => {
    if (!window.confirm(`Revenir à l'état du ${date(i.quand)} ?\n\nL'état actuel est d'abord gardé dans un instantané « avant restauration ».`)) return;
    const ok = await restaurer(i.id);
    dire(ok ? 'Campagne restaurée.' : 'Instantané introuvable.', ok ? 'succes' : 'erreur');
    recharger();
  };
  const telechargerUn = async (i: Instantane) => {
    const r = await lireInstantane(i.id);
    if (!r) return;
    const { octets } = await archiveDe(r.campagne);
    telecharger(octets, nomArchive(r.campagne).replace('.zip', ` (instantané ${i.quand.slice(11, 16).replace(':', 'h')}).zip`), 'application/zip');
  };

  return (
    <div className="carte-ui pile" style={{ gap: 10 }}>
      <h2>Sauvegardes</h2>
      <p className="discret">
        Tout est enregistré automatiquement dans ce navigateur, avec un instantané à l'ouverture et toutes les 10 minutes de travail
        (les 12 derniers et un par jour sur 30 jours). Pour une copie hors du navigateur, exporte une archive ou choisis un dossier de sauvegarde.
      </p>
      <div className="ligne" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn-principal" onClick={() => void exporterCampagne(c, false)} disabled={!mj}>Exporter l'archive complète</button>
        <button className="btn btn-mj" onClick={() => void exporterCampagne(c, true)}>Exporter l'archive joueurs</button>
        {mj && <button className="btn" onClick={() => void faireInstantane(c, 'manuel').then(() => { dire('Instantané pris.'); recharger(); })}>Prendre un instantané</button>}
      </div>

      {mj && dossierPossible() && (
        <div className="camp-dossier">
          <h3>Dossier de sauvegarde sur l’ordinateur</h3>
          {!dossier && <p className="discret">Choisis un dossier (par exemple « sauvegardes » dans le dossier du projet) : l’archive complète du jour y sera écrite automatiquement toutes les 10 minutes de travail.</p>}
          {dossier && <p className="discret">Dossier « {dossier.nom} » : {dossier.autorise ? 'autorisé, archive du jour mise à jour automatiquement.' : 'à réautoriser (le navigateur le demande après un redémarrage).'}</p>}
          <div className="ligne" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-petit" onClick={() => void choisirDossier().then((n) => { if (n) dire(`Dossier « ${n} » retenu.`); recharger(); })}>{dossier ? 'Changer de dossier…' : 'Choisir un dossier…'}</button>
            {dossier && !dossier.autorise && <button className="btn btn-petit btn-mj" onClick={() => void autoriserDossier().then(recharger)}>Réautoriser</button>}
            {dossier?.autorise && <button className="btn btn-petit" onClick={() => void sauverDansDossier(c).then((ok) => dire(ok ? `Archive écrite dans « ${dossier.nom} ».` : 'Écriture impossible.', ok ? 'succes' : 'erreur'))}>Sauvegarder maintenant</button>}
            {dossier && <button className="btn btn-petit" onClick={() => void oublierDossier().then(recharger)}>Oublier ce dossier</button>}
          </div>
        </div>
      )}

      {mj && liste.length > 0 && (
        <div>
          <h3>Instantanés</h3>
          <table className="camp-instantanes">
            <tbody>
              {(tout ? liste : liste.slice(0, 6)).map((i) => (
                <tr key={i.id}>
                  <td>{date(i.quand)}</td><td className="discret">{i.raison}</td><td className="discret">{ko(i.taille)}</td>
                  <td><button className="btn btn-petit" onClick={() => void restaurerUn(i)}>Restaurer</button> <button className="btn btn-petit" onClick={() => void telechargerUn(i)}>Télécharger</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {liste.length > 6 && <button className="btn btn-petit" onClick={() => setTout(!tout)}>{tout ? 'Moins' : `Voir les ${liste.length}`}</button>}
        </div>
      )}
    </div>
  );
}
