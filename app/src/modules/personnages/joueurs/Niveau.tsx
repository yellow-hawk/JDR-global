// Écran d'un joueur : sa montée de niveau. Il fait ses choix avec l'assistant de la fiche (classe, PV, sous-classe,
// amélioration ou don) ; la proposition part au MJ, qui la valide ou la refuse dans la page Joueurs.
import { useMemo } from 'react';
import type { Personnage } from '../../../noyau/contrat';
import { aUneFiche, regles } from '../../../noyau/regles';
import type { PropsVueJoueurs } from '../../../interface/types';
import { MonteeNiveau } from '../progression/MonteeNiveau';
import type { ChoixNiveau } from '../progression/logique';
import '../personnages.css';

interface Donnees { perso: Personnage; regles: string; attente: { choix: ChoixNiveau; quand: string } | null }

export default function Niveau({ donnees, envoyer }: PropsVueJoueurs) {
  const d = donnees as unknown as Donnees;
  const R = useMemo(() => regles(d.regles), [d.regles]);
  if (!aUneFiche(R)) return null;
  if (d.attente) {
    const c = d.attente.choix;
    return (
      <div className="vue-niveau pile">
        <h3 style={{ margin: 0 }}>Montée de niveau proposée</h3>
        <p>{R.catalogue.classes.find((x) => x.id === c.classe)?.nom ?? c.classe} · +{c.pv} PV{c.amelioration ? ` · ${Object.entries(c.amelioration).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ')}` : ''}{c.don ? ` · don : ${c.don}` : ''}</p>
        <p className="discret">En attente du maître du jeu : il la valide ou te demande de la refaire.</p>
      </div>
    );
  }
  return (
    <div className="vue-niveau">
      <p className="discret">Tu as assez d’expérience pour monter de niveau. Fais tes choix : le maître du jeu les validera.</p>
      <MonteeNiveau p={d.perso} R={R} onValider={(choix) => envoyer({ choix })} onAnnuler={() => undefined} />
    </div>
  );
}
