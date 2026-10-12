import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, nouveauPersonnage, type Campagne } from '../../noyau/contrat';
import { regles } from '../../noyau/regles';
import { dynastieDepuisCivilisation } from '../genealogie';
import * as J from './html/jeu';
import * as M from './html/monde';
import { campagneDuLivre, choixParDefaut, elementsDe, retenus } from './selection';

const R = regles('dnd5e');
const civ = { cle: 1, nom: 'les Valdrins', villes: [{ nom: 'Valdor', capitale: true }], traits: ['fiers'], coutumes: [], relations: [], histoire: [{ an: 12, texte: 'Fondation' }], noms: ['Ari', 'Bel', 'Cor', 'Dun'], anActuel: 300, souverain: 'le roi Bel', titres: ['le roi', 'la reine'], fondateur: 'Ari',
  calendrier: { joursParAn: 60, mois: [{ nom: 'Givre', jours: 30 }, { nom: 'Sève', jours: 30 }], fetes: [{ nom: 'Dégel', mois: 1, jour: 2, texte: 'On danse.' }] }, mj: { notes: 'Le roi est un imposteur.' } };

function campagne(): Campagne {
  const c = nouvelleCampagne('Les Ombres de Valdor');
  const pj = { ...nouveauPersonnage('Morgran', 'pj', 'dnd5e', R.statsParDefaut()), mj: { notes: 'Fils caché du roi' } };
  const espion = { ...nouveauPersonnage('Sylas', 'pnj', 'dnd5e', R.statsParDefaut()), mj: { cache: true } };
  return {
    ...c, personnages: [pj, espion],
    univers: [{ id: 'u1', nom: 'Monde', sorte: 'fait-main', civilisations: { peuples: [civ], monde: null } }],
    campagne: { ...c.campagne, univers: { type: 'univers', id: 'u1' } },
    quetes: [{ id: 'q1', titre: 'La couronne volée', source: { sorte: 'fait-main' }, lieux: [], personnages: [{ type: 'personnage', id: pj.id }], etapes: [{ titre: 'Le bal', joueurs: 'Une invitation.', mj: { notes: 'Piège' } }], mj: {} }],
    familles: [dynastieDepuisCivilisation(civ, { an: 300 })],
  };
}

describe('livre de campagne', () => {
  it('sélection : éléments par section, exclusions, version joueurs sans éléments cachés', () => {
    const c = campagne();
    expect(elementsDe(c, 'personnages').map((x) => x.libelle)).toEqual(['Morgran', 'Sylas']);
    const choix = { ...choixParDefaut(), exclus: [c.personnages[0].id] };
    expect(retenus(c, choix, 'personnages').map((x) => x.libelle)).toEqual(['Sylas']);
    const joueurs = campagneDuLivre(c, { ...choix, version: 'joueurs' });
    expect(elementsDe(joueurs, 'personnages').map((x) => x.libelle)).toEqual(['Morgran']);
    expect(retenus(c, { ...choixParDefaut(), version: 'joueurs' }, 'rencontres')).toEqual([]);
  });

  it('parties : peuples, calendriers, quêtes, fiches, généalogie ; secrets seulement en version MJ', () => {
    const c = campagne();
    const peuples = M.peuples(c, new Set(['peuple:u1:1']))!;
    expect(peuples.html).toContain('Valdor');
    expect(peuples.html).toContain('imposteur');
    const cal = M.calendriers(c, new Set(['calendrier:u1:1']))!;
    expect(cal.html).toContain('Givre');
    expect(cal.html).toContain('class="fete"');
    const q = J.quetes(c, new Set(['q1']))!;
    expect(q.html).toContain('Le bal');
    expect(q.html).toContain('Piège');
    const fiches = J.personnages(c, new Set(c.personnages.map((p) => p.id)), R, new Map())!;
    expect(fiches.html).toContain('Morgran');
    expect(J.genealogies(c, new Set([c.familles[0].id]))!.html).toContain('<svg');
    // Version joueurs : plus de secrets.
    const j = campagneDuLivre(c, { ...choixParDefaut(), version: 'joueurs' });
    expect(M.peuples(j, new Set(['peuple:u1:1']))!.html).not.toContain('imposteur');
    expect(J.quetes(j, new Set(['q1']))!.html).not.toContain('Piège');
    const couverture = M.couverture(c, [peuples, q], 'mj');
    expect(couverture).toContain('Les Ombres de Valdor');
    expect(couverture).toContain('href="#peuples"');
  });
});
