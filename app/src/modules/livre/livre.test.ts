import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, nouveauPersonnage, nouvelleCarte, type Campagne, type Carte } from '../../noyau/contrat';
import { regles } from '../../noyau/regles';
import { dynastieDepuisCivilisation } from '../genealogie';
import * as J from './html/jeu';
import { categoriesDe } from './html/lieux';
import * as M from './html/monde';
import { campagneDuLivre, choixParDefaut, elementsDe, retenus } from './selection';

const R = regles('dnd5e');
const civ = { cle: 1, nom: 'les Valdrins', villes: [{ nom: 'Valdor', capitale: true, desc: 'Port fortifié.' }], traits: ['fiers'], coutumes: [], relations: [], histoire: [{ an: 12, texte: 'Fondation' }], noms: ['Ari', 'Bel', 'Cor', 'Dun'], anActuel: 300, souverain: 'le roi Bel', titres: ['le roi', 'la reine'], fondateur: 'Ari',
  calendrier: { joursParAn: 60, mois: [{ nom: 'Givre', jours: 30 }, { nom: 'Sève', jours: 30 }], fetes: [{ nom: 'Dégel', mois: 1, jour: 2, texte: 'On danse.' }] }, mj: { notes: 'Le roi est un imposteur.' } };

const carte = (nom: string, cle: string, reperes: Carte['reperes'] = []): Carte => ({ ...nouvelleCarte(nom, 'pays'), id: `k-${cle}`, univers: { type: 'univers', id: 'u1' }, source: { sorte: 'atlas', cle }, reperes });

function campagne(): Campagne {
  const c = nouvelleCampagne('Les Ombres de Valdor');
  const pj = { ...nouveauPersonnage('Morgran', 'pj', 'dnd5e', R.statsParDefaut()), mj: { notes: 'Fils caché du roi' } };
  const pnj = Array.from({ length: 5 }, (_, i) => nouveauPersonnage(`Garde ${i}`, 'pnj', 'dnd5e', R.statsParDefaut()));
  const espion = { ...nouveauPersonnage('Sylas', 'pnj', 'dnd5e', R.statsParDefaut()), mj: { cache: true } };
  const village = carte('Fathador', 'village|1|0');
  const pays = carte('Valdrins', 'pays|1', [
    { id: 'r1', nom: 'Valdor', x: 0, y: 0, sorte: 'ville', desc: 'Valdor est une cité portuaire.', lien: { type: 'carte', id: 'k-ville|1|0' } },
    { id: 'r2', nom: 'Fathador', x: 0, y: 0, sorte: 'ville', desc: 'Village agricole des Valdrins. Une fête y a lieu.', lien: { type: 'carte', id: village.id } },
    { id: 'r3', nom: 'Auberge du Pèlerin', x: 0, y: 0, sorte: 'lieu', desc: 'Auberge · Un relais sur la route.' },
    { id: 'r4', nom: 'Ruines de Miel', x: 0, y: 0, sorte: 'danger', desc: 'Ruines · Des pans de murs. · Danger : élevé' },
  ]);
  return {
    ...c, personnages: [pj, ...pnj, espion],
    univers: [{ id: 'u1', nom: 'Monde', sorte: 'fait-main', civilisations: { peuples: [civ], monde: null } }],
    campagne: { ...c.campagne, univers: { type: 'univers', id: 'u1' } },
    cartes: [pays, carte('Valdor', 'ville|1|0'), village],
    quetes: [{ id: 'q1', titre: 'La couronne volée', source: { sorte: 'fait-main' }, lieux: [], personnages: [{ type: 'personnage', id: pj.id }], etapes: [{ titre: 'Le bal', joueurs: 'Une invitation.', mj: { notes: 'Piège' } }], mj: {} }],
    familles: [{ ...dynastieDepuisCivilisation(civ, { an: 300 }), univers: { type: 'univers', id: 'u1' } }],
  };
}

describe('livre de campagne', () => {
  it('sélection : peuples, villes, autres cartes, exclusions, version joueurs', () => {
    const c = campagne();
    expect(elementsDe(c, 'villes').map((x) => x.libelle)).toEqual(['Valdor']);
    expect(elementsDe(c, 'cartes').map((x) => x.libelle)).toEqual(['Fathador']);
    expect(retenus(c, { ...choixParDefaut(), exclus: [c.personnages[0].id] }, 'personnages').map((x) => x.libelle)).not.toContain('Morgran');
    expect(elementsDe(campagneDuLivre(c, { ...choixParDefaut(), version: 'joueurs' }), 'personnages').map((x) => x.libelle)).not.toContain('Sylas');
    expect(retenus(c, { ...choixParDefaut(), version: 'joueurs' }, 'rencontres')).toEqual([]);
  });

  it('lieux rangés par catégorie : villes, villages, puis auberges, ruines…', () => {
    const c = campagne();
    const cats = categoriesDe(c, c.cartes[0], true);
    expect(cats.map((x) => x.nom)).toEqual(['Villes', 'Villages', 'Auberge', 'Ruines']);
    expect(cats[0].lieux[0].texte).toBe('une cité portuaire.');
    expect(cats[3].lieux[0].danger).toBe(true);
  });

  it('pays : carte et fiche, puis lieux, histoire et calendrier ; dynastie, institutions, ville ; secrets seulement pour le MJ', () => {
    const c = campagne();
    const o = { ids: new Set(['peuple:u1:1']), dynasties: true, villes: new Set(['k-ville|1|0']), images: new Map(), mj: true };
    const p = M.peuples(c, o)!;
    expect((p.html.match(/class="page/g) ?? []).length).toBe(5); // 2 feuilles pays + dynastie + institutions + ville
    expect(p.html).toContain('imposteur');
    expect(p.html).toContain('Givre');
    expect(p.html).toContain('Auberge (1)');
    expect(p.html).toContain('partie-titre');
    expect(p.entrees.map((x) => x.titre)).toEqual(['Valdrins', 'Valdor (Valdrins)']);
    const j = campagneDuLivre(c, { ...choixParDefaut(), version: 'joueurs' });
    expect(M.peuples(j, { ...o, mj: false })!.html).not.toContain('imposteur');
    expect(J.quetes(j, new Set(['q1']))!.html).not.toContain('Piège');
  });

  it('personnages : une feuille par PJ, quatre PNJ par feuille ; sommaire cliquable', () => {
    const c = campagne();
    const p = J.personnages(c, new Set(c.personnages.map((x) => x.id)), R, new Map())!;
    expect((p.html.match(/class="page/g) ?? []).length).toBe(1 + 2); // Morgran, puis 6 PNJ en 2 feuilles
    expect((p.html.match(/class="carte-pnj/g) ?? []).length).toBe(7); // Morgran sans fiche détaillée : sa carte, seule sur sa feuille
    const s = M.sommaire([p]);
    expect(s).toContain('href="#personnages"');
    expect(s).toContain(`href="#${c.personnages[0].id.replace(/[^a-zA-Z0-9_-]/g, '_')}"`);
  });
});
