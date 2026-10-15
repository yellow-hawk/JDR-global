import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, nouveauPersonnage, type Campagne, type Personnage } from '../../noyau/contrat';
import { regles } from '../../noyau/regles';
import { arbresPour, etatTalent } from '../../noyau/talents';
import { ajouterMessage, avecDroitsTalents, avecEntrainement, avecEntrainementRecu, avecJeton, avecNotesJoueur, avecTalentDemande, distantsDe, droitsEntrainement, entrainementActif, ficheDuJoueur, lienJoueur, marquerLusMj, nonLusMj, notesJoueur, persoDuJeton, retirerMessage, talentsDuJoueur } from './logique';

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

  it('zone d’entraînement : records gardés, leçon apprise si permis, désactivable par PJ', () => {
    const p = nouveauPersonnage('Ysolde', 'pj', 'dnd5e', R.statsParDefaut());
    let c: Campagne = avecJeton({ ...nouvelleCampagne('T'), personnages: [p] }, p.id);
    expect(entrainementActif(c, c.personnages[0])).toBe(true);
    expect(droitsEntrainement(c)).toEqual({ lecons: true, grimoire: false });
    c = avecEntrainementRecu(c, p.id, { defis: { x: { score: 88, temps: 4000, date: 1 } }, lecons: ['l-pluie'] });
    const m = c.personnages[0].magie as { defis: Record<string, { score: number }>; signes: string[] };
    expect(m.defis.x.score).toBe(88);
    expect(m.signes).toContain('pluie');
    c = avecEntrainement(c, p.id, false);
    expect(entrainementActif(c, c.personnages[0])).toBe(false);
    expect(avecEntrainementRecu(c, p.id, { defis: { y: { score: 50, temps: 1, date: 1 } } })).toBe(c);
  });

  it('arbre de talents : le joueur apprend un talent disponible, seulement si permis', () => {
    const p = { ...nouveauPersonnage('Brune', 'pj', 'dnd5e', R.statsParDefaut()), mj: { notes: 'secret' }, fiche: { progression: { classes: [{ id: 'guerrier', niveau: 3 }], talents: [] } } } as unknown as Personnage;
    let c: Campagne = { ...nouvelleCampagne('T'), personnages: [p] };
    const t = talentsDuJoueur(c, p, R)!;
    expect(JSON.stringify(t)).not.toContain('secret');
    const libre = arbresPour(p).flatMap((a) => a.branches.flatMap((b) => b.noeuds)).find((n) => etatTalent(p, n, t.parNiveau).etat === 'disponible')!;
    const bloque = arbresPour(p).flatMap((a) => a.branches.flatMap((b) => b.noeuds)).find((n) => etatTalent(p, n, t.parNiveau).etat === 'verrouille')!;
    expect(avecTalentDemande(c, p.id, { faire: 'acquerir', id: bloque.id }, R)).toBe(c);
    c = avecTalentDemande(c, p.id, { faire: 'acquerir', id: libre.id }, R);
    expect(c.personnages[0].fiche?.progression?.talents).toEqual([libre.id]);
    expect(avecTalentDemande(c, p.id, { faire: 'retirer', id: libre.id }, R)).toBe(c); // oublier : pas permis par défaut
    c = avecDroitsTalents(c, { retirer: true });
    expect(avecTalentDemande(c, p.id, { faire: 'retirer', id: libre.id }, R).personnages[0].fiche?.progression?.talents).toEqual([]);
    c = avecDroitsTalents(c, { developper: false });
    expect(avecTalentDemande(c, p.id, { faire: 'acquerir', id: libre.id }, R)).toBe(c);
  });

  it('la fiche envoyée au joueur ne contient rien du MJ', () => {
    const p = { ...nouveauPersonnage('Morgran', 'pj', 'dnd5e', R.statsParDefaut()), mj: { notes: 'Fils caché du roi' } };
    const f = ficheDuJoueur(p, R);
    expect(f.html).toContain('Morgran');
    expect(f.html).not.toContain('Fils caché');
  });
});
