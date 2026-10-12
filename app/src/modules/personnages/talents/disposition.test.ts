import { describe, expect, it } from 'vitest';
import { regles } from '../../../noyau/regles';
import { tousLesArbres } from '../../../noyau/talents';
import { disposerTalents, RAYON_NOEUD } from './disposition';

regles('dnd5e');

describe('disposition des arbres de talents', () => {
  it('tronc au centre, aucun talent l’un sur l’autre, tous les liens dessinés', () => {
    for (const a of tousLesArbres()) {
      const d = disposerTalents(a);
      const n = a.branches.reduce((s, b) => s + b.noeuds.length, 0);
      expect(d.noeuds).toHaveLength(n);
      const racine = d.noeuds.find((p) => !p.noeud.requis.length && !p.noeud.requisUn?.length)!;
      expect(Math.hypot(racine.x, racine.y)).toBe(0);
      for (let i = 0; i < d.noeuds.length; i++) for (let j = i + 1; j < d.noeuds.length; j++) {
        const p = d.noeuds[i], q = d.noeuds[j];
        expect(Math.hypot(p.x - q.x, p.y - q.y), `${a.id} : ${p.noeud.nom} / ${q.noeud.nom}`).toBeGreaterThan(RAYON_NOEUD * 2);
      }
      expect(d.liens.length).toBe(a.branches.flatMap((b) => b.noeuds).reduce((s, x) => s + x.requis.length + (x.requisUn?.length ?? 0), 0));
    }
  });
});
