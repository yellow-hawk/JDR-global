// Page Avatar 3D : le créateur de l'Avatar Creator, branché sur les personnages de la campagne.
// L'apparence est rangée dans personnage.apparence (preset presetVersion 1), la vignette peut devenir le portrait.
import { Suspense, lazy, useEffect, useState } from 'react';
import { emettre } from '../../noyau/bus';
import { ajouterFichier, supprimerFichier } from '../../noyau/stockage';
import { useCampagne } from '../../interface/etat';
import { buildPresetFromCurrent, loadPresetIntoStore } from './createur/store/presets';
import { captureThumbnail } from './createur/three/snapshot';
import ControlPanel from './createur/ui/ControlPanel';
import { prendreDemande } from './demande';
import './avatar.css';

// Le visualiseur (three + R3F) n'est chargé qu'à l'ouverture de cette page.
const AvatarViewer = lazy(() => import('./createur/three/AvatarViewer'));

const dataUrlVersBlob = async (u: string): Promise<Blob> => (await fetch(u)).blob();

export function Page() {
  const { vue, lectureSeule, modifier } = useCampagne();
  const c = vue!;
  const [persoId, setPersoId] = useState<string>(() => prendreDemande() ?? '');
  const perso = c.personnages.find((p) => p.id === persoId) ?? null;

  // Charge l'apparence du personnage choisi (ou les valeurs par défaut).
  useEffect(() => {
    loadPresetIntoStore(perso?.apparence ?? { presetVersion: 1, data: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persoId]);

  const enregistrer = (aussiPortrait: boolean) => {
    if (!perso) return;
    const vignette: string | null = captureThumbnail();
    const preset = buildPresetFromCurrent(perso.nom, { thumbnail: vignette, createdAt: (perso.apparence as { createdAt?: string } | null)?.createdAt });
    modifier((x) => ({ ...x, personnages: x.personnages.map((p) => (p.id === perso.id ? { ...p, apparence: preset } : p)) }));
    if (aussiPortrait && vignette) {
      void (async () => {
        const f = await ajouterFichier(c.campagne.id, await dataUrlVersBlob(vignette), `${perso.nom} - avatar.jpg`);
        const ancien = perso.portrait;
        modifier((x) => ({
          ...x,
          personnages: x.personnages.map((p) => (p.id === perso.id ? { ...p, portrait: f.id } : p)),
          fichiers: [...x.fichiers.filter((y) => y.id !== ancien), f],
        }));
        if (ancien) void supprimerFichier(c.campagne.id, ancien);
      })();
    }
    emettre('message', { texte: aussiPortrait ? 'Apparence et portrait enregistrés.' : 'Apparence enregistrée.', sorte: 'succes' });
  };

  return (
    <div className="avatar-page">
      <aside className="avatar-cote pile">
        <h1 style={{ margin: 0 }}>Avatar 3D</h1>
        <label className="champ">
          <span>Personnage</span>
          <select value={persoId} onChange={(e) => setPersoId(e.target.value)}>
            <option value="">Essai libre (non enregistré)</option>
            {c.personnages.map((p) => <option key={p.id} value={p.id}>{p.nom}{p.apparence ? ' · apparence enregistrée' : ''}</option>)}
          </select>
        </label>
        {perso && !lectureSeule && (
          <div className="pile" style={{ gap: 6 }}>
            <button className="btn btn-principal" onClick={() => enregistrer(true)}>Enregistrer + utiliser comme portrait</button>
            <button className="btn" onClick={() => enregistrer(false)}>Enregistrer l'apparence seule</button>
          </div>
        )}
        {(perso?.apparence as { thumbnail?: string } | null)?.thumbnail && (
          <img className="avatar-vignette" src={(perso!.apparence as { thumbnail: string }).thumbnail} alt={`Vignette de ${perso!.nom}`} />
        )}
        <p className="discret">
          Glisser pour tourner, molette pour zoomer. Réglages à droite (couleurs, visage, corps, coiffure).
          Le genre féminin et les vêtements arriveront plus tard (chaîne Blender).
        </p>
      </aside>
      <section className="avatar-scene">
        <Suspense fallback={<div className="vide">Chargement du modèle 3D…</div>}>
          <AvatarViewer />
        </Suspense>
      </section>
      <aside className="avatar-reglages">
        <ControlPanel />
      </aside>
    </div>
  );
}
