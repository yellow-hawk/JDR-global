// Panneau « Nouveau personnage » : fiche vierge, génération aléatoire (lot) ou assistant pas à pas.
// Les personnages générés reçoivent un avatar 3D ; leurs portraits (jetons) sont rendus ensuite par la fabrique.
import { useRef, useState } from 'react';
import type { Campagne, Personnage, SortePersonnage } from '../../../noyau/contrat';
import type { SystemeRegles } from '../../../noyau/regles';
import { aUneFiche } from '../../../noyau/regles';
import { ajouterFichier } from '../../../noyau/stockage';
import { emettre } from '../../../noyau/bus';
import { useCampagne } from '../../../interface/etat';
import { Onglets } from '../../../interface/composants';
import { FabriqueDePortraits, type ResultatPortrait, type TachePortrait } from '../../avatar';
import { SORTES, ajouter } from '../logique';
import { genererLot, personnageDepuisChoix } from './logique';
import { Aleatoire } from './Aleatoire';
import { Assistant } from './Assistant';

type Mode = 'aleatoire' | 'assistant' | 'vierge';
const versBlob = async (u: string): Promise<Blob> => (await fetch(u)).blob();

export function Creation({ R, sorte, onCree, onFermer }: { R: SystemeRegles; sorte: SortePersonnage; onCree(id: string): void; onFermer(): void }) {
  const { campagne, modifier } = useCampagne();
  const [mode, setMode] = useState<Mode>(aUneFiche(R) ? 'aleatoire' : 'vierge');
  const [taches, setTaches] = useState<TachePortrait[] | null>(null);
  const [faits, setFaits] = useState(0);
  const idCampagne = useRef(campagne!.campagne.id);

  const ajouterTous = (persos: Personnage[]) => {
    modifier((x: Campagne) => ({ ...x, personnages: [...x.personnages, ...persos] }));
    onCree(persos[0].id);
    const avecAvatar = persos.filter((p) => p.apparence);
    emettre('message', { texte: `${persos.length > 1 ? `${persos.length} personnages créés` : `${persos[0].nom} est créé`}${avecAvatar.length ? ', portraits en cours…' : '.'}`, sorte: 'succes' });
    if (avecAvatar.length) { setFaits(0); setTaches(avecAvatar.map((p) => ({ id: p.id, nom: p.nom, apparence: p.apparence! }))); }
    else onFermer();
  };

  const portrait = async ({ id, apparence, vignette }: ResultatPortrait) => {
    const f = vignette ? await ajouterFichier(idCampagne.current, await versBlob(vignette), `${id} - portrait.jpg`) : null;
    modifier((x: Campagne) => ({
      ...x,
      personnages: x.personnages.map((p) => (p.id === id ? { ...p, apparence, ...(f && !p.portrait ? { portrait: f.id } : {}) } : p)),
      fichiers: f ? [...x.fichiers, f] : x.fichiers,
    }));
    setFaits((n) => n + 1);
  };

  return (
    <div className="carte-ui pile perso-creation">
      <div className="ligne" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Nouveau personnage</h2>
        <button className="btn btn-petit" onClick={onFermer} disabled={!!taches}>Fermer</button>
      </div>
      {taches ? (
        <div className="pile">
          <p>Portraits et jetons : {faits} / {taches.length}… (le modèle 3D se charge, puis chaque personnage est photographié)</p>
          <progress max={taches.length} value={faits} />
          <FabriqueDePortraits taches={taches} onPortrait={(r) => void portrait(r)} onFini={() => { setTaches(null); emettre('message', { texte: 'Portraits prêts.', sorte: 'succes' }); onFermer(); }} />
        </div>
      ) : (
        <>
          <Onglets<Mode>
            onglets={[...(aUneFiche(R) ? [['aleatoire', 'Aléatoire'], ['assistant', 'Assistant pas à pas']] as [Mode, string][] : []), ['vierge', 'Fiche vierge']]}
            actif={mode} onChoix={setMode}
          />
          {mode === 'aleatoire' && aUneFiche(R) && <Aleatoire R={R} sorte={sorte} onGenerer={(d) => ajouterTous(genererLot(campagne!, R, d))} />}
          {mode === 'assistant' && aUneFiche(R) && <Assistant R={R} onCreer={(c, avecApparence) => ajouterTous([personnageDepuisChoix(R, c, 'pj', {}, avecApparence)])} />}
          {mode === 'vierge' && (
            <div className="ligne">
              {SORTES.map((s) => (
                <button key={s.id} className="btn" onClick={() => {
                  let id = '';
                  modifier((x: Campagne) => { const r = ajouter(x, s.id, R); id = r.id; return r.campagne; });
                  window.setTimeout(() => { onCree(id); onFermer(); }, 0);
                }}>{s.libelle}</button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
