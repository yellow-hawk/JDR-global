// Fenêtre de création / modification d'un sort de la table.
import { useState } from 'react';
import { ajouterSort } from '../moteur';
import type { Effet, Gabarit } from '../moteur';
import { PARTICULES } from '../rendu';
import { COULEURS_ZONE, NOMS_FORMES } from './types';
import type { Controleur } from './types';

const VIDE: Omit<Gabarit, 'id'> = {
  nom: 'Nouveau sort', forme: 'cercle', rayon: 3, largeur: 1, portee: 20, origine: 'point', effets: [],
  couleur: 'rgba(155,89,182,0.5)', particule: null, concentration: false, desc: '',
};
const NOMS_PARTICULES: Record<string, string> = { feu: 'Feu', glace: 'Glace', foudre: 'Foudre', sacre: 'Sacré', tenebres: 'Ténèbres' };

export function ModaleSort({ ctl, sort, fermer }: { ctl: Controleur; sort: Gabarit | null; fermer: () => void }) {
  const [s, setS] = useState<Omit<Gabarit, 'id'>>(sort ?? VIDE);
  const maj = (p: Partial<Gabarit>) => setS((x) => ({ ...x, ...p }));
  const majEffet = (i: number, f: Effet) => maj({ effets: s.effets.map((x, k) => (k === i ? f : x)) });
  const valider = () => {
    ctl.faire((e) => (sort ? { ...e, sorts: e.sorts.map((x) => (x.id === sort.id ? { ...s, id: sort.id } : x)) } : ajouterSort(e, s)));
    fermer();
  };
  return (
    <div className="combat-voile" onClick={(ev) => ev.target === ev.currentTarget && fermer()}>
      <div className="combat-modale">
        <h2>{sort ? 'Modifier le sort' : 'Nouveau sort'}</h2>
        <label className="combat-champ">Nom<input value={s.nom} onChange={(ev) => maj({ nom: ev.target.value })} /></label>
        <label className="combat-champ">Description<input value={s.desc} onChange={(ev) => maj({ desc: ev.target.value })} /></label>
        <div className="combat-grille3">
          <label className="combat-champ">Forme<select value={s.forme} onChange={(ev) => maj({ forme: ev.target.value as Gabarit['forme'] })}>
            {(['cercle', 'cone', 'ligne', 'carre', 'rectangle'] as const).map((f) => <option key={f} value={f}>{NOMS_FORMES[f]}</option>)}
          </select></label>
          <label className="combat-champ">Rayon<input type="number" min={1} value={s.rayon} onChange={(ev) => maj({ rayon: Math.max(1, +ev.target.value || 1) })} /></label>
          <label className="combat-champ">Largeur<input type="number" min={1} value={s.largeur ?? 1} onChange={(ev) => maj({ largeur: Math.max(1, +ev.target.value || 1) })} /></label>
          <label className="combat-champ">Origine<select value={s.origine} onChange={(ev) => maj({ origine: ev.target.value as Gabarit['origine'] })}>
            <option value="point">Point visé</option><option value="soi">Soi</option>
          </select></label>
          <label className="combat-champ">Portée<input type="number" min={0} value={s.portee} onChange={(ev) => maj({ portee: Math.max(0, +ev.target.value || 0) })} /></label>
          <label className="combat-champ">Couleur<select value={s.couleur} onChange={(ev) => maj({ couleur: ev.target.value })}>
            {COULEURS_ZONE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            {!COULEURS_ZONE.some(([v]) => v === s.couleur) && <option value={s.couleur}>Actuelle</option>}
          </select></label>
          <label className="combat-champ">Particules<select value={s.particule ?? ''} onChange={(ev) => maj({ particule: ev.target.value || null })}>
            <option value="">Aucune</option>{PARTICULES.map((p) => <option key={p} value={p}>{NOMS_PARTICULES[p] ?? p}</option>)}
          </select></label>
          <label className="combat-champ combat-coche"><input type="checkbox" checked={s.concentration} onChange={(ev) => maj({ concentration: ev.target.checked })} />Concentration</label>
        </div>
        <h3>Effets</h3>
        {s.effets.map((f, i) => (
          <div key={i} className="ligne">
            <select value={f.type} onChange={(ev) => majEffet(i, ev.target.value === 'condition' ? { type: 'condition', valeur: 'Aveuglé' } : { type: ev.target.value as 'degats' | 'soin', valeur: 10 })}>
              <option value="degats">Dégâts</option><option value="soin">Soins</option><option value="condition">État</option>
            </select>
            {f.type === 'condition'
              ? <input value={f.valeur} onChange={(ev) => majEffet(i, { ...f, valeur: ev.target.value })} />
              : <input type="number" value={f.valeur} onChange={(ev) => majEffet(i, { ...f, valeur: +ev.target.value || 0 })} />}
            {f.type === 'degats' && <input placeholder="nature" value={f.nature ?? ''} onChange={(ev) => majEffet(i, { ...f, nature: ev.target.value })} />}
            <button className="btn btn-petit btn-danger" onClick={() => maj({ effets: s.effets.filter((_, k) => k !== i) })}>×</button>
          </div>
        ))}
        <button className="btn btn-petit" onClick={() => maj({ effets: [...s.effets, { type: 'degats', valeur: 10, nature: '' }] })}>+ Effet</button>
        <div className="ligne combat-modale-pied">
          <button className="btn" onClick={fermer}>Annuler</button>
          <button className="btn btn-principal" onClick={valider}>Valider</button>
        </div>
      </div>
    </div>
  );
}
