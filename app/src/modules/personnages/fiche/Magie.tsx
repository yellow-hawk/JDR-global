// Onglet Magie : résumé du profil de l'Atelier de tracé (rang, signes connus, grimoire) et accès au module Magie.
import { emettre } from '../../../noyau/bus';
import type { PropsOnglet } from './types';

export function Magie({ p, role }: PropsOnglet) {
  const m = (p.magie ?? null) as { rang?: number; signes?: string[]; emplacements?: number; grimoire?: { nom?: string }[] } | null;
  return (
    <div className="pile">
      {m ? (
        <>
          <div className="perso-derives">
            <div className="perso-derive"><span>Rang</span><strong>{m.rang ?? 1}</strong></div>
            <div className="perso-derive"><span>Signes connus</span><strong>{m.signes?.length ?? 0}</strong></div>
            <div className="perso-derive"><span>Grimoire</span><strong>{m.grimoire?.length ?? 0} / {m.emplacements ?? 0}</strong></div>
          </div>
          {m.grimoire?.length ? <p className="discret">Sorts : {m.grimoire.map((s) => s.nom).filter(Boolean).join(', ')}</p> : null}
        </>
      ) : <p className="discret">Ce personnage ne pratique pas encore la magie des sceaux.</p>}
      {role === 'mj' && (
        <button className="btn btn-petit" style={{ alignSelf: 'flex-start' }} onClick={() => emettre('naviguer', { page: 'magie', cible: p.id })}>
          {m ? 'Ouvrir dans l’Atelier de tracé' : 'Lui apprendre la magie (Atelier)'}
        </button>
      )}
      <p className="discret">Bientôt : un arbre de magie relie l’apprentissage des Cœurs, Rameaux et Nœuds à la progression.</p>
    </div>
  );
}
