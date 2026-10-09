// Page Personnages : liste à gauche, fiche à droite.
import { useEffect, useState } from 'react';
import type { Personnage } from '../../noyau/contrat';
import { regles } from '../../noyau/regles';
import { emettre, montrerAuxJoueurs, prendreCible } from '../../noyau/bus';
import { ajouterFichier, choisirFichier, lireFichier, supprimerFichier } from '../../noyau/stockage';
import { useCampagne } from '../../interface/etat';
import { useUrlFichier } from '../../interface/composants';
import { FabriqueDePortraits, ouvrirAvatarPour, type ResultatPortrait, type TachePortrait } from '../avatar';
import { Fiche } from './Fiche';
import { Creation } from './creation/Creation';
import { Recompense } from './progression/Recompense';
import { EditeurTalents, arbresDeCampagne } from './talents/EditeurTalents';
import { enregistrerArbresDeCampagne } from '../../noyau/talents';
import { aUneFiche } from '../../noyau/regles';
import { ajouter, grouper, modifierPerso, sceneJoueurs, supprimer } from './logique';
import './personnages.css';

function Vignette({ p, idCampagne, actif, onClick }: { p: Personnage; idCampagne: string; actif: boolean; onClick(): void }) {
  const url = useUrlFichier(idCampagne, p.portrait);
  return (
    <button className="perso-ligne" aria-current={actif ? 'true' : undefined} onClick={onClick}>
      <span className="perso-mini">{url ? <img src={url} alt="" /> : p.nom.slice(0, 1).toUpperCase()}</span>
      <span>{p.nom}</span>
      {(p.mj as { cache?: boolean } | undefined)?.cache && <span className="perso-cache">caché</span>}
    </button>
  );
}

