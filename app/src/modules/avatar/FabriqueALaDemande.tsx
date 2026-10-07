// Fabrique de portraits chargée à la demande : three.js et le créateur ne sont téléchargés
// qu'au premier portrait, pas au démarrage de l'application (l'index du module est chargé par le registre).
import { lazy, Suspense, type ComponentProps } from 'react';

const Fabrique = lazy(() => import('./Fabrique').then((x) => ({ default: x.FabriqueDePortraits })));

export function FabriqueDePortraits(props: ComponentProps<typeof Fabrique>) {
  return <Suspense fallback={null}><Fabrique {...props} /></Suspense>;
}
