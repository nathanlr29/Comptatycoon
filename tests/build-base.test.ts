import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { build } from 'vite';

const BASE = '/ComptaTycoon/';
const outDir = mkdtempSync(join(tmpdir(), 'comptatycoon-build-'));

afterAll(() => rmSync(outDir, { recursive: true, force: true }));

describe('build GitHub Pages', () => {
  it(`préfixe tous les chemins par ${BASE}`, async () => {
    await build({ base: BASE, logLevel: 'silent', build: { outDir, emptyOutDir: true } });
    const html = readFileSync(join(outDir, 'index.html'), 'utf8');

    const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1] ?? '');
    const local = refs.filter((ref) => !/^(https?:)?\/\//.test(ref));

    expect(local.length).toBeGreaterThan(0);
    for (const ref of local) {
      expect(ref.startsWith(BASE), `chemin non préfixé : ${ref}`).toBe(true);
    }
  }, 60_000);
});
