// Onglet Talents : arbres applicables (classe, aventurier, magie des sceaux), points disponibles,
// talents acquis / disponibles / verrouillés, acquisition et retrait.
import { useState } from 'react';
import type { SystemeAvecFiche } from '../../../noyau/regles';
import {
  acquerir, arbresPour, dependants, etatTalent, pointsTalent, retirer, toutRendre, type ArbreTalents, type NoeudTalent,
} from '../../../noyau/talents';
import { emettre } from '../../../noyau/bus';
import type { PropsOnglet } from './types';

const CIBLES: Record<string, string> = {
  ca: 'CA', attaque: 'attaque', degats: 'dégâts', initiative: 'initiative', vitesse: 'vitesse (cases)', pvParNiveau: 'PV par niveau',
  dd: 'DD des sorts', 'attaque.sort': 'attaque de sort', 'degats.sort': 'dégâts des sorts',
};
const texteEffet = (c: string, v: number) => `${v >= 0 ? '+' : ''}${v} ${CIBLES[c] ?? c.replace('competence.', '').replace('sauvegarde.', 'sauv. ').replace('carac.', '').toUpperCase()}`;

export function Talents({ p, R, role, lectureSeule, maj }: PropsOnglet & { R: SystemeAvecFiche }) {
  const parNiveau = R.talents.pointsParNiveau;
  const arbres = arbresPour(p);
  const [actif, setActif] = useState<string>(arbres[0]?.id ?? '');
  const [choisi, setChoisi] = useState<NoeudTalent | null>(null);
  const pts = pointsTalent(p, parNiveau);
  const arbre: ArbreTalents | undefined = arbres.find((a) => a.id === actif) ?? arbres[0];
  const peutModifier = !lectureSeule && (role === 'mj' || p.sorte === 'pj');
  const rangs = arbre ? Math.max(...arbre.branches.flatMap((b) => b.noeuds.map((n) => n.rang)), 1) : 0;

  if (!arbres.length) return <p className="discret">Aucun arbre de talents pour ce personnage : choisissez une classe dans l’onglet Progression.</p>;

  const etatChoisi = choisi ? etatTalent(p, choisi, parNiveau) : null;
  const deps = choisi ? dependants(p, choisi.id) : [];

  return (
    <div className="pile">
      <div className="ligne">
        <strong className={pts.restants > 0 ? 'perso-points' : ''}>Points de talent : {pts.restants} / {pts.total}</strong>
        <span className="discret">({parNiveau} par niveau)</span>
        <span style={{ flex: 1 }} />
        {role === 'mj' && !lectureSeule && pts.depenses > 0 && (
          <button className="btn btn-petit" onClick={() => window.confirm('Rendre tous les points de talent ? La magie apprise par les talents sera retirée.') && maj((x) => toutRendre(x))}>Rendre tous les points</button>
        )}
      </div>
      <div className="ligne">
        {arbres.map((a) => (
          <button key={a.id} className={`btn btn-petit ${a.id === arbre?.id ? 'btn-principal' : ''}`} onClick={() => { setActif(a.id); setChoisi(null); }}>
            {a.nom} ({(p.fiche?.progression?.talents ?? []).filter((t) => t.startsWith(`${a.id}.`)).length})
          </button>
        ))}
      </div>
      {arbre?.texte && <p className="discret">{arbre.texte}</p>}

      {arbre && (
        <div className="perso-arbre" style={{ gridTemplateColumns: `repeat(${arbre.branches.length}, minmax(150px, 1fr))` }}>
          {arbre.branches.map((b) => <div key={b.id} className="perso-branche-titre" style={{ borderColor: b.couleur }}>{b.nom}</div>)}
          {Array.from({ length: rangs }, (_, r) => arbre.branches.map((b) => {
            const n = b.noeuds.find((x) => x.rang === r + 1);
            if (!n) return <div key={`${b.id}-${r}`} />;
            const e = etatTalent(p, n, parNiveau);
            return (
              <button key={n.id} className={`perso-talent perso-talent-${e.etat} ${n.rang === 1 ? 'perso-talent-racine' : ''} ${choisi?.id === n.id ? 'perso-talent-choisi' : ''}`}
                style={{ borderColor: e.etat === 'acquis' ? b.couleur : undefined }} title={e.raison ?? n.texte} onClick={() => setChoisi(n)}>
                <strong>{n.nom}</strong>
                <small>{e.etat === 'acquis' ? '✓ acquis' : e.raison ?? `${n.cout} pt · niv. ${n.niveau}`}</small>
              </button>
            );
          }))}
        </div>
      )}

      {choisi && etatChoisi && (
        <div className="carte-ui pile perso-talent-detail" style={{ gap: 6 }}>
          <div className="ligne"><strong>{choisi.nom}</strong><span className="discret">coût {choisi.cout} · niveau {choisi.niveau}</span></div>
          <p style={{ margin: 0 }}>{choisi.texte}</p>
          {choisi.effets?.length ? <p className="discret" style={{ margin: 0 }}>Effets sur la fiche : {choisi.effets.map((x) => texteEffet(x.cible, x.valeur)).join(', ')}</p> : null}
          {choisi.magie?.signes?.length ? <p className="discret" style={{ margin: 0 }}>Signes appris : {choisi.magie.signes.join(', ')}{choisi.magie.rang ? ` · rang ${choisi.magie.rang}` : ''}</p> : null}
          {etatChoisi.raison && <p className="perso-erreur" style={{ margin: 0 }}>Verrouillé : {etatChoisi.raison}</p>}
          {peutModifier && (
            <div className="ligne">
              {etatChoisi.etat === 'disponible' && (
                <button className="btn btn-principal btn-petit" onClick={() => {
                  maj((x) => acquerir(x, choisi.id, parNiveau));
                  emettre('message', { texte: `${p.nom} apprend « ${choisi.nom} ».`, sorte: 'succes' });
                }}>Acquérir ({choisi.cout} pt)</button>
              )}
              {etatChoisi.etat === 'acquis' && (
                <button className="btn btn-petit" disabled={deps.length > 0} title={deps.length ? `Requis par ${deps.map((d) => d.nom).join(', ')}` : undefined}
                  onClick={() => maj((x) => retirer(x, choisi.id))}>Retirer</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
