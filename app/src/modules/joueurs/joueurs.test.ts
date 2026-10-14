import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, nouveauPersonnage, type Campagne } from '../../noyau/contrat';
import { regles } from '../../noyau/regles';
import { ajouterMessage, avecJeton, avecNotesJoueur, distantsDe, ficheDuJoueur, lienJoueur, marquerLusMj, nonLusMj, notesJoueur, persoDuJeton, retirerMessage } from './logique';

const R = regles('dnd5e');

describe('joueurs à distance', () => {
  it('jeton personnel, lien, messages, notes', () => {
    const p = { ...nouveauPersonnage('Morgran', 'pj', 'dnd5e', R.statsParDefaut()), mj: { notes: 'Fils caché du roi' } };
    let c: Campagne = { ...nouvelleCampagne('T'), personnages: [p] };
    c = avecJeton(c, p.id);
    const j = distantsDe(c)[p.id].jeton;
    expect(j).toMatch(/^[a-z2-9]{16}$/);
    expect(avecJeton(c, p.id)).toBe(c); // déjà un jeton : rien ne change
    expect(distantsDe(avecJeton(c, p.id, true))[p.id].jeton).not.toBe(j);
    expect(persoDuJeton(c, j)?.nom).toBe('Morgran');
    expect(lienJoueur('https://abc.trycloudflare.com/', 'WEXZB', j)).toBe(`https://abc.trycloudflare.com/?ecran=joueurs&salon=WEXZB&joueur=${j}`);
    c = ajouterMessage(c, p.id, 'Tu reconnais le blason.');
    expect(distantsDe(c)[p.id].messages.map((m) => m.texte)).toEqual(['Tu reconnais le blason.']);
    c = retirerMessage(c, p.id, distantsDe(c)[p.id].messages[0].id);
    expect(distantsDe(c)[p.id].messages).toEqual([]);
    // Message du joueur au MJ : non lu jusqu'à ce que le MJ l'ait vu.
    c = ajouterMessage(c, p.id, 'Je fouille le coffre en douce.', null, undefined, 'joueur');
    expect(distantsDe(c)[p.id].messages[0].de).toBe('joueur');
    expect(nonLusMj(distantsDe(c)[p.id])).toBe(1);
    c = marquerLusMj(c, p.id);
    expect(nonLusMj(distantsDe(c)[p.id])).toBe(0);
    c = retirerMessage(c, p.id, distantsDe(c)[p.id].messages[0].id);
    c = avecNotesJoueur(c, p.id, 'Ne pas faire confiance à Sylas');
    expect(notesJoueur(c.personnages[0])).toBe('Ne pas faire confiance à Sylas');
  });

  it('la fiche envoyée au joueur ne contient rien du MJ', () => {
    const p = { ...nouveauPersonnage('Morgran', 'pj', 'dnd5e', R.statsParDefaut()), mj: { notes: 'Fils caché du roi' } };
    const f = ficheDuJoueur(p, R);
    expect(f.html).toContain('Morgran');
    expect(f.html).not.toContain('Fils caché');
  });
});