export function Page() {
  const { campagne, vue, role, lectureSeule, modifier } = useCampagne();
  const [selection, setSelection] = useState<string | null>(() => prendreCible('personnages') ?? null);
  const [creation, setCreation] = useState<Personnage['sorte'] | null>(null);
  const [recompense, setRecompense] = useState(false);
  const [editeur, setEditeur] = useState(false);
  const [photo, setPhoto] = useState<TachePortrait[] | null>(null);
  const c = vue!;
  const idCampagne = c.campagne.id;
  const R = regles(c.campagne.regles);
  const perso = c.personnages.find((p) => p.id === selection) ?? null;
  const urlPortrait = useUrlFichier(idCampagne, perso?.portrait);

  // Arbres de talents du MJ (campagne) : remplacent ou complètent ceux des règles.
  useEffect(() => { if (campagne) enregistrerArbresDeCampagne(arbresDeCampagne(campagne)); }, [campagne]);

  // Sélection perdue (personnage supprimé ou caché en aperçu joueurs) → rien de sélectionné.
  useEffect(() => { if (selection && !perso) setSelection(null); }, [selection, perso]);

  const nouveau = (sorte: Personnage['sorte']) => {
    let id = '';
    modifier((x) => { const r = ajouter(x, sorte, R); id = r.id; return r.campagne; });
    window.setTimeout(() => setSelection(id), 0);
  };

  const maj = (f: (p: Personnage) => Personnage) => {
    if (!perso) return;
    modifier((x) => modifierPerso(x, perso.id, (p) => ({ ...f(p) })));
  };

  const changerPortrait = async () => {
    if (!perso) return;
    const choix = await choisirFichier('image/png,image/jpeg,image/webp');
    if (!choix) return;
    const f = await ajouterFichier(idCampagne, choix[0], choix[0].name);
    const ancien = perso.portrait;
    modifier((x) => ({
      ...modifierPerso(x, perso.id, (p) => ({ ...p, portrait: f.id })),
      fichiers: [...x.fichiers.filter((y) => y.id !== ancien), f],
    }));
    if (ancien) void supprimerFichier(idCampagne, ancien);
  };

  // Nouveau portrait (jeton) photographié depuis l'avatar 3D actuel : remplace l'ancien.
  const portraitRefait = async ({ id, apparence, vignette }: ResultatPortrait) => {
    if (!vignette) { emettre('message', { texte: 'Portrait impossible : le modèle 3D n’a pas pu se charger.', sorte: 'erreur' }); return; }
    const f = await ajouterFichier(idCampagne, await (await fetch(vignette)).blob(), `${id} - portrait.jpg`);
    const ancien = c.personnages.find((x) => x.id === id)?.portrait;
    modifier((x) => ({
      ...modifierPerso(x, id, (q) => ({ ...q, apparence, portrait: f.id })),
      fichiers: [...x.fichiers.filter((y) => y.id !== ancien), f],
    }));
    if (ancien) void supprimerFichier(idCampagne, ancien);
    emettre('message', { texte: 'Portrait refait.', sorte: 'succes' });
  };

  const montrer = async () => {
    if (!perso || !campagne) return;
    const complet = campagne.personnages.find((p) => p.id === perso.id)!;
    const portrait = complet.portrait ? (await lireFichier(idCampagne, complet.portrait)) ?? null : null;
    montrerAuxJoueurs(sceneJoueurs(complet, R, portrait));
    emettre('message', { texte: `${complet.nom} est affiché sur l'écran joueurs.`, sorte: 'succes' });
  };

  const effacer = () => {
    if (!perso || !window.confirm(`Supprimer « ${perso.nom} » ?`)) return;
    let libere: string | null = null;
    modifier((x) => { const r = supprimer(x, perso.id); libere = r.fichierLibere; return r.campagne; });
    window.setTimeout(() => { if (libere) void supprimerFichier(idCampagne, libere); }, 0);
    setSelection(null);
  };

  const groupes = grouper(c.personnages);
  return (
    <div className="perso-page">
      <aside className="perso-liste">
        <div className="ligne" style={{ justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0 }}>Personnages</h1>
        </div>
        {!lectureSeule && (
          <div className="ligne">
            <button className="btn btn-principal btn-petit" onClick={() => setCreation('pj')}>+ PJ</button>
            <button className="btn btn-petit" onClick={() => setCreation('pnj')}>+ PNJ</button>
            <button className="btn btn-petit" onClick={() => setCreation('ennemi')}>+ Ennemi</button>
            <button className="btn btn-petit" title="Fiche vierge, sans assistant" onClick={() => nouveau('pj')}>Fiche vierge</button>
            {role === 'mj' && aUneFiche(R) && <button className="btn btn-petit" title="Donner de l’expérience aux PJ" onClick={() => { setCreation(null); setEditeur(false); setRecompense(true); }}>★ Récompenser</button>}
            {role === 'mj' && aUneFiche(R) && <button className="btn btn-petit" title="Voir et modifier les arbres de talents" onClick={() => { setCreation(null); setRecompense(false); setEditeur(true); }}>Arbres de talents</button>}
          </div>
        )}
        {groupes.length === 0 && <p className="discret">Aucun personnage pour l'instant.</p>}
        {groupes.map((g) => (
          <div key={g.sorte.id}>
            <h3 className="perso-groupe-titre">{g.sorte.pluriel}</h3>
            {g.persos.map((p) => (
              <Vignette key={p.id} p={p} idCampagne={idCampagne} actif={p.id === selection} onClick={() => setSelection(p.id)} />
            ))}
          </div>
        ))}
      </aside>
      <section className="perso-detail">
        {editeur && !lectureSeule && aUneFiche(R) ? (
          <EditeurTalents c={campagne!} R={R} modifier={modifier} onFermer={() => setEditeur(false)} />
        ) : recompense && !lectureSeule && aUneFiche(R) ? (
          <Recompense c={campagne!} R={R} modifier={modifier} onFermer={() => setRecompense(false)} />
        ) : creation && !lectureSeule ? (
          <Creation key={creation} R={R} sorte={creation} onCree={(id) => window.setTimeout(() => setSelection(id), 0)} onFermer={() => setCreation(null)} />
        ) : perso ? (
          <Fiche
            key={perso.id} perso={perso} R={R} role={role} lectureSeule={lectureSeule}
            urlPortrait={urlPortrait} maj={maj}
            onPortrait={changerPortrait} onMontrer={montrer} onSupprimer={effacer}
            onAvatar={() => { ouvrirAvatarPour(perso.id); emettre('naviguer', { page: 'avatar' }); }}
            onRefairePortrait={photo ? undefined : () => setPhoto([{ id: perso.id, nom: perso.nom, apparence: perso.apparence! }])}
          />
        ) : (
          <div className="vide">Choisis un personnage dans la liste{lectureSeule ? '' : ', ou crées-en un'}.</div>
        )}
        {photo && <FabriqueDePortraits taches={photo} onPortrait={(r) => void portraitRefait(r)} onFini={() => setPhoto(null)} />}
      </section>
    </div>
  );
}
