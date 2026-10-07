// Onglet Dés de la table : le plateau partagé (mode Neutre / Avantage / Désavantage puis dé).
// Le jeton choisi est noté comme lanceur ; chaque jet va au journal de la table et roule sur l'écran joueurs.
import { PlateauDes } from '../../../interface/des';
import { journaliser } from '../moteur';
import { SONS } from './sons';
import type { Controleur } from './types';

export function Des({ ctl }: { ctl: Controleur }) {
  const lanceur = ctl.etat.jetons.find((j) => j.id === ctl.ui.selection);
  return (
    <div className="combat-onglet">
      <p className="discret">Choisis d’abord le mode, puis le dé. Le mode revient sur Neutre après chaque jet.{lanceur ? ` Lanceur : ${lanceur.nom}.` : ''}</p>
      <PlateauDes compact qui={lanceur?.nom}
        onErreur={(t) => ctl.dire(t, 'erreur')}
        onJet={(_, texte) => {
          if (ctl.ui.sons) SONS.des();
          if (!ctl.lectureSeule) ctl.faire((e) => journaliser(e, `🎲 ${texte}`), true);
        }} />
    </div>
  );
}
