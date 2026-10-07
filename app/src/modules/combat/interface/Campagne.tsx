// Colonne de gauche : liens avec la campagne (personnages, carte de fond, sorts de l'Atelier, rencontres, écran joueurs).
import { useMemo, useState } from 'react';
import type { Campagne } from '../../../noyau/contrat';
import type { SystemeRegles } from '../../../noyau/regles';
import { lireFichier } from '../../../noyau/stockage';
import { pixelsParCase } from '../../cartes';
import { libelleSorte } from '../../personnages';
import { enregistrerRencontre, etatDeRencontre, jetonDepuisPersonnage, reporterDansFiches } from '../logique';
import { ajouterJeton, caseLibre, nouvelEtat } from '../moteur';
import type { EtatTable } from '../moteur';
import { sortsDeLaCampagne } from '../sorts';
import { portraitData } from './images';
import { Packs } from './Packs';
import type { Controleur } from './types';

interface Props {
  ctl: Controleur;
  c: Campagne;
  R: SystemeRegles;
  modifier: (f: (c: Campagne) => Campagne) => void;
  diffusion: boolean;
  setDiffusion: (v: boolean) => void;
  auto: boolean;
}

const basculer = (ens: Set<string>, id: string) => { const n = new Set(ens); if (n.has(id)) n.delete(id); else n.add(id); return n; };

