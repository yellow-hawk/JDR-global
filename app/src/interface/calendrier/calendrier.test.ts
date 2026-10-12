import { describe, expect, it } from 'vitest';
import type { Calendrier } from '../../noyau/contrat';
import { anneeHtml, dateDuJour, grilleMois, jourAbsolu, jourDeLaSemaine, semaineDe } from './logique';

const cal: Calendrier = { joursParAn: 25, mois: [{ nom: 'Givre', jours: 10 }, { nom: 'Sève', jours: 15 }], fetes: [{ nom: 'Dégel', mois: 1, jour: 3 }], semaine: ['Un', 'Deux', 'Trois', 'Quatre', 'Cinq'] };

describe('calendrier', () => {
  it('semaines continues d’un mois et d’une année à l’autre', () => {
    expect(jourDeLaSemaine(cal, { an: 0, mois: 1, jour: 1 })).toBe(0);
    expect(jourDeLaSemaine(cal, { an: 0, mois: 2, jour: 1 })).toBe(0); // 10 jours = 2 semaines pile
    expect(jourDeLaSemaine(cal, { an: 1, mois: 1, jour: 1 })).toBe(0); // 25 = 5 semaines
    const g = grilleMois(cal, 0, 2);
    expect(g).toHaveLength(3);
    expect(g.flat().filter(Boolean)).toHaveLength(15);
    expect(semaineDe(cal, { an: 0, mois: 1, jour: 9 }).map((d) => `${d.mois}/${d.jour}`)).toEqual(['1/6', '1/7', '1/8', '1/9', '1/10']);
    expect(dateDuJour(cal, jourAbsolu(cal, { an: 3, mois: 2, jour: 7 }))).toEqual({ an: 3, mois: 2, jour: 7 });
    // Semaine par défaut (7 jours) : un mois de 10 jours décale le suivant.
    const sept = { ...cal, semaine: undefined };
    expect(jourDeLaSemaine(sept, { an: 0, mois: 2, jour: 1 })).toBe(3);
    expect(anneeHtml(cal, 0)).toContain('class="fete"');
  });
});
