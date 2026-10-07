import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' : le même build marche sur GitHub Pages et avec le lanceur local.
export default defineConfig({
  plugins: [react()],
  base: './',
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
} as any);
