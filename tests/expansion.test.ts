import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { getBaseIncomePerSecond } from '../src/core/economy';
import { canExpand, getFirmLevel, getNextExpansion } from '../src/core/expansion';
import { EXPANSION_LEVELS, MAX_FIRM_LEVEL } from '../src/data/expansion';
import { OFFICE_STAGES } from '../src/data/office';
import { makeState, T0 } from './helpers';

const expand = { type: 'upgradeBuilding', buildingId: 'hq' } as const;
const staff = (n: number) => ({ intern: n, junior: 0, senior: 0, manager: 0 });
const atLevel = (level: number, patch = {}) => makeState({ buildings: [{ id: 'hq', type: 'headquarters', level, slotId: 'hq' }], ...patch });

describe('données d’agrandissement', () => {
  it('suit les prix du Bureau principal (GDD §6) et ouvre les locaux dans l’ordre', () => {
    expect(EXPANSION_LEVELS.map((l) => l.cost)).toEqual([0, 500, 5_000, 50_000, 500_000]);
    expect(EXPANSION_LEVELS.map((l) => l.level)).toEqual([1, 2, 3, 4, 5]);
    expect(EXPANSION_LEVELS.map((l) => l.name)).toEqual(OFFICE_STAGES.map((s) => s.name));
  });

  it('les conditions d’équipe ne baissent jamais et restent atteignables', () => {
    for (let i = 1; i < EXPANSION_LEVELS.length; i++) {
      const [prev, cur] = [EXPANSION_LEVELS[i - 1]!, EXPANSION_LEVELS[i]!];
      expect(cur.minStaff).toBeGreaterThanOrEqual(prev.minStaff);
      expect(cur.minPartners).toBeGreaterThanOrEqual(prev.minPartners);
      expect(cur.minStaff).toBeLessThanOrEqual(cur.minPartners * 15);
    }
  });
});

describe('agrandir le cabinet', () => {
  it('refuse sans l’équipe demandée, puis sans les fonds', () => {
    expect(canExpand(makeState({ money: 1e6, staff: staff(4) }))).toEqual({ ok: false, reason: 'missing_prerequisite', cost: 500 });
    expect(canExpand(makeState({ money: 499, staff: staff(5) }))).toEqual({ ok: false, reason: 'insufficient_funds', cost: 500 });
  });

  it('monte d’un niveau et débite le prix exact', () => {
    const { state, result } = applyAction(makeState({ money: 600, staff: staff(5) }), expand, T0);
    expect(result.ok).toBe(true);
    expect(state.money).toBe(100);
    expect(getFirmLevel(state)).toBe(2);
    expect(getNextExpansion(state)?.name).toBe('Le plateau');
  });

  it('demande des associés à partir du niveau 4', () => {
    const state = atLevel(3, { money: 1e6, staff: staff(20) });
    expect(canExpand(state)).toMatchObject({ ok: false, reason: 'missing_prerequisite' });
    expect(canExpand({ ...state, partners: 2 }).ok).toBe(true);
  });

  it('s’arrête au niveau maximum', () => {
    const state = atLevel(MAX_FIRM_LEVEL, { money: 1e9, staff: staff(60), partners: 5 });
    expect(getNextExpansion(state)).toBeNull();
    expect(applyAction(state, expand, T0).result).toEqual({ ok: false, reason: 'max_level' });
  });

  it('chaque niveau au-delà du premier ajoute 10 % de production', () => {
    expect(getBaseIncomePerSecond(makeState({ staff: staff(10) }))).toBe(5);
    expect(getBaseIncomePerSecond(atLevel(3, { staff: staff(10) }))).toBeCloseTo(6);
  });
});
