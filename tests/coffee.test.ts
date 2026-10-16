import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { canTakeCoffeeBreak, getCoffeeBreakEnd } from '../src/core/coffee';
import { getIncomePerSecond } from '../src/core/economy';
import { catchUpOffline } from '../src/core/offline';
import { simulate } from '../src/core/store';
import type { GameState } from '../src/core/state';
import { COFFEE_MACHINES } from '../src/data/coffee';
import { getStage } from '../src/data/office';
import { coffeeSpots } from '../src/game/characters/coffeeSpots';
import { parseSave, serializeSave } from '../src/persistence/SaveSchema';
import { makeState, T0 } from './helpers';

const staff = { intern: 4, junior: 0, senior: 0, manager: 0 };
const firm = (level: number, patch: Partial<GameState> = {}) =>
  makeState({ staff, buildings: [{ id: 'hq', type: 'headquarters', level, slotId: 'hq' }], ...patch });

const brk = (state: GameState, now = T0) => applyAction(state, { type: 'coffeeBreak' }, now);

describe('pause café', () => {
  it('arrive avec le local voisin (niveau 2 du cabinet)', () => {
    expect(brk(firm(1)).result).toEqual({ ok: false, reason: 'requires_hq' });
    expect(brk(firm(2)).result).toEqual({ ok: true });
  });

  it('multiplie le revenu pendant 30 s avec la cafetière, puis plus rien', () => {
    const before = firm(2);
    const base = getIncomePerSecond(before, T0);
    const { state } = brk(before);
    expect(getIncomePerSecond(state, T0 + 1_000)).toBeCloseTo(base * 1.5);
    expect(getCoffeeBreakEnd(state, T0)).toBe(T0 + 30_000);
    const after = simulate(state, T0 + 31_000);
    expect(getCoffeeBreakEnd(after, T0 + 31_000)).toBeNull();
    expect(getIncomePerSecond(after, T0 + 31_000)).toBeCloseTo(base);
  });

  it('se recharge en 5 min comptées depuis le début de la pause', () => {
    const { state } = brk(firm(2));
    expect(canTakeCoffeeBreak(state, T0 + 299_999)).toEqual({ ok: false, reason: 'cooling_down', readyAt: T0 + 300_000 });
    expect(brk(state, T0 + 299_999).result.ok).toBe(false);
    expect(brk(state, T0 + 300_000).result.ok).toBe(true);
  });

  it('se cumule avec la Période fiscale', () => {
    const fiscal = firm(2, { effects: [{ id: 'fiscalPeriod', incomeMultiplier: 2, expiresAt: T0 + 20_000 }] });
    const base = getIncomePerSecond(firm(2), T0);
    expect(getIncomePerSecond(brk(fiscal).state, T0)).toBeCloseTo(base * 3);
  });

  it('ne compte pas pendant l’absence, mais le délai s’écoule', () => {
    const { state } = brk(firm(2));
    const base = getIncomePerSecond(firm(2), T0);
    const away = catchUpOffline(state, T0 + 3_600_000).state;
    expect(away.money).toBeCloseTo(base * 3_600);
    expect(canTakeCoffeeBreak(away, T0 + 3_600_000).ok).toBe(true);
  });
});

describe('machines à café', () => {
  const up = (state: GameState) => applyAction(state, { type: 'upgradeCoffeeMachine' }, T0);

  it('se paient une par une et améliorent la pause suivante', () => {
    expect(up(firm(2, { money: 2_499 })).result).toEqual({ ok: false, reason: 'insufficient_funds' });
    const { state, result } = up(firm(2, { money: 3_000 }));
    expect(result.ok).toBe(true);
    expect(state.money).toBe(500);
    expect(state.coffee.machine).toBe(2);
    const base = getIncomePerSecond(state, T0);
    const brewed = brk(state).state;
    expect(getIncomePerSecond(brewed, T0)).toBeCloseTo(base * 1.75);
    expect(brewed.coffee.readyAt).toBe(T0 + 240_000);
  });

  it('s’arrêtent au comptoir de barista et demandent le local voisin', () => {
    expect(up(firm(1, { money: 1e9 })).result).toEqual({ ok: false, reason: 'requires_hq' });
    const top = firm(2, { money: 1e9, coffee: { machine: COFFEE_MACHINES.length, readyAt: 0 } });
    expect(up(top).result).toEqual({ ok: false, reason: 'max_level' });
  });

  it('chaque machine fait mieux que la précédente', () => {
    for (let i = 1; i < COFFEE_MACHINES.length; i++) {
      const [a, b] = [COFFEE_MACHINES[i - 1]!, COFFEE_MACHINES[i]!];
      expect(b.cost).toBeGreaterThan(a.cost);
      expect(b.multiplier).toBeGreaterThan(a.multiplier);
      expect(b.cooldownMs).toBeLessThan(a.cooldownMs);
    }
  });
});

describe('sauvegarde du mode café', () => {
  it('relit la machine et le délai', () => {
    const state = brk(firm(2, { coffee: { machine: 3, readyAt: 0 } })).state;
    const parsed = parseSave(serializeSave(state, T0));
    expect(parsed.ok && parsed.save.state.coffee).toEqual({ machine: 3, readyAt: T0 + 210_000 });
  });

  it('donne la cafetière de départ aux anciennes parties', () => {
    const { coffee: _, ...old } = firm(2);
    const parsed = parseSave(JSON.stringify({ schemaVersion: 2, savedAt: T0, state: old }));
    expect(parsed.ok && parsed.save.state.coffee).toEqual({ machine: 1, readyAt: 0 });
  });
});

describe('places autour de la machine', () => {
  it('aucune avant le local voisin, quatre ensuite, toujours dans le cabinet', () => {
    expect(coffeeSpots(1)).toEqual([]);
    for (let stage = 2; stage <= 5; stage++) {
      const { w, h } = getStage(stage).size;
      const spots = coffeeSpots(stage);
      expect(spots).toHaveLength(4);
      for (const s of spots) {
        expect(s.ix).toBeGreaterThan(0);
        expect(s.ix).toBeLessThan(w);
        expect(s.iy).toBeGreaterThan(0);
        expect(s.iy).toBeLessThan(h);
      }
    }
  });
});
