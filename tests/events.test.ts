import { describe, expect, it } from 'vitest';
import { applyEvent, isEventEligible, pickEvent, runEvents } from '../src/core/events';
import { getIncomePerSecond } from '../src/core/economy';
import { createRng } from '../src/core/random';
import { GameStore, simulate } from '../src/core/store';
import type { GameState } from '../src/core/state';
import { makeState, T0 } from './helpers';

const staff = (intern: number, junior = 0) => ({ intern, junior, senior: 0, manager: 0 });
const always = (value: number) => () => value;

describe('planification', () => {
  it('premier événement au plus tôt 3 min après le début, puis toutes les 90 à 150 s', () => {
    const state = makeState();
    expect(state.nextEventAt).toBe(T0 + 180_000);
    expect(runEvents(state, T0 + 179_999, Math.random)).toEqual({ state, report: null });
    const first = runEvents(state, T0 + 180_000, always(0));
    expect(first.report).not.toBeNull();
    expect(first.state.nextEventAt).toBe(T0 + 180_000 + 90_000);
    expect(runEvents(state, T0 + 180_000, always(0.999999)).state.nextEventAt).toBe(T0 + 180_000 + 150_000);
  });

  it('ne tire rien pour une échéance passée pendant une absence, et replanifie', () => {
    const state = makeState({ money: 1_000 });
    const { state: after, report } = runEvents(state, T0 + 180_000 + 3_600_000, always(0));
    expect(report).toBeNull();
    expect(after.money).toBe(1_000);
    expect(after.nextEventAt).toBe(T0 + 180_000 + 3_600_000 + 90_000);
  });

  it('avec une graine fixe, la séquence d’événements est reproductible', () => {
    const play = (seed: number) => {
      const store = new GameStore(makeState({ staff: staff(6, 2), money: 10_000 }), createRng(seed));
      const seen: string[] = [];
      store.onEvent((r) => seen.push(r.id));
      for (let t = T0; t <= T0 + 3_600_000; t += 1_000) store.tick(t);
      return seen;
    };
    const a = play(42);
    expect(a.length).toBeGreaterThan(20);
    expect(play(42)).toEqual(a);
    expect(play(7)).not.toEqual(a);
  });

  it('tire seulement parmi les événements éligibles, selon leurs poids', () => {
    const alone = makeState();
    expect(isEventEligible(alone, 'taxAudit')).toBe(false);
    expect(isEventEligible(alone, 'resignation')).toBe(false);
    const rng = createRng(1);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 5_500; i++) {
      const id = pickEvent(alone, rng)!;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    expect(Object.keys(counts).sort()).toEqual(['fiscalPeriod', 'prestigiousClient']);
    // 40 / 55 attendu ≈ 73 %
    expect(counts.fiscalPeriod! / 5_500).toBeGreaterThan(0.69);
    expect(counts.fiscalPeriod! / 5_500).toBeLessThan(0.77);
  });
});

describe('effets', () => {
  it('Période fiscale : revenu ×2 puis retour à ×1 après 20 s exactement, sans cumul', () => {
    const base = makeState({ staff: staff(10) });
    const income = getIncomePerSecond(base, T0);
    let state = applyEvent(base, 'fiscalPeriod', T0, Math.random).state;
    expect(getIncomePerSecond(state, T0 + 19_999)).toBe(income * 2);
    expect(getIncomePerSecond(state, T0 + 20_000)).toBe(income);
    state = applyEvent(state, 'fiscalPeriod', T0 + 10_000, Math.random).state;
    expect(state.effects).toHaveLength(1);
    expect(getIncomePerSecond(state, T0 + 29_999)).toBe(income * 2);
    expect(getIncomePerSecond(state, T0 + 30_000)).toBe(income);
  });

  it('Contrôle fiscal : perte plafonnée et réputation −2 sans Pôle Juridique, +1 avec', () => {
    const state = makeState({ staff: staff(10), money: 100_000, reputation: 1 });
    const audit = applyEvent(state, 'taxAudit', T0, Math.random);
    // revenu de base 10 × 0,5 × 1,01 = 5,05 €/s : 300 s = 1 515 € < 10 % du solde
    expect(audit.report).toMatchObject({ id: 'taxAudit', protected: false, loss: 1_515, reputationChange: -1 });
    expect(audit.state.money).toBe(100_000 - 1_515);
    expect(audit.state.reputation).toBe(0);
    const legal: GameState = { ...state, departments: ['legal'] };
    const safe = applyEvent(legal, 'taxAudit', T0, Math.random);
    expect(safe.report).toMatchObject({ protected: true, loss: 0, reputationChange: 1 });
    expect(safe.state.money).toBe(100_000);
  });

  it('Démission : un collaborateur part au prorata des effectifs, jamais un associé', () => {
    const state = makeState({ staff: staff(1, 3), partners: 2 });
    expect(applyEvent(state, 'resignation', T0, always(0)).report).toEqual({ id: 'resignation', role: 'intern' });
    const after = applyEvent(state, 'resignation', T0, always(0.5));
    expect(after.report).toEqual({ id: 'resignation', role: 'junior' });
    expect(after.state.staff).toEqual(staff(1, 2));
    expect(after.state.partners).toBe(2);
    expect(applyEvent(makeState({ partners: 3 }), 'resignation', T0, always(0)).report).toBeNull();
  });

  it('Client prestigieux : +3 réputation et prime de 60 s de revenu', () => {
    const state = makeState({ staff: staff(10) });
    const { state: after, report } = applyEvent(state, 'prestigiousClient', T0, Math.random);
    expect(report).toEqual({ id: 'prestigiousClient', bonus: 300, reputation: 3 });
    expect(after.money).toBe(300);
    expect(after.reputation).toBe(3);
  });

  it('aucun événement ne rend le solde, l’effectif ou la réputation négatif', () => {
    const rng = createRng(3);
    let state = makeState({ staff: staff(5), money: 0, reputation: 0 });
    for (let i = 0; i < 400; i++) {
      state = runEvents({ ...state, nextEventAt: T0 + i * 1_000 }, T0 + i * 1_000, rng).state;
      state = simulate(state, T0 + i * 1_000);
      expect(state.money).toBeGreaterThanOrEqual(0);
      expect(state.reputation).toBeGreaterThanOrEqual(0);
      for (const n of Object.values(state.staff)) expect(n).toBeGreaterThanOrEqual(0);
    }
  });
});
