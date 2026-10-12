import { describe, expect, it } from 'vitest';
import { avantLAttente, ecouter, ecranActuel, emettre, montrerAuxJoueurs, recevoirScenes, reprendreApresAttente } from './index';
import type { Scene } from './index';

describe('bus interne', () => {
  it('émet vers les abonnés et se désabonne', () => {
    const recu: string[] = [];
    const stop = ecouter('message', (m) => recu.push(m.texte));
    emettre('message', { texte: 'a' });
    stop();
    emettre('message', { texte: 'b' });
    expect(recu).toEqual(['a']);
  });
});

describe('écran joueurs', () => {
  it('envoie la scène sans secrets, Blob intact, et la renvoie à un écran ouvert plus tard', async () => {
    const image = new Blob([new Uint8Array([9, 9])], { type: 'image/png' });
    montrerAuxJoueurs({ sorte: 'image', titre: 'Carte', image, mj: { piege: 'oui' } } as unknown as Scene);
    const recue = await new Promise<Scene>((ok) => { const stop = recevoirScenes((s) => { stop(); ok(s); }); });
    expect(recue.sorte).toBe('image');
    expect(JSON.stringify(recue)).not.toContain('piege');
    expect((recue as { image: Blob }).image.size).toBe(2);
  });
});

describe('jets de dés partagés', () => {
  it('un jet public part vers l’écran joueurs, un jet caché reste dans l’historique du MJ', async () => {
    const { annoncerJet, historiqueJets, recevoirEcran } = await import('./index');
    const { jeter } = await import('../regles');
    const recus: string[] = [];
    const stop = recevoirEcran({ scene: () => undefined, jet: (j) => recus.push(j.id) });
    await new Promise((ok) => setTimeout(ok, 20));
    const pub = jeter('1d20'), cache = jeter('1d6');
    annoncerJet(cache, true);
    annoncerJet(pub);
    await new Promise((ok) => setTimeout(ok, 50));
    stop();
    expect(recus).toEqual([pub.id]);
    expect(historiqueJets()[0].id).toBe(pub.id);
    expect(historiqueJets()[1].qui).toContain('caché');
  });

  it('écran d’attente puis reprise de ce qui était montré', () => {
    montrerAuxJoueurs({ sorte: 'texte', titre: 'Combat', texte: '' }, 'combat');
    montrerAuxJoueurs({ sorte: 'vide', campagne: 'T' }, 'attente');
    expect(avantLAttente()?.source).toBe('combat');
    expect(reprendreApresAttente()).toBe(true);
    expect(ecranActuel()).toMatchObject({ source: 'combat', scene: { titre: 'Combat' } });
    expect(avantLAttente()).toBeNull();
    expect(reprendreApresAttente()).toBe(false);
  });
});
