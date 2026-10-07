// Quel type de carte de bataille pour un lieu de quête ? Règles par mots-clés, dans des données.
import { rngFor } from '../../../noyau/hasard';
import { genererDonjon } from './donjon';
import { genererExterieur } from './exterieur';
import { genererInterieur } from './interieur';
import type { OptionsDonjon, PlanBataille, SorteExterieur, SorteInterieur } from './types';

/** Lieu tel que le décrit une quête (Atlas ou fait main). */
export interface LieuQuete { nom: string; sorte?: string; type?: string; danger?: string; desc?: string; etape?: string }

export type Choix =
  | { theme: 'donjon'; ambiance: NonNullable<OptionsDonjon['ambiance']> }
  | { theme: 'interieur'; sorte: SorteInterieur }
  | { theme: 'exterieur'; sorte: SorteExterieur };

/** Règles dans l'ordre : la première dont un mot apparaît dans le texte du lieu l'emporte. */
const REGLES: [RegExp, Choix][] = [
  [/grotte|caverne|cave\b|antre|nid de wyvernes|volcan|mont de feu/i, { theme: 'donjon', ambiance: 'grotte' }],
  [/mine\b|mine |galerie|filon/i, { theme: 'donjon', ambiance: 'mine' }],
  [/tombeau|tombe|crypte|nécropole|ossuaire|caveau|catacombe/i, { theme: 'donjon', ambiance: 'crypte' }],
  [/cité engloutie|sunken|souterrain|donjon|oubliette|prison|bibliothèque oubliée|tour noire|blacktower/i, { theme: 'donjon', ambiance: 'pierre' }],
  [/auberge|taverne|\binn\b|relais|maison de thé|salle à boire/i, { theme: 'interieur', sorte: 'taverne' }],
  [/temple|sanctuaire|shrine|monastère|chapelle|moontemple|cathédrale/i, { theme: 'interieur', sorte: 'temple' }],
  [/cour |palais|trône|château|capitale|capital\b|ambassade|chancellerie/i, { theme: 'interieur', sorte: 'palais' }],
  [/observatoire|observatory|tour|phare|lighthouse/i, { theme: 'interieur', sorte: 'tour' }],
  [/fort\b|forteresse|citadelle|garnison|caserne/i, { theme: 'interieur', sorte: 'fort' }],
  [/bibliothèque|archives|scriptorium/i, { theme: 'interieur', sorte: 'bibliotheque' }],
  [/entrepôt|dépôt|port\b|quai|marché|moulin|mill/i, { theme: 'interieur', sorte: 'entrepot' }],
  [/ruines|ruin|vestiges|champ de bataille|statue/i, { theme: 'exterieur', sorte: 'ruines' }],
  [/gué|pont|bridge|rivière|fleuve/i, { theme: 'exterieur', sorte: 'gue' }],
  [/camp|campement|repaire|brigands|bandits|pirates/i, { theme: 'exterieur', sorte: 'camp' }],
  [/cercle de pierres|menhir|circle|porte des étoiles|stargate/i, { theme: 'exterieur', sorte: 'cercle' }],
  [/cratère|crater|geyser|forêt pétrifiée/i, { theme: 'exterieur', sorte: 'cratere' }],
  [/marais|marécage|tourbière|brumes/i, { theme: 'exterieur', sorte: 'marais' }],
  [/forêt|bois|arbre-monde|worldtree|jungle/i, { theme: 'exterieur', sorte: 'foret' }],
  [/désert|dunes|oasis|sables/i, { theme: 'exterieur', sorte: 'desert' }],
  [/neige|glace|glacier|toundra/i, { theme: 'exterieur', sorte: 'neige' }],
  [/côte|plage|crique|épave|récif/i, { theme: 'exterieur', sorte: 'cote' }],
  [/cité|city|ville|village|hameau|bourg/i, { theme: 'interieur', sorte: 'taverne' }],
  [/route|chemin|col\b|passage/i, { theme: 'exterieur', sorte: 'route' }],
];

export function choisirCarte(l: LieuQuete): Choix {
  // L'étape compte d'abord (« À la cour des… » → palais), puis le lieu lui-même.
  for (const texte of [l.etape ?? '', `${l.nom} ${l.sorte ?? ''} ${l.type ?? ''}`, l.desc ?? '']) {
    for (const [re, c] of REGLES) if (re.test(texte)) return c;
  }
  return { theme: 'exterieur', sorte: 'plaine' };
}

export const LIBELLES: Record<string, string> = {
  grotte: 'grotte', mine: 'mine', crypte: 'crypte', pierre: 'donjon', taverne: 'taverne', temple: 'temple', palais: 'palais',
  tour: 'tour', fort: 'fort', bibliotheque: 'bibliothèque', entrepot: 'entrepôt', maison: 'maison', ruines: 'ruines', gue: 'gué',
  camp: 'campement', cercle: 'cercle de pierres', cratere: 'cratère', marais: 'marais', foret: 'forêt', desert: 'désert',
  neige: 'neige', cote: 'côte', route: 'route', plaine: 'plaine',
};

export const libelleChoix = (c: Choix): string => LIBELLES[c.theme === 'donjon' ? c.ambiance : c.sorte];

/** Génère le plan d'une carte de bataille. Déterministe : même graine → même carte. */
export function genererPlan(c: Choix, titre: string, graine: string): PlanBataille {
  const r = rngFor(graine, 'bataille');
  if (c.theme === 'donjon') return genererDonjon(r, titre, graine, { ambiance: c.ambiance });
  if (c.theme === 'interieur') return genererInterieur(r, titre, graine, c.sorte);
  return genererExterieur(r, titre, graine, c.sorte);
}
