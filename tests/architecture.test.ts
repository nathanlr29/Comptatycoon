import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CORE = join(__dirname, '..', 'src', 'core');
const FORBIDDEN = [/from ['"]phaser['"]/, /\bwindow\./, /\bdocument\./, /\blocalStorage\b/, /from ['"]\.\.\/(game|ui|persistence)\//];

describe('architecture', () => {
  it('src/core ne dépend ni de Phaser, ni du DOM, ni du stockage', () => {
    for (const file of readdirSync(CORE)) {
      const source = readFileSync(join(CORE, file), 'utf8');
      for (const pattern of FORBIDDEN) expect(source, `${file} : ${pattern}`).not.toMatch(pattern);
    }
  });
});
