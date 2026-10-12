// Écran joueurs : effet 3D du sort tracé (vue de l'Atelier), avec son nom et ce qu'il fait.
import { useMemo, useState } from 'react';
import type { PropsVueJoueurs } from '../../../interface/types';
import { analyser } from '../atelier/engine/analyse';
import { Vue3D } from '../atelier/components/Vue3D';
import type { EffetTrace } from '../partage';
import '../atelier/atelier.css';
import './joueurs.css';

export default function Effet({ donnees }: PropsVueJoueurs) {
  const e = donnees as unknown as EffetTrace;
  const analyse = useMemo(() => analyser(e.sceau), [e.sceau]);
  const [cle, setCle] = useState(1);
  return (
    <div className="effet-joueurs">
      <div className="effet-titre"><strong>{e.nom}</strong><span>{e.resume}</span><button className="btn btn-petit" onClick={() => setCle((k) => k + 1)}>Revoir</button></div>
      <div className="atelier-racine effet-3d"><Vue3D traits={e.traits} centre={e.centre} R={e.R} sceau={e.sceau} analyse={analyse} playKey={cle} /></div>
    </div>
  );
}
