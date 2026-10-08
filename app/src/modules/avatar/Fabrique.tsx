// Fabrique de portraits : un visualiseur 3D hors écran qui charge des apparences une à une et les photographie.
// Utilisée par le module Monde pour les PNJ importés. Ne s'affiche pas (rendu hors de la fenêtre visible).
import { Suspense, lazy, useEffect, useRef } from 'react';
import { buildPresetFromCurrent, loadPresetIntoStore } from './createur/store/presets';
import { captureThumbnail, modeleCharge } from './createur/three/snapshot';
import { chargementsEnCours } from './createur/three/useAssets';

const AvatarViewer = lazy(() => import('./createur/three/AvatarViewer'));

export interface TachePortrait { id: string; nom: string; apparence: Record<string, unknown> }
export interface ResultatPortrait { id: string; apparence: Record<string, unknown>; vignette: string | null }

const attendre = (ms: number) => new Promise((ok) => window.setTimeout(ok, ms));

interface Props {
  taches: TachePortrait[];
  onPortrait: (r: ResultatPortrait, rang: number) => void;
  onFini: () => void;
}

export function FabriqueDePortraits({ taches, onPortrait, onFini }: Props) {
  const lance = useRef(false);
  useEffect(() => {
    if (lance.current) return;
    lance.current = true;
    void (async () => {
      // Attente du vrai modèle : 60 s au plus.
      for (let t = 0; t < 600 && !modeleCharge(); t++) await attendre(100);
      for (const [i, t] of taches.entries()) {
        loadPresetIntoStore(t.apparence);
        // Laisse React appliquer le preset, puis attend que les assets (coiffure, tenue…) soient chargés.
        await attendre(150);
        for (let k = 0; k < 100 && chargementsEnCours() > 0; k++) await attendre(100);
        await attendre(150);
        const vignette = modeleCharge() ? captureThumbnail() : null;
        const apparence = buildPresetFromCurrent(t.nom, { thumbnail: vignette });
        onPortrait({ id: t.id, apparence: { ...apparence, auto: true }, vignette }, i);
      }
      onFini();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div aria-hidden style={{ position: 'fixed', left: -2000, top: 0, width: 320, height: 320, pointerEvents: 'none' }}>
      <Suspense fallback={null}><AvatarViewer /></Suspense>
    </div>
  );
}
