import { describe, expect, it } from 'vitest';
import { depuisReseau, sansDoublons, versReseau } from './transport';

describe('transport réseau', () => {
  it('les images (Blob) traversent le JSON et reviennent intactes', async () => {
    const image = new Blob([new Uint8Array([1, 2, 250])], { type: 'image/png' });
    const texte = JSON.stringify(await versReseau({ type: 'scene', scene: { sorte: 'image', titre: 'Carte', image } }));
    const m = depuisReseau(JSON.parse(texte)) as { scene: { image: Blob; titre: string } };
    expect(m.scene.titre).toBe('Carte');
    expect(m.scene.image.type).toBe('image/png');
    expect([...new Uint8Array(await m.scene.image.arrayBuffer())]).toEqual([1, 2, 250]);
  });

  it('un message arrivé par deux liaisons n’est traité qu’une fois', () => {
    const recus: unknown[] = [];
    const f = sansDoublons((m) => recus.push(m.type));
    f({ type: 'a', mid: '1' }); f({ type: 'a', mid: '1' }); f({ type: 'b', mid: '2' });
    expect(recus).toEqual(['a', 'b']);
  });
});
