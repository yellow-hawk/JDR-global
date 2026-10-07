import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, vueJoueurs } from '../../noyau/contrat';
import { cacherDocument, estMontre, montrerDocument, nouveauDocument, sceneDocument, supprimerDocument, trierDocuments } from './logique';

describe('documents', () => {
  it('reste caché aux joueurs tant qu’il n’est pas montré', () => {
    let c = nouvelleCampagne('T');
    const r = nouveauDocument(c, 'texte', 'Lettre du duc', 'Venez seuls.');
    c = r.campagne;
    expect(vueJoueurs(c).documents).toHaveLength(0);
    c = montrerDocument(c, r.id, '2026-10-06');
    expect(estMontre(c.documents[0])).toBe(true);
    expect(vueJoueurs(c).documents[0].texte).toBe('Venez seuls.');
    c = cacherDocument(c, r.id);
    expect(vueJoueurs(c).documents).toHaveLength(0);
    expect(c.documents[0].montreLe).toBe('2026-10-06');
  });
  it('scène, tri et suppression avec libération de l’image', () => {
    let c = nouvelleCampagne('T');
    const a = nouveauDocument(c, 'image', 'Plan volé'); c = a.campagne;
    c = { ...c, fichiers: [{ id: 'fichier-1', nom: 'plan.png', mime: 'image/png', octets: 3 }], documents: c.documents.map((d) => ({ ...d, image: 'fichier-1', style: 'inconnu' })) };
    const b = nouveauDocument(c); c = montrerDocument(b.campagne, b.id, '2026');
    expect(trierDocuments(c.documents)[0].id).toBe(a.id);
    expect(sceneDocument(c.documents[0], null)).toMatchObject({ sorte: 'document', style: 'parchemin' });
    const s = supprimerDocument(c, a.id);
    expect(s.libere).toBe('fichier-1');
    expect(s.campagne.fichiers).toHaveLength(0);
  });
});
