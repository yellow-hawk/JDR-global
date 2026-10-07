// Fait tourner sous Vitest les scripts de vérification d'origine de l'Atelier (atelier/tests/*.verif.ts),
// sans les modifier : ils signalent un échec par process.exit(1), intercepté ici.
import { afterEach, describe, expect, it, vi } from 'vitest';

const SCRIPTS = ['engine', 'techniques', 'profils', 'realiste'] as const;

describe('Atelier de tracé : vérifications d’origine', () => {
  afterEach(() => vi.restoreAllMocks());

  for (const nom of SCRIPTS) {
    it(`${nom}.verif.ts`, async () => {
      const sortie: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => { sortie.push(a.join(' ')); });
      vi.spyOn(process, 'exit').mockImplementation(((code?: number) => { throw new Error(`échec (code ${code})`); }) as never);
      try {
        await import(`./atelier/tests/${nom}.verif.ts`);
      } catch (e) {
        expect.fail(`${(e as Error).message}\n${sortie.filter((l) => l.includes('✗')).join('\n')}`);
      }
    }, 60_000);
  }
});
