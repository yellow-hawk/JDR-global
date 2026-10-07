// Horloge dans l'en-tête (MJ) : date courante (clic → Chronologie), +1 h, et mise à jour du bandeau de l'écran joueurs.
import { useEffect } from 'react';
import { emettre, montrerBandeau } from '../../noyau/bus';
import { useCampagne } from '../../interface/etat';
import { avancer, changerTemps, dateLisible, reference, tempsDe } from './logique';

/** Réglage « date sur l'écran joueurs », rangé dans la campagne (modules.chronologie.bandeau). */
export function useBandeau(): [boolean, (v: boolean) => void] {
  const { campagne, modifier } = useCampagne();
  const actif = !!(campagne?.modules?.chronologie as { bandeau?: boolean } | undefined)?.bandeau;
  const changer = (v: boolean) => modifier((c) => ({ ...c, modules: { ...(c.modules ?? {}), chronologie: { ...(c.modules?.chronologie ?? {}), bandeau: v } } }));
  return [actif, changer];
}

export function EnTete() {
  const { campagne, modifier } = useCampagne();
  const [bandeau] = useBandeau();
  const c = campagne!;
  const r = reference(c);
  const t = tempsDe(c);
  const texte = dateLisible(t.date, r.cal, t.heure);
  useEffect(() => { montrerBandeau(bandeau ? texte : null); }, [bandeau, texte]);
  return (
    <span className="chrono-entete">
      <button className="btn btn-petit" title="Temps de jeu : ouvrir la chronologie" onClick={() => emettre('naviguer', { page: 'chronologie' })}>{texte}</button>
      <button className="btn btn-petit" title="Avancer d'une heure" onClick={() => modifier((x) => changerTemps(x, (tt) => avancer(tt, reference(x), { heures: 1 })))}>+1 h</button>
    </span>
  );
}
