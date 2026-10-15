// Côté MJ (en-tête, toujours actif) : annotations proposées par les écrans joueurs sur la carte affichée. Rangées
// dans la campagne, puis renvoyées à tous les écrans (sans renvoyer l'image).
import { useEffect, useRef } from 'react';
import { completerScene, ecouterJoueurs, ecranActuel } from '../../noyau/bus';
import { useCampagne } from '../../interface/etat';
import { persoDuJeton } from '../joueurs';
import { annotationsDe, avecAnnotation, sansAnnotation } from './annotations';
import { sourceCarte } from './montrer';

export function SuiviAnnotations() {
  const { campagne, modifier } = useCampagne();
  const c = useRef(campagne); c.current = campagne;
  useEffect(() => ecouterJoueurs((module, d, jeton) => {
    const x = c.current;
    if (module !== 'cartes' || !x) return;
    const id = String(d.carteId ?? ''), k = x.cartes.find((y) => y.id === id);
    if (!k || ecranActuel().source !== sourceCarte(id)) return; // seulement la carte affichée
    const p = jeton ? persoDuJeton(x, jeton) : undefined;
    if (jeton && !p) return;
    const auteur = p ? { nom: p.joueur || p.nom, persoId: p.id } : { nom: 'Table', persoId: 'table' };
    let y = x;
    if (d.ajouter && typeof d.ajouter === 'object') y = avecAnnotation(y, id, d.ajouter as Record<string, unknown>, k.taille ?? { l: 1000, h: 1000 }, auteur);
    if (typeof d.effacer === 'string') y = sansAnnotation(y, id, d.effacer, auteur.persoId);
    if (y === x) return;
    c.current = y;
    modifier(() => y);
    completerScene(sourceCarte(id), { annotations: annotationsDe(y, id) });
  }), [modifier]);
  return null;
}
