// Réglages d'affichage : grille, opacités, vision, portée de déplacement, sons, nettoyage des zones.
import { supprimerZones } from '../moteur';
import type { EtatTable } from '../moteur';
import type { Controleur } from './types';

function Curseur({ libelle, v, onChange }: { libelle: string; v: number; onChange: (n: number) => void }) {
  return <label className="combat-curseur">{libelle}<input type="range" min={0} max={1} step={0.05} value={v} onChange={(ev) => onChange(+ev.target.value)} /><span>{Math.round(v * 100)} %</span></label>;
}

export function Affichage({ ctl }: { ctl: Controleur }) {
  const { etat: e } = ctl;
  const maj = (f: (x: EtatTable) => EtatTable) => ctl.faire(f, true);
  const op = (k: keyof EtatTable['opacites']) => (n: number) => maj((x) => ({ ...x, opacites: { ...x.opacites, [k]: n } }));
  return (
    <div className="combat-onglet">
      <section className="combat-bloc">
        <h3>Grille</h3>
        <div className="ligne">
          <select value={e.grille.type} onChange={(ev) => ctl.faire((x) => ({ ...x, grille: { ...x.grille, type: ev.target.value as 'carree' | 'hex' } }))}>
            <option value="carree">Carrée</option><option value="hex">Hexagonale</option>
          </select>
          <label className="combat-mini">Case (px)<input type="number" min={10} max={200} value={e.grille.taille}
            onChange={(ev) => maj((x) => ({ ...x, grille: { ...x.grille, taille: Math.max(10, Math.min(200, +ev.target.value || 40)) } }))} /></label>
        </div>
        {e.fond?.pxCase && <p className="discret">Carte calée : une case = {e.fond.pxCase.toFixed(1)} px de l’image (1,5 m).</p>}
      </section>
      <section className="combat-bloc">
        <h3>Opacités</h3>
        <Curseur libelle="Carte" v={e.opacites.carte} onChange={op('carte')} />
        <Curseur libelle="Jetons" v={e.opacites.jetons} onChange={op('jetons')} />
        <Curseur libelle="Sorts" v={e.opacites.sorts} onChange={op('sorts')} />
        <Curseur libelle="Terrains" v={e.opacites.terrains} onChange={op('terrains')} />
      </section>
      <section className="combat-bloc">
        <h3>Règles d’affichage</h3>
        <label className="combat-coche"><input type="checkbox" checked={e.porteeDeplacement} onChange={(ev) => ctl.faire((x) => ({ ...x, porteeDeplacement: ev.target.checked }))} />Portée de déplacement en combat (et contrôle des déplacements)</label>
        <label className="combat-coche"><input type="checkbox" checked={e.vision} onChange={(ev) => ctl.faire((x) => ({ ...x, vision: ev.target.checked }))} />La vue des PJ révèle le brouillard en se déplaçant</label>
        <label className="combat-coche"><input type="checkbox" checked={ctl.ui.sons} onChange={(ev) => ctl.regler({ sons: ev.target.checked })} />Sons</label>
      </section>
      <section className="combat-bloc">
        <h3>Zones ({e.zones.length})</h3>
        <div className="combat-zones">
          {e.zones.map((z) => (
            <div key={z.id} className={`combat-jeton-ligne ${ctl.ui.zoneChoisie === z.id ? 'choisi' : ''}`} onClick={() => ctl.regler({ zoneChoisie: z.id, selection: null })}>
              <span className="combat-pastille" style={{ background: z.couleur }} />
              <span className="combat-nom">{z.nom || z.forme}</span><span className="discret">{z.categorie === 'terrain' ? 'terrain' : 'sort'}</span>
            </div>
          ))}
        </div>
        <div className="ligne">
          <button className="btn btn-petit" onClick={() => ctl.faire((x) => supprimerZones(x, 'sort'))}>Effacer les sorts</button>
          <button className="btn btn-petit" onClick={() => ctl.faire((x) => supprimerZones(x, 'terrain'))}>Effacer les terrains</button>
        </div>
      </section>
    </div>
  );
}
