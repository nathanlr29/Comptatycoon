import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { getHireCost, getPartnerSeveranceCost, getSeveranceCost } from '../src/core/economy';
import { makeState, T0 } from './helpers';

const none = { intern: 0, junior: 0, senior: 0, manager: 0 };

describe('licenciement contre indemnité', () => {
  it('coûte 25 % du prix payé pour le dernier recruté', () => {
    // 3 juniors : le 3ᵉ a coûté ceil(120 × 1,15²) = 159 € → indemnité ceil(159 × 0,25) = 40 €.
    const state = makeState({ money: 100, staff: { ...none, junior: 3 } });
    expect(getSeveranceCost(state, 'junior')).toBe(40);
    const { state: after, result } = applyAction(state, { type: 'dismiss', role: 'junior' }, T0);
    expect(result.ok).toBe(true);
    expect(after.staff.junior).toBe(2);
    expect(after.money).toBe(60);
  });

  it('rend au poste le prix d’embauche précédent', () => {
    const state = makeState({ money: 1_000, staff: { ...none, intern: 4 } });
    const { state: after } = applyAction(state, { type: 'dismiss', role: 'intern' }, T0);
    expect(getHireCost(after, 'intern')).toBe(getHireCost(makeState({ staff: { ...none, intern: 3 } }), 'intern'));
  });

  it('refuse sans collaborateur dans la catégorie', () => {
    const state = makeState({ money: 1_000 });
    const outcome = applyAction(state, { type: 'dismiss', role: 'senior' }, T0);
    expect(outcome.result).toEqual({ ok: false, reason: 'nobody_to_dismiss' });
    expect(outcome.state).toBe(state);
  });

  it('refuse si l’indemnité n’est pas payable', () => {
    const state = makeState({ money: 3, staff: { ...none, junior: 1 } });
    expect(applyAction(state, { type: 'dismiss', role: 'junior' }, T0).result).toEqual({ ok: false, reason: 'insufficient_funds' });
  });

  it('ne laisse jamais le cabinet sans associé', () => {
    const state = makeState({ money: 1e9 });
    expect(applyAction(state, { type: 'dismissPartner' }, T0).result).toEqual({ ok: false, reason: 'last_partner' });
  });

  it('refuse le départ d’un associé si l’équipe dépasse les places restantes', () => {
    const state = makeState({ money: 1e9, partners: 2, staff: { ...none, intern: 16 } });
    expect(applyAction(state, { type: 'dismissPartner' }, T0).result).toEqual({ ok: false, reason: 'team_too_large' });
  });

  it('accepte le départ d’un associé contre 25 % de son prix', () => {
    const state = makeState({ money: 10_000, partners: 2, staff: { ...none, intern: 15 } });
    expect(getPartnerSeveranceCost(state)).toBe(6_250);
    const { state: after, result } = applyAction(state, { type: 'dismissPartner' }, T0);
    expect(result.ok).toBe(true);
    expect(after.partners).toBe(1);
    expect(after.money).toBe(3_750);
  });
});
