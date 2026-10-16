import { describe, expect, it } from 'vitest';
import { resolveTaxAudit } from '../src/core/departments';
import { getBaseIncomePerSecond } from '../src/core/economy';
import { getEventWeight } from '../src/core/events';
import { catchUpOffline } from '../src/core/offline';
import { createInitialState } from '../src/core/state';
import { DIFFICULTIES, DIFFICULTY_IDS } from '../src/data/difficulty';
import { EVENT_WEIGHTS } from '../src/data/events';
import { parseSave, serializeSave } from '../src/persistence/SaveSchema';
import { makeState, T0 } from './helpers';

const HOUR = 3_600_000;
// 2 juniors = 8 €/s en Classique.
const staff = { intern: 0, junior: 2, senior: 0, manager: 0 };

describe('modes de difficulté', () => {
  it('une nouvelle partie est en Classique, sauf choix à la fondation', () => {
    expect(createInitialState(T0).difficulty).toBe('normal');
    expect(createInitialState(T0, { difficulty: 'hard' }).difficulty).toBe('hard');
  });

  it('la production suit le mode : ×1,5 en Détente, ×0,7 en Exigeant', () => {
    expect(getBaseIncomePerSecond(makeState({ staff }))).toBeCloseTo(8, 9);
    expect(getBaseIncomePerSecond(makeState({ staff, difficulty: 'relaxed' }))).toBeCloseTo(12, 9);
    expect(getBaseIncomePerSecond(makeState({ staff, difficulty: 'hard' }))).toBeCloseTo(5.6, 9);
  });

  it('plafonne l’absence à 12 h, 8 h ou 4 h', () => {
    const credited = DIFFICULTY_IDS.map((difficulty) => catchUpOffline(makeState({ staff, difficulty }), T0 + 24 * HOUR).report.creditedMs);
    expect(credited).toEqual([12 * HOUR, 8 * HOUR, 4 * HOUR]);
  });

  it('rend contrôles et démissions plus rares en Détente, plus fréquents en Exigeant', () => {
    const weight = (difficulty: 'relaxed' | 'normal' | 'hard') => getEventWeight(makeState({ difficulty }), 'taxAudit');
    expect(weight('normal')).toBe(EVENT_WEIGHTS.taxAudit);
    expect(weight('relaxed')).toBeLessThan(weight('normal'));
    expect(weight('hard')).toBeGreaterThan(weight('normal'));
    expect(getEventWeight(makeState({ difficulty: 'hard' }), 'fiscalPeriod')).toBe(EVENT_WEIGHTS.fiscalPeriod);
  });

  it('module la perte du contrôle fiscal', () => {
    const loss = (difficulty: 'relaxed' | 'normal' | 'hard') => resolveTaxAudit(makeState({ money: 10_000, difficulty }), 1_000).loss;
    expect([loss('relaxed'), loss('normal'), loss('hard')]).toEqual([500, 1_000, 1_500]);
  });

  it('chaque mode a un nom et une phrase d’explication', () => {
    for (const id of DIFFICULTY_IDS) {
      expect(DIFFICULTIES[id].name.length).toBeGreaterThan(2);
      expect(DIFFICULTIES[id].description.length).toBeGreaterThan(10);
    }
  });
});

describe('sauvegarde du mode et des cessions', () => {
  it('relit le mode et le réseau', () => {
    const state = makeState({ difficulty: 'hard', prestige: { contacts: 12, sales: 2, pastEarned: 3e9 } });
    const parsed = parseSave(serializeSave(state, T0));
    expect(parsed.ok && [parsed.save.state.difficulty, parsed.save.state.prestige]).toEqual(['hard', { contacts: 12, sales: 2, pastEarned: 3e9 }]);
  });

  it('une ancienne partie sans ces champs passe en Classique, sans contact', () => {
    const old = JSON.parse(serializeSave(makeState(), T0)) as { state: Record<string, unknown> };
    delete old.state.difficulty;
    delete old.state.prestige;
    const parsed = parseSave(JSON.stringify(old));
    expect(parsed.ok && [parsed.save.state.difficulty, parsed.save.state.prestige]).toEqual(['normal', { contacts: 0, sales: 0, pastEarned: 0 }]);
  });

  it('refuse un mode inconnu en nommant le champ', () => {
    const bad = JSON.parse(serializeSave(makeState(), T0)) as { state: Record<string, unknown> };
    bad.state.difficulty = 'impossible';
    expect(parseSave(JSON.stringify(bad))).toEqual({ ok: false, error: 'state.difficulty : mode inconnu' });
  });
});
