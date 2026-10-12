import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { creerRelais } from './relais.mjs';

// base './' : le même build marche sur GitHub Pages et avec le lanceur local.
export default defineConfig({
  // Relais de l'écran joueurs (tablettes) aussi en développement : npm run dev -- --host
  plugins: [react(), { name: 'relais-ecran-joueurs', configureServer: (s) => { const r = creerRelais(s.config.server.port ?? 5173); s.middlewares.use((req, res, suite) => { r(req, res, suite); }); } }],
  base: './',
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
