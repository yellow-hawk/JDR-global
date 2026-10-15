import { describe, expect, it } from 'vitest';
import { nouvelleCampagne, type Campagne } from '../../noyau/contrat';
import { annotationsDe, avecAnnotation, avecAnnotationPermise, sansAnnotation, sansAnnotations } from './annotations';

const T = { l: 1000, h: 800 };
const ada = { nom: 'Ada', persoId: 'p-ada' }, bo = { nom: 'Bo', persoId: 'p-bo' };

describe('annotations des joueurs sur une carte', () => {
  it('repère et trait validés (dans l’image), texte court', () => {
    let c: Campagne = nouvelleCampagne('T');
    c = avecAnnotation(c, 'k1', { sorte: 'repere', x: 100.4, y: 50, texte: 'Camp des orcs' }, T, ada);
    c = avecAnnotation(c, 'k1', { sorte: 'repere', x: 5000, y: 50, texte: 'hors carte' }, T, ada);
    c = avecAnnotation(c, 'k1', { sorte: 'trait', points: [[0, 0], [10, 10], [20, 30]], couleur: '#d9484a' }, T, bo);
    c = avecAnnotation(c, 'k1', { sorte: 'trait', points: [[0, 0]] }, T, bo);
    const l = annotationsDe(c, 'k1');
    expect(l.map((a) => a.sorte)).toEqual(['repere', 'trait']);
    expect(l[0]).toMatchObject({ x: 100, texte: 'Camp des orcs', auteur: 'Ada' });
    expect(l[1].couleur).toBe('#d9484a');
  });

  it('chacun efface les siennes, le MJ tout ; le MJ peut interdire', () => {
    let c = avecAnnotation(nouvelleCampagne('T'), 'k1', { sorte: 'repere', x: 1, y: 1, texte: 'ici' }, T, ada);
    const id = annotationsDe(c, 'k1')[0].id;
    expect(sansAnnotation(c, 'k1', id, 'p-bo')).toBe(c);
    expect(annotationsDe(sansAnnotation(c, 'k1', id, 'p-ada'), 'k1')).toEqual([]);
    expect(annotationsDe(sansAnnotation(c, 'k1', id, null), 'k1')).toEqual([]);
    c = avecAnnotationPermise(c, 'k1', false);
    expect(avecAnnotation(c, 'k1', { sorte: 'repere', x: 2, y: 2 }, T, ada)).toBe(c);
    expect(annotationsDe(sansAnnotations(c, 'k1'), 'k1')).toEqual([]);
  });
});
