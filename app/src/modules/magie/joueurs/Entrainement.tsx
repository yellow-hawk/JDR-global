// Écran d'un joueur : zone d'entraînement de son personnage (tracé libre avec lecture et effet 3D, leçons, défis
// chronométrés sur les sorts de son grimoire, calibrage de sa main). Le carnet part au MJ, qui garde ce qu'il permet.
import { useEffect, useRef, useState } from 'react';
import type { PropsVueJoueurs } from '../../../interface/types';
import { Freehand } from '../atelier/components/Freehand';
import type { ProfilPJ } from '../atelier/engine/profils';
import type { DonneesEntrainement } from '../entrainement';
import '../atelier/atelier.css';
import './joueurs.css';

export default function Entrainement({ donnees, envoyer }: PropsVueJoueurs) {
  const d = donnees as unknown as DonneesEntrainement;
  const [profil, setProfil] = useState<ProfilPJ>(d.profil);
  // Le carnet gardé par le MJ fait foi : il remplace le nôtre dès qu'il change.
  const recu = JSON.stringify(d.profil);
  useEffect(() => setProfil(d.profil), [recu]); // eslint-disable-line react-hooks/exhaustive-deps
  const attente = useRef<number | undefined>(undefined);

  const majProfil = (fn: (p: ProfilPJ) => ProfilPJ) => setProfil((p) => {
    const n = fn(p);
    window.clearTimeout(attente.current);
    attente.current = window.setTimeout(() => envoyer({ profil: n }), 300);
    return n;
  });

  return (
    <div className="atelier-racine entrainement-joueurs">
      <p className="entrainement-intro">
        <b>Zone d’entraînement de {profil.nom}.</b> Trace librement pour voir ce que lit ton sceau et son effet ; dans ton carnet :
        <b> Leçons</b> (modèle à reproduire{d.droits.lecons ? ', réussie = signe appris' : ''}), <b>S’entraîner</b> sur un sort de ton grimoire (chronométré, record gardé),
        <b> Calibrer ma main</b> (la lecture apprend ta façon de tracer). Rien de ce que tu traces ici n’est lancé en jeu.
        {!d.droits.grimoire && ' Le maître du jeu garde la main sur ton grimoire.'}
      </p>
      <Freehand mj={false} profil={profil} majProfil={majProfil} onOuvrir={() => undefined} onSave={() => undefined} droits={d.droits} />
    </div>
  );
}
