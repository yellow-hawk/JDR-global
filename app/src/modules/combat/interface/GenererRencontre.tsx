// Génération d'une rencontre sur la table : chef PNJ complet (fiche, avatar 3D, portrait), adversaires nommés,
// créatures avec icône, dosés selon le niveau des PJ. La rencontre s'enregistre ensuite comme les autres.
import { useState } from 'react';
import type { Campagne as Camp, Personnage } from '../../../noyau/contrat';
import { nouvelId } from '../../../noyau/contrat';
import type { SystemeRegles } from '../../../noyau/regles';
import { aUneFiche } from '../../../noyau/regles';
import { ajouterFichier } from '../../../noyau/stockage';
import { FabriqueDePortraits, type ResultatPortrait, type TachePortrait } from '../../avatar';
import { genererLot } from '../../personnages';
import { jetonDepuisPersonnage } from '../logique';
import { ajouterJeton, caseLibre, nouvelEtat, type Cellule, type EtatTable } from '../moteur';
import { composerRencontre, difficulteAtteinte, DIFFICULTES, MILIEUX, type DemandeRencontre } from '../rencontres';
import { portraitData } from './images';
import type { Controleur } from './types';

interface Props { ctl: Controleur; c: Camp; R: SystemeRegles; modifier: (f: (c: Camp) => Camp) => void }

const niveauDe = (p: Personnage) => Number(p.combat.stats.niveau) || (p.fiche?.progression?.classes ?? []).reduce((s, x) => s + x.niveau, 0) || 1;

export function GenererRencontre({ ctl, c, R, modifier }: Props) {
  const pjs = c.personnages.filter((p) => p.sorte === 'pj');
  const [d, setD] = useState<DemandeRencontre>({ milieu: MILIEUX[0].id, difficulte: 'moyenne', niveaux: [], chef: aUneFiche(R), nommes: true });
  const [vider, setVider] = useState(true);
  const [avecPj, setAvecPj] = useState(true);
  const [taches, setTaches] = useState<TachePortrait[] | null>(null);
  const niveaux = pjs.map(niveauDe);

  const generer = () => {
    const graine = nouvelId('renc');
    const comp = composerRencontre(c, R, { ...d, niveaux }, ctl.etat.bibliotheque, graine);
    // Le chef devient un vrai PNJ de la campagne (sorte « ennemi »), avec avatar ; son portrait suit.
    let chef: Personnage | null = null;
    if (comp.chef && aUneFiche(R)) {
      [chef] = genererLot(c, R, { sorte: 'ennemi', nombre: 1, avecApparence: true, role: comp.chef.role, niveau: comp.chef.niveau }, graine);
      chef = { ...chef, role: comp.chef.role };
      const p = chef;
      modifier((x) => ({ ...x, personnages: [...x.personnages, p] }));
    }
    ctl.faire((x) => {
      let e: EtatTable = vider ? { ...nouvelEtat(), grille: x.grille, sorts: x.sorts, bibliotheque: x.bibliotheque, etatsSup: x.etatsSup, fond: x.fond, opacites: x.opacites } : x;
      const poser = (m: Parameters<typeof ajouterJeton>[1], pres: Cellule) => { const [cx, cy] = caseLibre(e, pres); e = ajouterJeton(e, m, cx, cy).etat; };
      // PJ à gauche, adversaires en face.
      if (avecPj) for (const p of pjs) if (!e.jetons.some((j) => j.persoId === p.id)) poser(jetonDepuisPersonnage(p, R, null), [2, 4]);
      if (chef) poser({ ...jetonDepuisPersonnage(chef, R, null), camp: 'ennemi' }, [11, 4]);
      for (const a of comp.adversaires) poser(a.modele, [10, 4]);
      return e;
    });
    const atteinte = difficulteAtteinte(R, niveaux, comp.xpAjustee);
    ctl.dire(`Rencontre : ${comp.resume || 'aucun adversaire'}${atteinte ? ` · ${atteinte} (${comp.xpAjustee} XP ajustés / ${comp.budget})` : ''}. « Enregistrer la table actuelle » pour la garder.`, 'succes');
    if (chef?.apparence) setTaches([{ id: chef.id, nom: chef.nom, apparence: chef.apparence }]);
  };

  // Portrait du chef : rangé dans sa fiche et posé sur son jeton.
  const portrait = async ({ id, apparence, vignette }: ResultatPortrait) => {
    if (!vignette) return;
    const blob = await (await fetch(vignette)).blob();
    const f = await ajouterFichier(c.campagne.id, blob, `${id} - portrait.jpg`);
    modifier((x) => ({ ...x, personnages: x.personnages.map((p) => (p.id === id ? { ...p, apparence, portrait: f.id } : p)), fichiers: [...x.fichiers, f] }));
    const data = await portraitData(blob);
    ctl.faire((x) => ({ ...x, jetons: x.jetons.map((j) => (j.persoId === id ? { ...j, portrait: data } : j)) }), true);
  };

  return (
    <details>
      <summary>Générer une rencontre</summary>
      <div className="combat-generer">
        <label className="combat-champ">Milieu<select value={d.milieu} onChange={(ev) => setD({ ...d, milieu: ev.target.value })}>
          {MILIEUX.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
        </select></label>
        <label className="combat-champ">Difficulté<select value={d.difficulte} onChange={(ev) => setD({ ...d, difficulte: ev.target.value as DemandeRencontre['difficulte'] })}>
          {DIFFICULTES.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select></label>
        <p className="discret">Groupe : {pjs.length ? `${pjs.length} PJ, niveau${niveaux.length > 1 ? 'x' : ''} ${[...new Set(niveaux)].join(', ')}` : 'aucun PJ (compté comme 4 PJ de niveau 1)'}</p>
        {aUneFiche(R) && <label className="combat-choix"><input type="checkbox" checked={d.chef} onChange={(ev) => setD({ ...d, chef: ev.target.checked })} /><span>Un chef : vrai PNJ avec fiche, avatar et portrait</span></label>}
        <label className="combat-choix"><input type="checkbox" checked={d.nommes} onChange={(ev) => setD({ ...d, nommes: ev.target.checked })} /><span>Nommer et décrire les humanoïdes</span></label>
        <label className="combat-choix"><input type="checkbox" checked={avecPj} onChange={(ev) => setAvecPj(ev.target.checked)} /><span>Placer les PJ</span></label>
        <label className="combat-choix"><input type="checkbox" checked={vider} onChange={(ev) => setVider(ev.target.checked)} /><span>Vider la table avant (annulable)</span></label>
        <button className="btn btn-petit btn-principal" disabled={!!taches} onClick={generer}>{taches ? 'Portrait du chef…' : 'Générer'}</button>
      </div>
      {taches && <FabriqueDePortraits taches={taches} onPortrait={(r) => void portrait(r)} onFini={() => setTaches(null)} />}
    </details>
  );
}
