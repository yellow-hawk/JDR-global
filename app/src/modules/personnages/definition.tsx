import { lazy } from 'react';
import type { DefinitionModule } from '../../interface/types';
import { regles } from '../../noyau/regles';
import { estCache } from '../../noyau/contrat';
import { montrerAuxJoueurs } from '../../noyau/bus';
import { lireFichier } from '../../noyau/stockage';
import { sceneJoueurs } from './logique';
import { arbresDesRegles, enregistrerArbresDeCampagne, sansTalentsDisparus, talentsDisparus } from '../../noyau/talents';
const Page = lazy(() => import('./Page').then((x) => ({ default: x.Page })));
// Écran d'un joueur à distance : son arbre de talents, à explorer et à développer (onglet Talents).
const Talents = lazy(() => import('./joueurs/Talents'));
const Niveau = lazy(() => import('./joueurs/Niveau'));

export const definition: DefinitionModule = {
  id: 'personnages', nom: 'Personnages', etat: 'pret', besoinCampagne: true, dansMenu: true,
  icone: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6',
  Page,
  ecranJoueurs: { talents: Talents, niveau: Niveau },
  montrables: {
    titre: 'Personnages',
    lister: (c) => c.personnages.filter((p) => !estCache(p)).map((p) => ({ id: p.id, nom: p.nom })),
    montrer: async (c, id) => {
      const p = c.personnages.find((x) => x.id === id);
      if (!p || estCache(p)) return false;
      const portrait = p.portrait ? (await lireFichier(c.campagne.id, p.portrait)) ?? null : null;
      montrerAuxJoueurs(sceneJoueurs(p, regles(c.campagne.regles), portrait), `perso:${p.id}`);
      return true;
    },
  },
  // À l'ouverture d'une campagne : ses arbres de talents (MJ) rejoignent ceux des règles ; les talents d'arbres
  // qui n'existent plus (arbres refondus) sont retirés des fiches et leurs points rendus.
  preparerCampagne: (c) => {
    enregistrerArbresDeCampagne((c.modules?.personnages as { arbres?: never[] } | undefined)?.arbres);
    regles(c.campagne.regles);
    if (!arbresDesRegles().length || !c.personnages.some((p) => talentsDisparus(p).length)) return c;
    return { ...c, personnages: c.personnages.map((p) => sansTalentsDisparus(p)) };
  },
};
