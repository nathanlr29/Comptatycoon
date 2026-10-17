import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// GitHub Pages sert le site sous /<nom-du-dépôt>/ : le workflow fournit VITE_BASE.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  // Version et commit affichés dans Paramètres › À propos (GITHUB_SHA est fourni par le workflow).
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify((process.env.GITHUB_SHA ?? '').slice(0, 7)),
  },
  // Phaser seul pèse ~1,2 Mo minifié (~320 Ko gzip) : avertissement relevé en conséquence.
  build: { target: 'es2022', chunkSizeWarningLimit: 1300 },
  test: { include: ['tests/**/*.test.ts'] },
});
