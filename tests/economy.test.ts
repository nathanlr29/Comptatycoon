import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { getClickValue, getHireCost, getIncomePerSecond, getPartnerCost } from '../src/core/economy';
import { GameStore, simulate } from '../src/core/store';
import { makeState, T0 } from './helpers';

const staff = { intern: 0, junior: 0, senior: 0, manager: 0 };

describe('action manuelle', () => {
  it('crédite 1 € au départ et renvoie le montant crédité', () => {
    const { state, result } = applyAction(makeState(), { type: 'click' }, T0);
    expect(state.money).toBe(1);
    expect(result).toEqual({ ok: true, amount: 1 });
  });

  it('crédite la valeur améliorée après achat', () => {
    let state = makeState({ money: 550 });
    state = applyAction(state, { type: 'buyUpgrade', id: 'dualScreen' }, T0).state;
    state = applyAction(state, { type: 'buyUpgrade', id: 'keyboardShortcuts' }, T0).state;
    expect(getClickValue(state, T0)).toBe(4);
    const { state: after, result } = applyAction(state, { type: 'click' }, T0);
    expect(after.money - state.money).toBe(4);
    expect(result).toEqual({ ok: true, amount: 4 });
  });

  it('refuse un achat unique déjà fait', () => {
    const state = makeState({ money: 1_000, upgrades: ['dualScreen'] });
    const { state: after, result } = applyAction(state, { type: 'buyUpgrade', id: 'dualScreen' }, T0);
    expect(result).toEqual({ ok: false, reason: 'already_owned' });
    expect(after).toBe(state);
  });
});

describe('production passive', () => {
  const state = makeState({ staff: { ...staff, intern: 2, junior: 1 } });

  it('additionne la production des collaborateurs', () => {
    expect(getIncomePerSecond(state, T0)).toBe(5);
  });

  it('crédite 10 × revenu/s après 10 s', () => {
    expect(simulate(state, T0 + 10_000).money).toBeCloseTo(50, 9);
  });

  it('donne le même résultat en 1 tick de 10 s ou 40 ticks de 250 ms', () => {
    const once = simulate(state, T0 + 10_000);
    let many = state;
    for (let i = 1; i <= 40; i++) many = simulate(many, T0 + i * 250);
    expect(many.money).toBe(once.money);
    expect(many.lastSimulatedAt).toBe(once.lastSimulatedAt);
  });

  it('garde le temps restant pour le tick suivant', () => {
    const partial = simulate(state, T0 + 1_100);
    expect(partial.lastSimulatedAt).toBe(T0 + 1_000);
    expect(simulate(partial, T0 + 1_250).lastSimulatedAt).toBe(T0 + 1_250);
  });

  it('applique le bonus de réputation, plafonné à +200 %', () => {
    expect(getIncomePerSecond({ ...state, reputation: 50 }, T0)).toBeCloseTo(7.5, 9);
    expect(getIncomePerSecond({ ...state, reputation: 1_000 }, T0)).toBeCloseTo(15, 9);
  });

  it('applique un effet temporaire puis le retire à expiration', () => {
    const boosted = { ...state, effects: [{ id: 'fiscal', incomeMultiplier: 2, expiresAt: T0 + 20_000 }] };
    expect(getIncomePerSecond(boosted, T0)).toBe(10);
    expect(getIncomePerSecond(boosted, T0 + 20_000)).toBe(5);
    const after = simulate(boosted, T0 + 30_000);
    expect(after.money).toBeCloseTo(20 * 10 + 10 * 5, 9);
    expect(after.effects).toEqual([]);
  });
});

describe('coûts', () => {
  it('augmentent de 15 % par unité possédée, arrondis à l’euro supérieur', () => {
    expect(getHireCost(makeState(), 'intern')).toBe(15);
    expect(getHireCost(makeState({ staff: { ...staff, intern: 1 } }), 'intern')).toBe(Math.ceil(15 * 1.15));
    expect(getHireCost(makeState({ staff: { ...staff, intern: 10 } }), 'intern')).toBe(Math.ceil(15 * 1.15 ** 10));
  });

  it('coût des associés : 25 000 €, 100 000 €, 400 000 €', () => {
    expect([1, 2, 3].map((partners) => getPartnerCost(makeState({ partners })))).toEqual([25_000, 100_000, 400_000]);
  });

  it('refusent un achat sans fonds suffisants sans modifier l’état', () => {
    const state = makeState({ money: 14 });
    const { state: after, result } = applyAction(state, { type: 'hire', role: 'intern' }, T0);
    expect(result).toEqual({ ok: false, reason: 'insufficient_funds' });
    expect(after).toBe(state);
  });
});

describe('GameStore', () => {
  it('notifie les abonnés et permet de se désabonner', () => {
    const store = new GameStore(makeState());
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    store.dispatch({ type: 'click' }, T0);
    unsubscribe();
    store.dispatch({ type: 'click' }, T0);
    expect(calls).toBe(1);
    expect(store.getState().money).toBe(2);
  });

  it('crédite la production avant d’appliquer une action', () => {
    const store = new GameStore(makeState({ staff: { ...staff, junior: 1 } }));
    store.dispatch({ type: 'click' }, T0 + 1_000);
    expect(store.getState().money).toBe(5);
  });
});
