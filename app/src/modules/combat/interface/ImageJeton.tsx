// Image d'un jeton ou d'un modèle de la bibliothèque : image importée (recadrée en rond), icône de créature, ou rien.
import { choisirFichier } from '../../../noyau/stockage';
import { ICONES, iconeDe } from '../moteur';
import { portraitData } from './images';

export interface ImagePatch { portrait?: string | null; icone?: string | null }

/** Libellé lisible d'une icône : le premier mot de son motif (« gobelin|goblin… » → « gobelin »). */
const libelle = (motif: RegExp) => motif.source.split('|')[0];

export function ImageJeton({ nom, portrait, icone, onChange, tous }: {
  nom: string; portrait?: string | null; icone?: string | null;
  onChange(p: ImagePatch): void;
  /** Bouton « pour tous les … » : nombre d'autres exemplaires et action. */
  tous?: { nombre: number; nom: string; appliquer(): void };
}) {
  const vue = iconeDe({ nom, icone });
  const importer = async () => {
    const f = await choisirFichier('image/png,image/jpeg,image/webp');
    if (f) onChange({ portrait: await portraitData(f[0]) });
  };
  return (
    <div className="combat-image">
      <span className="combat-image-apercu">{portrait ? <img src={portrait} alt="" /> : vue ?? '—'}</span>
      <div className="combat-image-choix">
        <div className="ligne">
          <button className="btn btn-petit" onClick={() => void importer()}>Image…</button>
          <select value={icone === undefined ? '' : icone ?? 'aucune'} title="Icône affichée quand il n’y a pas d’image"
            onChange={(ev) => onChange({ icone: ev.target.value === '' ? undefined : ev.target.value === 'aucune' ? null : ev.target.value })}>
            <option value="">Icône : d’après le nom{iconeDe({ nom }) ? ` (${iconeDe({ nom })})` : ''}</option>
            {ICONES.map((i) => <option key={i.emoji} value={i.emoji}>{i.emoji} {libelle(i.motif)}</option>)}
            <option value="aucune">Aucune icône</option>
          </select>
          {portrait && <button className="btn btn-petit" onClick={() => onChange({ portrait: null })}>Retirer l’image</button>}
        </div>
        {tous && tous.nombre > 0 && (
          <button className="btn btn-petit" onClick={tous.appliquer}>Même image pour les {tous.nombre} autre(s) « {tous.nom} »</button>
        )}
      </div>
    </div>
  );
}
