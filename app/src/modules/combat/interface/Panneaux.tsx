// Colonne de droite : initiative, détail de la sélection, puis onglets.
import { Affichage } from './Affichage';
import { Des } from './Des';
import { Detail } from './Detail';
import { Initiative } from './Initiative';
import { Jetons } from './Jetons';
import { Journal } from './Journal';
import { Sorts } from './Sorts';
import type { Controleur, Onglet } from './types';

const ONGLETS: [Onglet, string, boolean][] = [
  ['jetons', 'Jetons', false], ['sorts', 'Sorts', true], ['des', 'Dés', false], ['journal', 'Journal', true], ['affichage', 'Affichage', true],
];

export function Panneaux({ ctl, mj }: { ctl: Controleur; mj: boolean }) {
  const onglet = ctl.ui.onglet === 'detail' ? 'jetons' : ctl.ui.onglet;
  return (
    <aside className="combat-droite">
      <Initiative ctl={ctl} mj={mj} />
      <Detail ctl={ctl} mj={mj} />
      <nav className="combat-onglets">
        {ONGLETS.filter(([, , mjSeul]) => mj || !mjSeul).map(([id, nom]) => (
          <button key={id} className={onglet === id ? 'actif' : ''} onClick={() => ctl.regler({ onglet: id })}>{nom}</button>
        ))}
      </nav>
      {onglet === 'jetons' && <Jetons ctl={ctl} mj={mj} />}
      {onglet === 'sorts' && mj && <Sorts ctl={ctl} />}
      {onglet === 'des' && <Des ctl={ctl} />}
      {onglet === 'journal' && mj && <Journal ctl={ctl} />}
      {onglet === 'affichage' && mj && <Affichage ctl={ctl} />}
    </aside>
  );
}
