// État de la table dans React : historique annuler / rétablir, réglages d'interface, particules.
import { useCallback, useMemo, useRef, useState } from 'react';
import { emettre } from '../../../noyau/bus';
import { annuler as annulerH, historique, pousser, retablir as retablirH } from '../moteur/historique';
import { TERRAINS } from '../moteur/etat';
import { revelerParLaVue } from '../moteur/vision';
import type { EtatTable, Gabarit } from '../moteur/types';
import type { Particule } from '../rendu';
import { UI_INITIALE, type Controleur, type Ui } from './types';

export function useTable(initial: () => EtatTable, lectureSeule: boolean): Controleur {
  const [histo, setHisto] = useState(() => historique(initial()));
  const [ui, setUi] = useState<Ui>(UI_INITIALE);
  const particules = useRef<Particule[]>([]).current;

  const faire = useCallback((f: (e: EtatTable) => EtatTable, fusionner = false) => {
    setHisto((h) => {
      let r = f(h.present);
      // Option « la vue des PJ révèle le brouillard » : après chaque déplacement.
      if (r.vision && r.brouillard.actif && r.jetons !== h.present.jetons) r = revelerParLaVue(r, TERRAINS);
      return pousser(h, r, fusionner);
    });
  }, []);
  const annuler = useCallback(() => setHisto(annulerH), []);
  const retablir = useCallback(() => setHisto(retablirH), []);
  const remplacer = useCallback((e: EtatTable) => setHisto(historique(e)), []);
  const regler = useCallback((p: Partial<Ui>) => setUi((u) => ({ ...u, ...p })), []);
  const dire = useCallback((texte: string, sorte: 'info' | 'succes' | 'erreur' = 'info') => emettre('message', { texte, sorte }), []);

  const etat = histo.present;
  const viser = useCallback((s: Gabarit) => {
    setUi((u) => {
      if (u.selection == null) { emettre('message', { texte: 'Choisis d’abord le lanceur (clic sur son jeton).', sorte: 'erreur' }); return u; }
      return { ...u, outil: 'sort', sort: { id: s.id, lanceur: u.selection, angle: 0 } };
    });
  }, []);

  return useMemo(() => ({
    etat, histo, faire, annuler, retablir, remplacer, ui, regler, dire, particules, viser, lectureSeule,
  }), [etat, histo, faire, annuler, retablir, remplacer, ui, regler, dire, particules, viser, lectureSeule]);
}
