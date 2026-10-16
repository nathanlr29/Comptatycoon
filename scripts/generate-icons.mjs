// Génère les icônes PNG de public/icons/ à partir de public/icons/icon.svg.
// Usage : node scripts/generate-icons.mjs (nécessite Playwright et Chromium, non inclus dans les dépendances).
// Les PNG produits sont versionnés : le build ne dépend pas de ce script.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const dir = fileURLToPath(new URL('../public/icons/', import.meta.url));
const svg = await readFile(`${dir}icon.svg`, 'utf8');
const sizes = { 'icon-192.png': 192, 'icon-512.png': 512, 'apple-touch-icon.png': 180 };

const browser = await chromium.launch();
for (const [name, size] of Object.entries(sizes)) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.screenshot({ path: `${dir}${name}`, omitBackground: false });
  await page.close();
  console.log(`${name} (${size}×${size})`);
}
await browser.close();
