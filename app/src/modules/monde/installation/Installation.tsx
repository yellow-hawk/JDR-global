// Fenêtre d'installation d'un monde de l'Atlas : étapes, progression, portraits des PNJ, bilan.
import { useEffect, useRef, useState } from 'react';
import type { Campagne } from '../../../noyau/contrat';
import { ajouterFichier } from '../../../noyau/stockage';
import { FabriqueDePortraits, type ResultatPortrait, type TachePortrait } from '../../avatar';
import { ETAPES, installerMonde, type Etape, type Progression } from './executer';

interface Props {
  cadre: HTMLIFrameElement;
  campagne: Campagne;
  modifier: (f: (c: Campagne) => Campagne) => void;
  onFermer: (univ: string | null) => void;
}

const dataUrlVersBlob = async (u: string): Promise<Blob> => (await fetch(u)).blob();

export function Installation({ cadre, campagne, modifier, onFermer }: Props) {
  const derniere = useRef(campagne); derniere.current = campagne;
  const [prog, setProg] = useState<Progression | null>(null);
  const [faites, setFaites] = useState<Set<Etape>>(new Set());
  const [erreur, setErreur] = useState<string | null>(null);
  const [taches, setTaches] = useState<TachePortrait[] | null>(null);
  const [fini, setFini] = useState(false);
  const [univ, setUniv] = useState<string | null>(null);
  const annule = useRef(false);
  const lance = useRef(false);

  useEffect(() => {
    if (lance.current) return;
    lance.current = true;
    void (async () => {
      try {
        const r = await installerMonde({
          cadre, lire: () => derniere.current, modifier, annule: () => annule.current,
          progres: (p) => {
            setProg(p);
            const i = ETAPES.findIndex(([e]) => e === p.etape);
            setFaites(new Set(ETAPES.slice(0, p.fait >= p.total ? i + 1 : i).map(([e]) => e)));
          },
        });
        setUniv(r.univ);
        const liste = r.portraits.map((id) => derniere.current.personnages.find((p) => p.id === id)!).filter(Boolean)
          .map((p) => ({ id: p.id, nom: p.nom, apparence: p.apparence as Record<string, unknown> }));
        if (!liste.length || annule.current) { setFini(true); return; }
        setProg({ etape: 'avatars', fait: 0, total: liste.length, texte: 'Chargement du modèle 3D…' });
        setTaches(liste);
      } catch (e) { setErreur((e as Error).message); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const portrait = async ({ id, apparence, vignette }: ResultatPortrait, rang: number) => {
    setProg({ etape: 'avatars', fait: rang + 1, total: taches?.length ?? 0, texte: derniere.current.personnages.find((p) => p.id === id)?.nom ?? '' });
    const f = vignette ? await ajouterFichier(derniere.current.campagne.id, await dataUrlVersBlob(vignette), `${id} - portrait.jpg`) : null;
    modifier((x) => ({
      ...x,
      personnages: x.personnages.map((p) => (p.id === id ? { ...p, apparence, ...(f && !p.portrait ? { portrait: f.id } : {}) } : p)),
      fichiers: f ? [...x.fichiers, f] : x.fichiers,
    }));
  };

  const pct = prog && prog.total ? Math.round((prog.fait / prog.total) * 100) : 0;
  return (
    <div className="monde-voile">
      <div className="monde-installation carte-ui">
        <h2 style={{ margin: 0 }}>Installation du monde dans la campagne</h2>
        <ol className="monde-etapes">
          {ETAPES.map(([e, nom]) => (
            <li key={e} className={faites.has(e) || (fini && e !== 'avatars') || (fini && taches) ? 'fait' : prog?.etape === e ? 'en-cours' : ''}>
              <span>{nom}</span>
              {prog?.etape === e && !fini && <small className="discret">{prog.texte}{prog.total > 1 ? ` (${prog.fait}/${prog.total})` : ''}</small>}
            </li>
          ))}
        </ol>
        {!fini && !erreur && <div className="monde-barre"><div style={{ width: `${pct}%` }} /></div>}
        {erreur && <p className="monde-erreur">Erreur : {erreur}</p>}
        {fini && (
          <p>
            Terminé. Le monde est le monde par défaut de la campagne. Les cartes sont rangées par catégorie dans <strong>Cartes</strong>,
            les cartes de bataille sont cachées aux joueurs et chaque lieu de quête porte un repère « ⚔ » qui lance la rencontre.
          </p>
        )}
        <p className="discret">Tu peux relancer l’installation plus tard : ce qui existe déjà est gardé (pas de doublon), seul ce qui manque est ajouté.</p>
        <div className="ligne" style={{ justifyContent: 'flex-end' }}>
          {!fini && !erreur && <button className="btn" onClick={() => { annule.current = true; setFini(true); }}>Arrêter</button>}
          {(fini || erreur) && <button className="btn btn-principal" onClick={() => onFermer(univ)}>Fermer</button>}
        </div>
      </div>
      {taches && !fini && <FabriqueDePortraits taches={taches} onPortrait={(r, i) => void portrait(r, i)} onFini={() => setFini(true)} />}
    </div>
  );
}
