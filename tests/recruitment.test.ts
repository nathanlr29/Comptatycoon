import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { getCapacity, getStaffCount, resign } from '../src/core/recruitment';
import { makeState, T0 } from './helpers';

const full = { intern: 10, junior: 5, senior: 0, manager: 0 };

describe('capacité d’encadrement', () => {
  it('vaut 15 places par associé, associés non comptés', () => {
    const state = makeState({ staff: full });
    expect(getCapacity(state)).toBe(15);
    expect(getStaffCount(state)).toBe(15);
  });

  it('un associé ajoute 15 places', () => {
    const state = makeState({ money: 25_000, reputation: 10 });
    const { state: after, result } = applyAction(state, { type: 'hirePartner' }, T0);
    expect(result.ok).toBe(true);
    expect(after.partners).toBe(2);
    expect(getCapacity(after)).toBe(30);
    expect(after.money).toBe(0);
  });

  it('refuse un collaborateur à 15 / 15', () => {
    const state = makeState({ money: 1e6, staff: full });
    const { state: after, result } = applyAction(state, { type: 'hire', role: 'intern' }, T0);
    expect(result).toEqual({ ok: false, reason: 'capacity_full' });
    expect(after).toBe(state);
  });

  it('accepte un associé à 15 / 15', () => {
    const state = makeState({ money: 1e6, reputation: 10, staff: full });
    expect(applyAction(state, { type: 'hirePartner' }, T0).result.ok).toBe(true);
  });

  it('bloque une catégorie tant que la réputation est insuffisante', () => {
    const state = makeState({ money: 1e6, reputation: 4 });
    expect(applyAction(state, { type: 'hire', role: 'senior' }, T0).result).toEqual({ ok: false, reason: 'locked' });
    expect(applyAction({ ...state, reputation: 5 }, { type: 'hire', role: 'senior' }, T0).result.ok).toBe(true);
  });
});

describe('démission', () => {
  it('retire un collaborateur sans jamais passer sous zéro', () => {
    const state = makeState({ staff: { intern: 1, junior: 0, senior: 0, manager: 0 } });
    const once = resign(state, 'intern');
    expect(once.staff.intern).toBe(0);
    expect(resign(once, 'intern')).toBe(once);
    expect(resign(once, 'junior').staff.junior).toBe(0);
  });

  it('ne touche jamais aux associés', () => {
    const state = makeState({ partners: 2, staff: full });
    expect(resign(state, 'intern').partners).toBe(2);
  });
});
