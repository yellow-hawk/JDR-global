// Page Documents : lettres, affiches, indices et images à montrer aux joueurs.
// Un document reste caché jusqu'au clic sur « Montrer aux joueurs » ; ensuite il figure dans l'aperçu et l'archive joueurs.
import { useState } from 'react';
import type { DocumentJoueurs, Ref } from '../../noyau/contrat';
import { emettre, montrerAuxJoueurs, prendreCible } from '../../noyau/bus';
import { ajouterFichier, choisirFichier, lireFichier, supprimerFichier } from '../../noyau/stockage';
import { useCampagne } from '../../interface/etat';
import { Champ, useUrlFichier } from '../../interface/composants';
import {
  STYLES, cacherDocument, estMontre, modifierDocument, montrerDocument, nouveauDocument, sceneDocument, supprimerDocument, trierDocuments,
} from './logique';
import './documents.css';

export function Page() {
  const { vue, role, lectureSeule, modifier } = useCampagne();
  const c = vue!;
  const docs = trierDocuments(c.documents ?? []);
  const [courant, setCourant] = useState<string | null>(() => prendreCible('documents') ?? docs[0]?.id ?? null);
  const d = docs.find((x) => x.id === courant) ?? docs[0];

  const creer = (sorte: DocumentJoueurs['sorte']) => {
    let id = '';
    modifier((x) => { const r = nouveauDocument(x, sorte, sorte === 'image' ? 'Image' : 'Nouveau document'); id = r.id; return r.campagne; });
    window.setTimeout(() => setCourant(id), 0);
  };

  return (
    <div className="doc-page">
      <aside className="doc-cote">
        <h1 style={{ margin: 0 }}>Documents</h1>
        <p className="discret">Lettres, affiches, indices, images : prépare-les, puis montre-les sur l’écran joueurs au bon moment.</p>
        {!lectureSeule && (
          <div className="ligne">
            <button className="btn btn-petit btn-principal" onClick={() => creer('texte')}>+ Texte</button>
            <button className="btn btn-petit" onClick={() => creer('image')}>+ Image</button>
          </div>
        )}
        {docs.length === 0 && <p className="discret">Aucun document.</p>}
        {docs.map((x, i) => (
          <div key={x.id}>
            {(i === 0 || estMontre(x) !== estMontre(docs[i - 1])) && <h3>{estMontre(x) ? 'Déjà montrés' : 'À montrer'}</h3>}
            <button className="doc-ligne" aria-current={d?.id === x.id ? 'true' : undefined} onClick={() => setCourant(x.id)}>
              <span>{x.sorte === 'image' ? '🖼' : '✉'}</span> {x.titre}
            </button>
          </div>
        ))}
      </aside>
      <section className="doc-centre">
        {d ? <Fiche key={d.id} d={d} mj={role === 'mj'} ro={lectureSeule} /> : <div className="vide">Crée un document pour commencer.</div>}
      </section>
    </div>
  );
}

