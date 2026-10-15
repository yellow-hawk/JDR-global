import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, nouveauPersonnage, type Campagne, type Personnage } from '../../noyau/contrat';
import { regles } from '../../noyau/regles';
import {
  avecDemandeNiveau, avecDroitsInventaire, avecEntreeGroupe, avecEntreeModifiee, avecInventaireDemande, demanderJet, demandeNiveau,
  demandesJet, formuleDuJoueur, inventaireDuJoueur, jetsDeLaFiche, journalGroupe, retirerDemandeJet, trancherNiveau, verdict,
} from './actions';
import { avecJeton } from './logique';

const R = regles('dnd5e');
const pj = (nom: string, extra: Partial<Personnage['fiche']> = {}): Personnage => {
  const p = nouveauPersonnage(nom, 'pj', 'dnd5e', R.statsParDefaut());
  return { ...p, fiche: { progression: { classes: [{ id: 'guerrier', niveau: 1 }], xp: 0 }, ...extra } };
};
function campagne(): Campagne {
  const a = pj('Ada', { inventaire: { objets: [{ id: 'o1', nom: 'Corde', quantite: 2 }, { id: 'o2', nom: 'Clé', quantite: 1, mj: { notes: 'ouvre la crypte' } }], monnaie: { po: 10 } } });
  const b = pj('Bo');
  let c: Campagne = { ...nouvelleCampagne('T'), personnages: [a, b] };
  c = avecJeton(avecJeton(c, a.id), b.id);
  return c;
}

describe('actions des joueurs à distance', () => {
  it('jets : bonus pris sur la fiche, formule libre simple seulement, demandes du MJ', () => {
    let c = campagne();
    const a = c.personnages[0];
    const percep = jetsDeLaFiche(a, R).find((j) => j.cle === 'competence.perception')!;
    expect(formuleDuJoueur(a, R, { cle: 'competence.perception', formule: '1d20+99' })!.formule).toBe(`1d20${percep.bonus >= 0 ? (percep.bonus ? `+${percep.bonus}` : '') : percep.bonus}`);
    expect(formuleDuJoueur(a, R, { formule: '2d6+3' })!.formule).toBe('2d6+3');
    expect(formuleDuJoueur(a, R, { formule: 'n’importe quoi' })).toBeNull();
    c = demanderJet(c, [a.id], { cle: 'competence.perception', libelle: 'Perception', mode: 'normal', dd: 15 });
    const d = demandesJet(c, a.id)[0];
    const r = retirerDemandeJet(c, a.id, d.id);
    expect(r.demande?.dd).toBe(15);
    expect(demandesJet(r.campagne, a.id)).toEqual([]);
    expect(verdict(17, 15)).toBe('17 contre DD 15 : réussi');
  });

  it('inventaire : secrets du MJ retirés, équiper, donner un objet et de l’argent, selon les réglages', () => {
    let c = campagne();
    const [a, b] = c.personnages;
    expect(JSON.stringify(inventaireDuJoueur(c, a, R))).not.toContain('crypte');
    c = avecInventaireDemande(c, a.id, { faire: 'equiper', objet: 'o1', equipe: true }, R).campagne;
    expect(c.personnages[0].fiche?.inventaire?.objets[0].equipe).toBe(true);
    const r = avecInventaireDemande(c, a.id, { faire: 'donner', objet: 'o1', a: b.id, quantite: 1 }, R);
    expect(r.texte).toMatch(/donne Corde à Bo/);
    expect(r.campagne.personnages[0].fiche?.inventaire?.objets.find((o) => o.id === 'o1')?.quantite).toBe(1);
    expect(r.campagne.personnages[1].fiche?.inventaire?.objets[0].nom).toBe('Corde');
    expect(avecInventaireDemande(c, a.id, { faire: 'donner', objet: 'o1', a: b.id, quantite: 5 }, R).texte).toBeNull();
    const or = avecInventaireDemande(c, a.id, { faire: 'argent', a: b.id, piece: 'po', montant: 4 }, R).campagne;
    expect(or.personnages[0].fiche?.inventaire?.monnaie?.po).toBe(6);
    expect(or.personnages[1].fiche?.inventaire?.monnaie?.po).toBe(4);
    const interdit = avecDroitsInventaire(c, { donner: false });
    expect(avecInventaireDemande(interdit, a.id, { faire: 'argent', a: b.id, piece: 'po', montant: 1 }, R).campagne).toBe(interdit);
  });

  it('journal du groupe : chacun modifie ses notes, le MJ toutes', () => {
    let c = campagne();
    const [a, b] = c.personnages;
    c = avecEntreeGroupe(c, 'Ada', a.id, 'Le forgeron ment.');
    const id = journalGroupe(c)[0].id;
    expect(avecEntreeModifiee(c, id, b.id, 'effacé')).toBe(c);
    c = avecEntreeModifiee(c, id, a.id, 'Le forgeron ment sur sa fille.');
    expect(journalGroupe(c)[0].texte).toBe('Le forgeron ment sur sa fille.');
    expect(journalGroupe(avecEntreeModifiee(c, id, null, null))).toEqual([]);
  });

  it('niveau : proposé seulement si l’XP suffit, appliqué quand le MJ valide', () => {
    let c = campagne();
    const a = c.personnages[0];
    const choix = { classe: 'guerrier', pv: 8 };
    expect(avecDemandeNiveau(c, a.id, choix, R)).toBe(c); // pas assez d'XP
    c = { ...c, personnages: c.personnages.map((p) => (p.id === a.id ? { ...p, fiche: { ...p.fiche, progression: { ...p.fiche!.progression, xp: 300 } } } : p)) };
    expect(avecDemandeNiveau(c, a.id, { classe: 'guerrier', pv: 99 }, R)).toBe(c); // PV impossibles
    c = avecDemandeNiveau(c, a.id, choix, R);
    expect(demandeNiveau(c, a.id)?.choix.pv).toBe(8);
    const refuse = trancherNiveau(c, a.id, false, R);
    expect(demandeNiveau(refuse, a.id)).toBeNull();
    expect(refuse.personnages[0].fiche?.progression?.classes?.[0].niveau).toBe(1);
    const ok = trancherNiveau(c, a.id, true, R);
    expect(ok.personnages[0].fiche?.progression?.classes?.[0].niveau).toBe(2);
  });
});
