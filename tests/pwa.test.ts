import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PUBLIC = join(__dirname, '..', 'public');
const manifest = JSON.parse(readFileSync(join(PUBLIC, 'manifest.webmanifest'), 'utf8'));

/** Largeur et hauteur lues dans l'en-tête IHDR d'un PNG. */
function pngSize(file: string): string {
  const data = readFileSync(join(PUBLIC, file));
  expect(data.subarray(1, 4).toString('latin1'), file).toBe('PNG');
  return `${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`;
}

describe('PWA', () => {
  it('le manifeste fonctionne sous n’importe quel base (chemins relatifs)', () => {
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    for (const icon of manifest.icons) expect(icon.src, icon.src).not.toMatch(/^\//);
  });

  it('chaque icône déclarée existe avec la bonne taille', () => {
    for (const icon of manifest.icons) {
      expect(existsSync(join(PUBLIC, icon.src)), icon.src).toBe(true);
      if (icon.type === 'image/png') expect(pngSize(icon.src)).toBe(icon.sizes);
    }
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  });

  it('index.html déclare le manifeste et l’icône iOS 180 × 180', () => {
    const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(html).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />');
    expect(pngSize('icons/apple-touch-icon.png')).toBe('180x180');
  });
});
