// Page Combat : la table réécrite (moteur/ + rendu/ + interface/), branchée sur la campagne.
import { useEffect, useMemo, useRef, useState } from 'react';
import { montrerAuxJoueurs, prendreCible } from '../../noyau/bus';
import { regles } from '../../noyau/regles';
import { useCampagne } from '../../interface/etat';
import { avecTableEnCours, etatDeRencontre, gabarit, tableEnCours } from './logique';
import { gabaritsDeLaCampagne } from './sorts';
import { remplacerSortsAtelier, TERRAINS } from './moteur';
import { imageJoueurs } from './rendu';
import { BarreOutils } from './interface/BarreOutils';
import { Campagne } from './interface/Campagne';
import { useFond, usePortraits } from './interface/images';
import { Panneaux } from './interface/Panneaux';
import { Table } from './interface/Table';
import { useTable } from './interface/useTable';
import './combat.css';

export function Page() {
  const { campagne, vue, role, lectureSeule, modifier } = useCampagne();
  const c = vue!;
  const R = regles(c.campagne.regles);
  const mj = role === 'mj';
  // Arrivée depuis un repère de carte : la rencontre demandée remplace la table en cours.
  const [cible] = useState(() => prendreCible('combat'));
  const ctl = useTable(() => {
    const r = cible && campagne?.rencontres.find((x) => x.id === cible);
    return r ? etatDeRencontre(r) : tableEnCours(campagne!);
  }, lectureSeule);
  // Diffusion vers l'écran joueurs : automatique quand un combat est lancé (rencontre chargée ou initiative).
  const auto = (campagne?.modules?.combat as { diffusionAuto?: boolean } | undefined)?.diffusionAuto !== false;
  const [diffusion, setDiffusion] = useState(() => !!cible && auto);
  const actif = ctl.etat.combat.actif;
  useEffect(() => { if (actif && auto && !lectureSeule) setDiffusion(true); }, [actif, auto, lectureSeule]);
  const [gauche, setGauche] = useState(true);
  const fond = useFond(c, ctl.etat.fond?.carte);
  const portraits = usePortraits(ctl.etat);

  // Grimoire de la table = sorts de la campagne (MJ + personnages), tenu à jour automatiquement.
  const sortsAuto = useMemo(() => gabaritsDeLaCampagne(c, (a) => gabarit(a, R)), [c.sorts, c.personnages, R]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (lectureSeule) return;
    ctl.faire((e) => {
      const actuels = e.sorts.filter((s) => s.atelier).map(({ id: _id, ...r }) => r);
      return JSON.stringify(actuels) === JSON.stringify(sortsAuto.map((s) => ({ ...s, atelier: true }))) ? e : remplacerSortsAtelier(e, sortsAuto);
    }, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortsAuto, lectureSeule]);

  // Sauvegarde automatique de la table en cours dans la campagne.
  const sauve = useRef(ctl.etat);
  useEffect(() => {
    if (lectureSeule || sauve.current === ctl.etat) return;
    const t = window.setTimeout(() => { sauve.current = ctl.etat; modifier((x) => avecTableEnCours(x, ctl.etat)); }, 700);
    return () => window.clearTimeout(t);
  }, [ctl.etat, lectureSeule, modifier]);

  // Annuler / rétablir au clavier.
  useEffect(() => {
    if (lectureSeule) return;
    const touche = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement).closest('input, textarea, select, [contenteditable]') || !(ev.ctrlKey || ev.metaKey)) return;
      const k = ev.key.toLowerCase();
      if (k === 'z' && !ev.shiftKey) { ev.preventDefault(); ctl.annuler(); }
      else if (k === 'y' || (k === 'z' && ev.shiftKey)) { ev.preventDefault(); ctl.retablir(); }
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [ctl, lectureSeule]);

  // Diffusion vers l'écran joueurs : image de toute la carte, renvoyée à chaque changement (au plus toutes les 0,5 s).
  useEffect(() => {
    if (!diffusion) return;
    const t = window.setTimeout(() => {
      imageJoueurs(ctl.etat, TERRAINS, fond.joueurs, portraits)
        .then((image) => montrerAuxJoueurs({ sorte: 'image', titre: 'Combat', image }))
        .catch(() => { /* rendu impossible : on réessaiera au prochain changement */ });
    }, 500);
    return () => window.clearTimeout(t);
  }, [diffusion, ctl.etat, fond.joueurs, portraits]);

  return (
    <div className={`combat-page ${gauche && mj ? '' : 'sans-gauche'}`}>
      {mj && gauche && <Campagne ctl={ctl} c={c} R={R} modifier={modifier} diffusion={diffusion} setDiffusion={setDiffusion} auto={auto} />}
      <div className="combat-centre">
        <div className="combat-entete">
          {mj && <button className="combat-outil" title={gauche ? 'Masquer la colonne campagne' : 'Afficher la colonne campagne'} onClick={() => setGauche(!gauche)}>{gauche ? '◀' : '▶'}</button>}
          <BarreOutils ctl={ctl} />
        </div>
        <div className="combat-zone-toile">
          <Table ctl={ctl} public={mj ? 'mj' : 'joueurs'} fond={mj ? fond.mj : fond.joueurs} />
        </div>
      </div>
      <Panneaux ctl={ctl} mj={mj} />
    </div>
  );
}
