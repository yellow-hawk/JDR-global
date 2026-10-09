// Props communes aux onglets de la fiche.
import type { Personnage } from '../../../noyau/contrat';
import type { SystemeRegles } from '../../../noyau/regles';

export interface PropsOnglet {
  p: Personnage;
  R: SystemeRegles;
  role: 'mj' | 'joueurs';
  lectureSeule: boolean;
  maj(f: (p: Personnage) => Personnage): void;
}

/** Met à jour une partie de la fiche détaillée (`personnage.fiche`). */
export const majFiche = <K extends keyof NonNullable<Personnage['fiche']>>(
  maj: PropsOnglet['maj'], cle: K, f: (v: NonNullable<Personnage['fiche']>[K] | undefined) => NonNullable<Personnage['fiche']>[K],
) => maj((x) => ({ ...x, fiche: { ...(x.fiche ?? {}), [cle]: f(x.fiche?.[cle]) } }));
