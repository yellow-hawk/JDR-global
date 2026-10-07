// Dans l'en-tête : sauvegarde automatique vers le dossier de l'ordinateur (si un dossier est choisi et autorisé).
// Écrit l'archive du jour au plus toutes les 10 minutes quand la campagne a changé ; un clic sauvegarde tout de suite.
import { useEffect, useRef, useState } from 'react';
import { emettre } from '../../noyau/bus';
import { INTERVALLE_MS, autoriserDossier, etatDossier } from '../../noyau/stockage';
import { useCampagne } from '../../interface/etat';
import { sauverDansDossier } from './echanges';

export function EnTete() {
  const { campagne } = useCampagne();
  const [dossier, setDossier] = useState<{ nom: string; autorise: boolean } | null>(null);
  const [derniere, setDerniere] = useState<Date | null>(null);
  const ecrite = useRef<string | null>(null); // majLe de la dernière version écrite
  const courante = useRef(campagne);
  courante.current = campagne;

  useEffect(() => { void etatDossier().then(setDossier); }, [campagne?.campagne.id]);

  const sauver = async (force = false) => {
    const c = courante.current;
    if (!c || (!force && ecrite.current === c.campagne.majLe)) return;
    if (await sauverDansDossier(c)) { ecrite.current = c.campagne.majLe; setDerniere(new Date()); }
    else if (force) emettre('message', { texte: 'Écriture dans le dossier impossible.', sorte: 'erreur' });
  };
  useEffect(() => {
    if (!dossier?.autorise) return;
    void sauver();
    const t = window.setInterval(() => void sauver(), INTERVALLE_MS);
    return () => window.clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossier?.autorise, campagne?.campagne.id]);

  if (!dossier) return null;
  if (!dossier.autorise) {
    return <button className="btn btn-petit btn-mj" title={`Le navigateur demande de réautoriser le dossier « ${dossier.nom} »`} onClick={() => void autoriserDossier().then(() => etatDossier().then(setDossier))}>Réautoriser la sauvegarde</button>;
  }
  return (
    <button className="btn btn-petit" title={`Sauvegarde automatique dans « ${dossier.nom} » ; clic : sauvegarder maintenant`} onClick={() => void sauver(true)}>
      {derniere ? `Sauvé ${derniere.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Sauvegarde…'}
    </button>
  );
}
