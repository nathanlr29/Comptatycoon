import { defineConfig } from 'vitest/config';

// GitHub Pages sert le site sous /<nom-du-dépôt>/ : le workflow fournit VITE_BASE.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  // Phaser seul pèse ~1,2 Mo minifié (~320 Ko gzip) : avertissement relevé en conséquence.
  build: { target: 'es2022', chunkSizeWarningLimit: 1300 },
  test: { include: ['tests/**/*.test.ts'] },
});
