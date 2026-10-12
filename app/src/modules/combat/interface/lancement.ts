// Lancement d'une rencontre enregistrée : table de la rencontre, carte de fond, PJ à l'entrée (avec leur portrait),
// brouillard et vue des PJ (réglage `modules.combat.brouillardAuto`, actif par défaut).
import type { Campagne, Rencontre } from '../../../noyau/contrat';
import type { SystemeRegles } from '../../../noyau/regles';
import { lireFichier } from '../../../noyau/stockage';
import { pixelsParCase } from '../../cartes';
import { etatDeRencontre, jetonDepuisPersonnage, preparerLancement } from '../logique';
import type { EtatTable } from '../moteur';
import { portraitData } from './images';

export const brouillardAuto = (c: Campagne): boolean => (c.modules?.combat as { brouillardAuto?: boolean } | undefined)?.brouillardAuto !== false;

export async function etatDeLancement(c: Campagne, R: SystemeRegles, r: Rencontre): Promise<EtatTable> {
  let t = etatDeRencontre(r);
  const k = r.carte ? c.cartes.find((x) => x.id === r.carte!.id) : undefined;
  if (!t.fond && k) t = { ...t, fond: { carte: k.id, pxCase: pixelsParCase(k) } };
  const pjs = [];
  for (const p of c.personnages.filter((x) => x.sorte === 'pj')) {
    const b = p.portrait ? await lireFichier(c.campagne.id, p.portrait) : undefined;
    pjs.push(jetonDepuisPersonnage(p, R, b ? await portraitData(b) : null));
  }
  // Anciennes tables sans lumière : les cartes de donjon sont dans le noir.
  return preparerLancement(t, pjs, { brouillard: brouillardAuto(c), lumiere: k?.type === 'donjon' ? 'obscurite' : 'vive' });
}
