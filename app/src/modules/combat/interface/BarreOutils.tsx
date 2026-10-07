// Barre au-dessus de la table : outils et leurs réglages, annuler / rétablir, déroulé du combat.
import { debuterCombat, finirCombat, revelerParLaVue, TERRAINS, tourSuivant } from '../moteur';
import type { FormeZone } from '../moteur';
import { COULEURS_ZONE, NOMS_FORMES, type Controleur, type Outil } from './types';

const OUTILS: [Outil, string, string][] = [
  ['choisir', '☝', 'Choisir et déplacer (Maj : forcer)'], ['zone', '◯', 'Zone de sort libre'], ['terrain', '▦', 'Terrain'],
  ['brouillard', '☁', 'Brouillard'], ['mesure', '📏', 'Mesurer'], ['attaque', '⚔', 'Attaquer (jeton choisi → cible)'],
];
const FORMES: Exclude<FormeZone, 'polygone'>[] = ['cercle', 'cone', 'ligne', 'carre', 'rectangle'];

function Nombre({ v, min, max, onChange, titre }: { v: number; min: number; max: number; onChange: (n: number) => void; titre: string }) {
  return <label className="combat-mini">{titre}<input type="number" value={v} min={min} max={max} onChange={(ev) => onChange(Math.max(min, Math.min(max, +ev.target.value || min)))} /></label>;
}

