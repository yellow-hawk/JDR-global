// Actions des joueurs (côté MJ) : à chaque demande du panneau du jeton, l'image de la table et l'action partent sur
// l'écran joueurs ; la visée revient en direct (aperçu sur la table) ; à la validation, l'action est jouée.
import { useEffect, useRef } from 'react';
import { ecouterJoueurs, montrerAuxJoueurs } from '../../../noyau/bus';
import { estReponseAction, jetonPublic, reste, type DemandeAction } from '../actions';
import { centre, deplacer, lancerSort, TERRAINS, zoneDeSort } from '../moteur';
import { emettreParticules, imageEtCamera, type Fond } from '../rendu';
import { surDemandeAction, type Demande } from './ActionsJoueurs';
import { SONS } from './sons';
import type { Controleur } from './types';

export function useActionsJoueurs(ctl: Controleur, fond: Fond | null, portraits: Map<number, CanvasImageSource>, rediffuser: () => void): void {
  const dernier = useRef({ ctl, fond, portraits });
  dernier.current = { ctl, fond, portraits };
  const enCours = useRef<Demande | null>(null);

  useEffect(() => surDemandeAction((d) => {
    const { ctl: c, fond: f, portraits: p } = dernier.current;
    const e = c.etat;
    const j = e.jetons.find((x) => x.id === (d.sorte === 'sort' ? d.lanceur : d.jeton));
    const sp = d.sorte === 'sort' ? e.sorts.find((x) => x.id === d.sortId) : undefined;
    if (!j || (d.sorte === 'sort' && !sp)) { c.dire('Jeton ou sort introuvable.', 'erreur'); return; }
    void imageEtCamera(e, TERRAINS, f, p).then(({ image, camera, largeur, hauteur }) => {
      const demande: DemandeAction = {
        id: d.id, image, camera, largeur, hauteur, grille: e.grille,
        titre: sp ? `${j.nom} : ${sp.nom}` : `${j.nom} se déplace`,
        action: sp ? { sorte: 'sort', gabarit: sp, lanceur: jetonPublic(j) } : { sorte: 'deplacement', jeton: jetonPublic(j), reste: reste(e, j) },
      };
      enCours.current = d;
      montrerAuxJoueurs({ sorte: 'module', module: 'combat', vue: 'action', titre: demande.titre, donnees: demande as unknown as Record<string, unknown> }, 'combat:action');
      c.dire(`${demande.titre} : les joueurs visent sur leur écran.`, 'info');
    });
  }), []);

  useEffect(() => ecouterJoueurs((module, r) => {
    const d = enCours.current, c = dernier.current.ctl;
    if (module !== 'combat' || !d || !estReponseAction(r) || r.id !== d.id) return;
    const fini = () => { enCours.current = null; c.regler({ viseeJoueurs: null }); rediffuser(); };
    if (r.annule) { c.dire('Les joueurs ont annulé l’action.'); fini(); return; }
    if (!r.valide) {
      c.regler({ viseeJoueurs: d.sorte === 'sort' ? { sorte: 'sort', sortId: d.sortId, lanceur: d.lanceur, cellule: r.cellule, angle: r.angle } : { sorte: 'deplacement', jeton: d.jeton, cellule: r.cellule } });
      return;
    }
    const e = c.etat;
    if (d.sorte === 'sort') {
      const sp = e.sorts.find((x) => x.id === d.sortId), l = e.jetons.find((x) => x.id === d.lanceur);
      if (!sp || !l) { fini(); return; }
      const zone = zoneDeSort(sp, l, r.cellule, r.angle);
      const res = lancerSort(e, sp.id, l.id, zone, Math.random);
      if (res.erreur) c.dire(res.erreur, 'erreur');
      else {
        c.faire(() => res.etat);
        if (sp.particule) { const [px, py] = centre(e.grille, [zone.x, zone.y]); emettreParticules(c.particules, px, py, sp.particule, 40); }
        if (c.ui.sons) SONS.sort();
        c.dire(`${sp.nom} : ${res.cibles?.length ? res.cibles.join(', ') : 'aucune cible'}`, 'succes');
      }
    } else {
      const j = e.jetons.find((x) => x.id === d.jeton);
      if (j) {
        const res = deplacer(e, j.id, [j.x, j.y], r.cellule);
        if (res.ok) { c.faire(() => res.etat); c.dire(`${j.nom} se déplace.`, 'succes'); } else c.dire(res.raison ?? 'Déplacement impossible.', 'erreur');
      }
    }
    fini();
  }), [rediffuser]);
}
