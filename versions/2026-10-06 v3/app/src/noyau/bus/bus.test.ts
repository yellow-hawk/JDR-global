import { describe, expect, it } from 'vitest';
import { ecouter, emettre, montrerAuxJoueurs, recevoirScenes } from './index';
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