function Fiche({ d, mj, ro }: { d: DocumentJoueurs; mj: boolean; ro: boolean }) {
  const { campagne, vue, modifier } = useCampagne();
  const c = vue!;
  const idC = c.campagne.id;
  const url = useUrlFichier(idC, d.image);
  const maj = (f: (x: DocumentJoueurs) => DocumentJoueurs) => modifier((x) => modifierDocument(x, d.id, f));
  const montre = estMontre(d);

  const image = async () => {
    const choix = await choisirFichier('image/png,image/jpeg,image/webp,image/gif');
    if (!choix) return;
    const f = await ajouterFichier(idC, choix[0], choix[0].name);
    const ancien = d.image;
    modifier((x) => ({ ...modifierDocument(x, d.id, (e) => ({ ...e, image: f.id })), fichiers: [...x.fichiers.filter((k) => k.id !== ancien), f] }));
    if (ancien) void supprimerFichier(idC, ancien);
  };
  const retirerImage = () => {
    const ancien = d.image;
    modifier((x) => ({ ...modifierDocument(x, d.id, (e) => ({ ...e, image: null })), fichiers: x.fichiers.filter((k) => k.id !== ancien) }));
    if (ancien) void supprimerFichier(idC, ancien);
  };
  const montrer = async () => {
    const b = d.image ? (await lireFichier(idC, d.image)) ?? null : null;
    montrerAuxJoueurs(sceneDocument(d, b));
    modifier((x) => montrerDocument(x, d.id, new Date().toISOString()));
    emettre('message', { texte: `« ${d.titre} » est sur l’écran joueurs.`, sorte: 'succes' });
  };
  const supprimer = () => {
    if (!window.confirm(`Supprimer « ${d.titre} » ?`)) return;
    let libere: string | null = null;
    modifier((x) => { const r = supprimerDocument(x, d.id); libere = r.libere; return r.campagne; });
    window.setTimeout(() => { if (libere) void supprimerFichier(idC, libere); }, 0);
  };
  const lien = d.lien ? `${d.lien.type}:${d.lien.id}` : '';
  const choixLien = (v: string) => { const [type, id] = v.split(':'); maj((x) => ({ ...x, lien: v ? ({ type, id } as Ref) : null })); };

  return (
    <div className="doc-fiche">
      {!ro && (
        <div className="ligne">
          <button className="btn btn-mj" onClick={() => void montrer()}>Montrer aux joueurs</button>
          {montre && mj && <button className="btn btn-petit" onClick={() => modifier((x) => cacherDocument(x, d.id))}>Cacher à nouveau</button>}
          <span className="discret" style={{ flex: 1 }}>{montre ? `Montré le ${new Date(d.montreLe ?? '').toLocaleDateString('fr-FR')}` : 'Pas encore montré : invisible pour les joueurs.'}</span>
          <button className="btn btn-petit btn-danger" onClick={supprimer}>Supprimer</button>
        </div>
      )}
      <div className="doc-corps">
        <fieldset disabled={ro} className="pile doc-champs">
          <Champ libelle="Titre"><input value={d.titre} onChange={(e) => maj((x) => ({ ...x, titre: e.target.value }))} /></Champ>
          <Champ libelle="Habillage">
            <select value={d.style ?? 'parchemin'} onChange={(e) => maj((x) => ({ ...x, style: e.target.value }))}>
              {STYLES.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
            </select>
          </Champ>
          <Champ libelle={d.sorte === 'image' ? 'Légende (facultatif)' : 'Texte'}>
            <textarea rows={d.sorte === 'image' ? 3 : 10} value={d.texte ?? ''} onChange={(e) => maj((x) => ({ ...x, texte: e.target.value }))} />
          </Champ>
          <div className="ligne">
            <button type="button" className="btn btn-petit" onClick={() => void image()}>{d.image ? 'Changer l’image…' : 'Ajouter une image…'}</button>
            {d.image && <button type="button" className="btn btn-petit" onClick={retirerImage}>Retirer l’image</button>}
          </div>
          {mj && (
            <Champ libelle="Lié à (pour la préparation de séance)">
              <select value={lien} onChange={(e) => choixLien(e.target.value)}>
                <option value="">Rien</option>
                <optgroup label="Quêtes">{(campagne?.quetes ?? []).map((q) => <option key={q.id} value={`quete:${q.id}`}>{q.titre}</option>)}</optgroup>
                <optgroup label="Personnages">{(campagne?.personnages ?? []).map((p) => <option key={p.id} value={`personnage:${p.id}`}>{p.nom}</option>)}</optgroup>
              </select>
            </Champ>
          )}
        </fieldset>
        <div className={`doc-apercu ecran-doc-${d.style ?? 'parchemin'}`} aria-label="Aperçu">
          <div className="ecran-doc-feuille">
            <div className="ecran-doc-titre">{d.titre}</div>
            {url && <img src={url} alt="" />}
            {d.texte && <div className="ecran-doc-texte">{d.texte}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