function Reglages({ ctl }: { ctl: Controleur }) {
  const { ui, regler } = ctl;
  switch (ui.outil) {
    case 'zone': return (
      <>
        <select value={ui.zone.forme} onChange={(ev) => regler({ zone: { ...ui.zone, forme: ev.target.value as typeof ui.zone.forme } })}>
          {FORMES.map((f) => <option key={f} value={f}>{NOMS_FORMES[f]}</option>)}
        </select>
        <Nombre titre="Rayon" v={ui.zone.rayon} min={1} max={30} onChange={(rayon) => regler({ zone: { ...ui.zone, rayon } })} />
        {ui.zone.forme === 'rectangle' && <Nombre titre="Largeur" v={ui.zone.largeur} min={1} max={20} onChange={(largeur) => regler({ zone: { ...ui.zone, largeur } })} />}
        <select value={ui.zone.couleur} onChange={(ev) => regler({ zone: { ...ui.zone, couleur: ev.target.value } })}>
          {COULEURS_ZONE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <span className="discret">{['cone', 'ligne', 'rectangle'].includes(ui.zone.forme) ? 'Glisser pour orienter' : 'Cliquer pour poser'}</span>
      </>
    );
    case 'terrain': return (
      <>
        <select value={ui.terrain.type} onChange={(ev) => regler({ terrain: { ...ui.terrain, type: ev.target.value } })}>
          {TERRAINS.map((t) => <option key={t.id} value={t.id} title={t.desc}>{t.nom}</option>)}
        </select>
        <select value={ui.terrain.forme} onChange={(ev) => regler({ terrain: { ...ui.terrain, forme: ev.target.value as typeof ui.terrain.forme } })}>
          <option value="cercle">Cercle</option><option value="carre">Carré</option><option value="polygone">Polygone</option>
        </select>
        {ui.terrain.forme !== 'polygone' && <Nombre titre="Taille" v={ui.terrain.rayon} min={0} max={20} onChange={(rayon) => regler({ terrain: { ...ui.terrain, rayon } })} />}
        <span className="discret">{ui.terrain.forme === 'polygone' ? 'Point par point, double-clic ou Entrée pour fermer' : TERRAINS.find((t) => t.id === ui.terrain.type)?.desc}</span>
      </>
    );
    case 'brouillard': return (
      <>
        <label className="combat-mini"><input type="checkbox" checked={ctl.etat.brouillard.actif}
          onChange={(ev) => ctl.faire((e) => ({ ...e, brouillard: { ...e.brouillard, actif: ev.target.checked } }))} />Actif</label>
        <select value={ui.brouillard.reveler ? 'r' : 'c'} onChange={(ev) => regler({ brouillard: { ...ui.brouillard, reveler: ev.target.value === 'r' } })}>
          <option value="r">Révéler</option><option value="c">Cacher</option>
        </select>
        <Nombre titre="Pinceau" v={ui.brouillard.rayon} min={0} max={10} onChange={(rayon) => regler({ brouillard: { ...ui.brouillard, rayon } })} />
        <button className="btn btn-petit" onClick={() => ctl.faire((e) => ({ ...e, brouillard: { ...e.brouillard, cases: {} } }))}>Tout cacher</button>
        <button className="btn btn-petit" onClick={() => ctl.faire((e) => revelerParLaVue(e, TERRAINS))} title="Révèle ce que voient les PJ et alliés">Vue des PJ</button>
        <button className="btn btn-petit" onClick={() => ctl.faire((e) => ({ ...e, brouillard: { ...e.brouillard, actif: false } }))}>Tout révéler</button>
      </>
    );
    case 'attaque': return (
      <>
        <select value={ui.attaque} onChange={(ev) => regler({ attaque: ev.target.value as 'melee' | 'distance' })}>
          <option value="melee">Corps à corps (2 cases)</option><option value="distance">Distance (8 cases)</option>
        </select>
        <span className="discret">{ui.selection == null ? 'Choisis d’abord l’attaquant' : 'Clique sur la cible'}</span>
      </>
    );
    case 'sort': {
      const s = ctl.etat.sorts.find((x) => x.id === ui.sort?.id);
      return <span className="discret">✦ {s?.nom} : clic pour lancer{s?.origine === 'point' && ['cone', 'ligne', 'rectangle'].includes(s.forme) ? ', molette pour tourner' : ''}, Échap pour annuler</span>;
    }
    case 'mesure': return <span className="discret">Glisser d’une case à l’autre (1 case = 1,5 m)</span>;
    default: return <span className="discret">Clic : choisir · glisser : déplacer · clic droit ou Alt : panoramique · molette : zoom</span>;
  }
}

export function BarreOutils({ ctl }: { ctl: Controleur }) {
  const { etat: e, ui, faire, regler } = ctl;
  const ro = ctl.lectureSeule;
  return (
    <div className="combat-barre">
      <div className="combat-barre-ligne">
        {!ro && OUTILS.map(([id, ic, titre]) => (
          <button key={id} className={`combat-outil ${ui.outil === id ? 'actif' : ''}`} title={titre} onClick={() => regler({ outil: id, sort: null })}>{ic}</button>
        ))}
        {!ro && <span className="combat-sep" />}
        {!ro && <button className="combat-outil" title="Annuler (Ctrl+Z)" disabled={!ctl.histo.passe.length} onClick={ctl.annuler}>↶</button>}
        {!ro && <button className="combat-outil" title="Rétablir (Ctrl+Y)" disabled={!ctl.histo.futur.length} onClick={ctl.retablir}>↷</button>}
        <span style={{ flex: 1 }} />
        {e.combat.actif && <strong className="combat-round">Round {e.combat.round}</strong>}
        {!ro && !e.combat.actif && <button className="btn btn-petit btn-principal" disabled={!e.jetons.length} onClick={() => faire((x) => debuterCombat(x, Math.random))}>⚔ Lancer l’initiative</button>}
        {!ro && e.combat.actif && <button className="btn btn-petit btn-principal" onClick={() => faire(tourSuivant)}>Tour suivant ▸</button>}
        {!ro && e.combat.actif && <button className="btn btn-petit" onClick={() => faire(finirCombat)}>Fin du combat</button>}
      </div>
      {!ro && <div className="combat-barre-ligne combat-reglages"><Reglages ctl={ctl} /></div>}
    </div>
  );
}
