// Barre d'outils du brouillard de guerre (MJ) : révéler / cacher au pinceau, taille, tout révéler / tout cacher, diffusion en direct.
import type { Brouillard } from '../../noyau/contrat';

interface Props {
  b: Brouillard;
  revele: boolean; setRevele(v: boolean): void;
  taille: number; setTaille(v: number): void;
  direct: boolean; setDirect(v: boolean): void;
  activer(v: boolean): void;
  toutReveler(): void;
  toutCacher(): void;
}

export function OutilsBrouillard(p: Props) {
  return (
    <div className="ligne cartes-outils-brouillard">
      <label className="ligne discret"><input type="checkbox" checked={p.b.actif} onChange={(e) => p.activer(e.target.checked)} /> Brouillard actif</label>
      <button className={`btn btn-petit ${p.revele ? 'btn-principal' : ''}`} onClick={() => p.setRevele(true)}>Révéler</button>
      <button className={`btn btn-petit ${!p.revele ? 'btn-principal' : ''}`} onClick={() => p.setRevele(false)}>Cacher</button>
      <span className="discret">Pinceau</span>
      <input type="range" min={1} max={20} step={0.5} value={p.taille} onChange={(e) => p.setTaille(Number(e.target.value))} aria-label="Taille du pinceau" />
      <button className="btn btn-petit" onClick={p.toutReveler}>Tout révéler</button>
      <button className="btn btn-petit" onClick={p.toutCacher}>Tout cacher</button>
      <label className="ligne discret" title="Chaque coup de pinceau met à jour l'écran joueurs"><input type="checkbox" checked={p.direct} onChange={(e) => p.setDirect(e.target.checked)} /> Écran joueurs en direct</label>
    </div>
  );
}
