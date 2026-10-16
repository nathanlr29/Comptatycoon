import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { getBaseIncomePerSecond } from '../src/core/economy';
import { getFirmLevel } from '../src/core/expansion';
import { canSellFirm, getContactsForSale, getPrestigeMultiplier } from '../src/core/prestige';
import type { BuildingState, GameState } from '../src/core/state';
import { makeState, T0 } from './helpers';

const firm = (level: number): BuildingState[] => [{ id: 'hq', type: 'headquarters', level, slotId: 'hq' }];
const staff = { intern: 0, junior: 2, senior: 0, manager: 0 };

/** Cabinet au siège, 100 M€ facturés pendant la partie. */
function seat(patch: Partial<GameState> = {}): GameState {
  return makeState({
    money: 5e7,
    reputation: 80,
    staff: { intern: 3, junior: 10, senior: 20, manager: 15 },
    partners: 4,
    upgrades: ['dualScreen', 'scanner'],
    departments: ['social'],
    buildings: firm(5),
    claimedObjectives: ['firstInvoices'],
    stats: { totalEarned: 1e8, clicks: 5_000 },
    ...patch,
  });
}

describe('cession du cabinet', () => {
  it('rapporte √(CA de la partie / 1 M€) contacts, arrondis à l’inférieur', () => {
    expect(getContactsForSale(seat({ stats: { totalEarned: 999_999, clicks: 0 } }))).toBe(0);
    expect(getContactsForSale(seat({ stats: { totalEarned: 1e6, clicks: 0 } }))).toBe(1);
    expect(getContactsForSale(seat())).toBe(10);
    expect(getContactsForSale(seat({ stats: { totalEarned: 1e10, clicks: 0 } }))).toBe(100);
  });

  it('donne 50 % de contacts en plus en Exigeant', () => {
    expect(getContactsForSale(seat({ difficulty: 'hard' }))).toBe(15);
    expect(getContactsForSale(seat({ difficulty: 'relaxed' }))).toBe(10);
  });

  it('demande un cabinet agrandi jusqu’au siège', () => {
    expect(canSellFirm(seat({ buildings: firm(4) }))).toEqual({ ok: false, reason: 'missing_prerequisite', contacts: 10 });
    expect(canSellFirm(seat({ stats: { totalEarned: 0, clicks: 0 } }))).toEqual({ ok: false, reason: 'locked', contacts: 0 });
    expect(canSellFirm(seat())).toEqual({ ok: true, contacts: 10 });
  });

  it('repart du petit bureau en gardant mode, contacts et date de fondation', () => {
    const before = seat({ difficulty: 'hard', createdAt: T0 - 1_000, prestige: { contacts: 4, sales: 1, pastEarned: 2e7 } });
    const { state, result } = applyAction(before, { type: 'sellFirm' }, T0 + 5_000);
    expect(result).toEqual({ ok: true, amount: 15 });
    expect(state.prestige).toEqual({ contacts: 19, sales: 2, pastEarned: 2e7 + 1e8 });
    expect(state.difficulty).toBe('hard');
    expect(state.createdAt).toBe(T0 - 1_000);
    expect(state.lastSimulatedAt).toBe(T0 + 5_000);
    expect([state.money, state.reputation, state.partners, getFirmLevel(state)]).toEqual([0, 0, 1, 1]);
    expect([state.upgrades, state.departments, state.claimedObjectives]).toEqual([[], [], []]);
    expect(state.stats).toEqual({ totalEarned: 0, clicks: 0 });
  });

  it('refuse sans rien changer si le cabinet n’est pas au siège', () => {
    const before = seat({ buildings: firm(3) });
    const outcome = applyAction(before, { type: 'sellFirm' }, T0);
    expect(outcome.result).toEqual({ ok: false, reason: 'missing_prerequisite' });
    expect(outcome.state).toBe(before);
  });

  it('chaque contact ajoute 10 % de production, pour toute la suite', () => {
    const plain = makeState({ staff });
    const networked = makeState({ staff, prestige: { contacts: 12, sales: 1, pastEarned: 0 } });
    expect(getPrestigeMultiplier(networked)).toBeCloseTo(2.2, 9);
    expect(getBaseIncomePerSecond(networked)).toBeCloseTo(getBaseIncomePerSecond(plain) * 2.2, 9);
  });
});
