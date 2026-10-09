// Fiche d'un personnage : en-tête (portrait, identité, résumé calculé), onglets, actions.
// Chaque onglet est dans fiche/ ; les valeurs dérivées viennent du système de règles (R.calculer).
import { useMemo, useState } from 'react';
import type { Personnage, SortePersonnage } from '../../noyau/contrat';
import type { SystemeRegles } from '../../noyau/regles';
import { aUneFiche } from '../../noyau/regles';
import { Champ, Onglets } from '../../interface/composants';
import { ONGLETS, SORTES, avecStatsCalculees, ongletsVisibles, type Onglet } from './logique';
import { Identite } from './fiche/Identite';
import { Caracteristiques } from './fiche/Caracteristiques';
import { Combat } from './fiche/Combat';
import { Progression } from './fiche/Progression';
import { Magie } from './fiche/Magie';
import { Inventaire } from './fiche/Inventaire';
import { Histoire } from './fiche/Histoire';

interface Props {
  perso: Personnage;
  R: SystemeRegles;
  role: 'mj' | 'joueurs';
  lectureSeule: boolean;
  urlPortrait: string | null;
  maj(f: (p: Personnage) => Personnage): void;
  onPortrait(): void;
  onMontrer(): void;
  onSupprimer(): void;
  onAvatar(): void;
}

const CLE_ONGLET = 'jdr.perso.onglet';
const lireOnglet = (): Onglet => { try { return (localStorage.getItem(CLE_ONGLET) as Onglet) || 'identite'; } catch { return 'identite'; } };

export function Fiche({ perso: p, R, role, lectureSeule, urlPortrait, maj: majBrut, onPortrait, onMontrer, onSupprimer, onAvatar }: Props) {
  const [onglet, setOnglet] = useState<Onglet>(lireOnglet);
  const visibles = ongletsVisibles(p, R, role);
  const actif = visibles.includes(onglet) ? onglet : visibles[0];
  const choisir = (o: Onglet) => { setOnglet(o); try { localStorage.setItem(CLE_ONGLET, o); } catch { /* navigation privée */ } };
  // Toute modification repasse par le calcul : CA, attaque et niveau suivent l'équipement et les classes.
  const maj = (f: (x: Personnage) => Personnage) => majBrut((x) => avecStatsCalculees(f(x), R));
  const calcul = useMemo(() => (aUneFiche(R) ? R.calculer(p) : null), [p, R]);
  const mj = (p.mj ?? {}) as { cache?: boolean };
  const props = { p, R, role, lectureSeule, maj };
  const resume = calcul
    ? [`Niv. ${calcul.niveau}`, `CA ${calcul.derives.find((d) => d.cle === 'ca')?.texte}`, `PV ${String(p.combat.stats.pv ?? '?')}/${String(p.combat.stats.pvMax ?? '?')}`, `Init. ${calcul.derives.find((d) => d.cle === 'initiative')?.texte}`]
    : [R.resume(p.combat.stats)];

  return (
    <div className="carte-ui pile perso-fiche">
      <div className="ligne" style={{ alignItems: 'flex-start', gap: 16 }}>
        <button className="perso-portrait" onClick={onPortrait} disabled={lectureSeule} title="Choisir un portrait">
          {urlPortrait ? <img src={urlPortrait} alt="" /> : <span>{p.nom.slice(0, 1).toUpperCase()}</span>}
        </button>
        <div className="pile" style={{ flex: 1, minWidth: 200, gap: 10 }}>
          <fieldset disabled={lectureSeule} className="perso-champs">
            <Champ libelle="Nom">
              <input value={p.nom} onChange={(e) => maj((x) => ({ ...x, nom: e.target.value }))} />
            </Champ>
            <Champ libelle="Sorte">
              <select value={p.sorte} onChange={(e) => maj((x) => ({ ...x, sorte: e.target.value as SortePersonnage }))}>
                {SORTES.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
              </select>
            </Champ>
            <Champ libelle="Rôle ou métier">
              <input value={p.role ?? ''} placeholder="capitaine de la garde, herboriste…" onChange={(e) => maj((x) => ({ ...x, role: e.target.value }))} />
            </Champ>
            {p.sorte === 'pj' && (
              <Champ libelle="Joueur">
                <input value={p.joueur ?? ''} onChange={(e) => maj((x) => ({ ...x, joueur: e.target.value }))} />
              </Champ>
            )}
          </fieldset>
          {(role === 'mj' || visibles.includes('caracs')) && <div className="perso-resume">{resume.map((r) => <span key={r}>{r}</span>)}</div>}
        </div>
      </div>

      <Onglets onglets={ONGLETS.filter(([id]) => visibles.includes(id)).map(([id, l]) => [id, l] as [Onglet, string])} actif={actif} onChoix={choisir} />

      {actif === 'identite' && <Identite {...props} />}
      {actif === 'caracs' && calcul && aUneFiche(R) && <Caracteristiques {...props} R={R} calcul={calcul} />}
      {actif === 'combat' && <Combat {...props} calcul={calcul} />}
      {actif === 'progression' && <Progression {...props} calcul={calcul} />}
      {actif === 'magie' && <Magie {...props} />}
      {actif === 'inventaire' && <Inventaire {...props} calcul={calcul} />}
      {actif === 'histoire' && <Histoire {...props} />}

      {role === 'mj' && !lectureSeule && p.sorte !== 'pj' && actif === 'combat' && (
        <button className="btn btn-petit" style={{ alignSelf: 'flex-start' }}
          title="Recalcule caractéristiques, PV, CA, dégâts et niveau d’après le rôle, la description et la sorte"
          onClick={() => window.confirm('Remplacer les statistiques par celles du rôle ?') && maj((x) => ({ ...x, combat: { ...x.combat, stats: { ...R.statsPourProfil({ role: x.role ?? x.nom, description: x.notes, sorte: x.sorte, antagoniste: !!(x.mj as { antagoniste?: boolean } | undefined)?.antagoniste, graine: x.id }) } } }))}>
          Stats selon le rôle
        </button>
      )}

      {!lectureSeule && (
        <div className="ligne">
          <button className="btn btn-mj" onClick={onMontrer} disabled={!!mj.cache}>Montrer aux joueurs</button>
          <button className="btn" onClick={onAvatar}>{p.apparence ? 'Modifier l’avatar 3D' : 'Créer l’avatar 3D'}</button>
          <span style={{ flex: 1 }} />
          <button className="btn btn-danger" onClick={onSupprimer}>Supprimer</button>
        </div>
      )}
      {aUneFiche(R) && R.catalogue.source && role === 'mj' && <p className="discret perso-source">{R.catalogue.source}</p>}
    </div>
  );
}