export function Campagne({ ctl, c, R, modifier, diffusion, setDiffusion, auto }: Props) {
  const [choisis, setChoisis] = useState<Set<string>>(new Set());
  const sorts = useMemo(() => sortsDeLaCampagne(c), [c]);
  const e = ctl.etat;
  const ro = ctl.lectureSeule;
  const tache = async (f: () => Promise<void>) => { try { await f(); } catch (err) { ctl.dire((err as Error).message, 'erreur'); } };

  const placer = () => tache(async () => {
    const modeles: ReturnType<typeof jetonDepuisPersonnage>[] = [];
    for (const p of c.personnages.filter((x) => choisis.has(x.id))) {
      if (e.jetons.some((j) => j.persoId === p.id)) { ctl.dire(`${p.nom} est déjà sur la table.`); continue; }
      const b = p.portrait ? await lireFichier(c.campagne.id, p.portrait) : undefined;
      modeles.push(jetonDepuisPersonnage(p, R, b ? await portraitData(b) : null));
    }
    ctl.faire((x) => modeles.reduce((r, m) => { const [cx, cy] = caseLibre(r, [1, 1]); return ajouterJeton(r, m, cx, cy).etat; }, x));
    setChoisis(new Set());
  });

  const mettreFond = (id: string) => {
    const k = c.cartes.find((x) => x.id === id);
    ctl.faire((x) => ({ ...x, fond: k ? { carte: k.id, pxCase: pixelsParCase(k) } : null }));
    if (k && !k.echelle) ctl.dire("Échelle de la carte non calée : la grille n'est pas alignée (Cartes → Échelle).");
  };

  const sauver = () => {
    const nom = window.prompt('Nom de la rencontre :', 'Rencontre');
    if (!nom) return;
    modifier((x) => enregistrerRencontre(reporterDansFiches(x, e.jetons, R).campagne, nom, e, e.fond?.carte ?? null).campagne);
    ctl.dire(`Rencontre « ${nom} » enregistrée dans la campagne.`, 'succes');
  };

  const reporter = () => {
    const n = reporterDansFiches(c, e.jetons, R).modifies;
    modifier((x) => reporterDansFiches(x, e.jetons, R).campagne);
    ctl.dire(n ? `${n} fiche(s) mise(s) à jour (PV, états).` : 'Les fiches sont déjà à jour.', 'succes');
  };

  const charger = (id: string) => {
    const r = c.rencontres.find((x) => x.id === id);
    if (!r) return;
    const t: EtatTable = etatDeRencontre(r);
    const k = r.carte && c.cartes.find((x) => x.id === r.carte!.id);
    ctl.remplacer(!t.fond && k ? { ...t, fond: { carte: k.id, pxCase: pixelsParCase(k) } } : t);
    ctl.regler({ selection: null, zoneChoisie: null, outil: 'choisir', sort: null });
    if (auto) setDiffusion(true);
    ctl.dire(`Rencontre « ${r.nom} » chargée${auto ? ' et montrée sur l’écran joueurs' : ''}.`, 'succes');
  };

  return (
    <aside className="combat-gauche">
      <details open>
        <summary>Personnages ({c.personnages.length})</summary>
        <div className="combat-liste">
          {c.personnages.map((p) => (
            <label key={p.id} className="combat-choix">
              <input type="checkbox" checked={choisis.has(p.id)} onChange={() => setChoisis(basculer(choisis, p.id))} disabled={ro} />
              <span>{p.nom}</span><span className="discret">{libelleSorte(p.sorte)}</span>
            </label>
          ))}
        </div>
        {!ro && <button className="btn btn-petit btn-principal" disabled={!choisis.size} onClick={placer}>Placer sur la table</button>}
        {!ro && <button className="btn btn-petit" disabled={!e.jetons.some((j) => j.persoId)} onClick={reporter}>Reporter PV et états dans les fiches</button>}
      </details>

      <details open>
        <summary>Carte de fond</summary>
        <select value={e.fond?.carte ?? ''} onChange={(ev) => mettreFond(ev.target.value)} disabled={ro}>
          <option value="">Aucune</option>
          {c.cartes.map((k) => <option key={k.id} value={k.id}>{k.nom}{k.echelle ? '' : ' (sans échelle)'}</option>)}
        </select>
      </details>

      <p className="discret">Sorts : tous ceux de la campagne (grimoire du MJ et des personnages) sont dans l’onglet Sorts de la table ({sorts.length}). Dégâts : {R.nom}, {R.degatsSort(4).formule} pour une puissance de 4.</p>

      {!ro && (
        <details open>
          <summary>Rencontres ({c.rencontres.length})</summary>
          {c.rencontres.map((r) => (
            <div key={r.id} className="ligne combat-renc">
              <span style={{ flex: 1 }}>{r.nom}</span>
              <button className="btn btn-petit" onClick={() => charger(r.id)}>Charger</button>
              <button className="btn btn-petit btn-danger" onClick={() => window.confirm(`Supprimer « ${r.nom} » ?`) && modifier((x) => ({ ...x, rencontres: x.rencontres.filter((y) => y.id !== r.id) }))}>×</button>
            </div>
          ))}
          <button className="btn btn-petit btn-principal" onClick={sauver}>Enregistrer la table actuelle</button>
          <button className="btn btn-petit" onClick={() => window.confirm('Vider la table (jetons, zones, combat) ? Annulable avec Ctrl+Z.') && ctl.faire((x) => ({ ...nouvelEtat(), grille: x.grille, sorts: x.sorts, bibliotheque: x.bibliotheque, etatsSup: x.etatsSup, fond: x.fond, opacites: x.opacites }))}>Nouvelle table</button>
        </details>
      )}

      {!ro && <Packs ctl={ctl} c={c} modifier={modifier} />}

      {!ro && (
        <details open>
          <summary>Écran joueurs</summary>
          <label className="combat-choix">
            <input type="checkbox" checked={diffusion} onChange={(ev) => setDiffusion(ev.target.checked)} />
            <span>Diffuser la table en continu</span>
          </label>
          <label className="combat-choix">
            <input type="checkbox" checked={auto} onChange={(ev) => modifier((x) => ({ ...x, modules: { ...x.modules, combat: { ...x.modules?.combat, diffusionAuto: ev.target.checked } } }))} />
            <span>Diffuser automatiquement au lancement d’un combat</span>
          </label>
          <p className="discret">Toute la carte, vue joueurs : stats ennemies, jetons cachés et ennemis invisibles masqués, brouillard opaque.</p>
        </details>
      )}
    </aside>
  );
}
