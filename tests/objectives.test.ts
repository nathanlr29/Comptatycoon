import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { getObjectiveProgress, getVisibleObjectives } from '../src/core/objectives';
import { OBJECTIVES } from '../src/data/objectives';
import { makeState, T0 } from './helpers';

const claim = (id: string) => ({ type: 'claimObjective', id }) as const;

describe('objectifs', () => {
  it('ont entre 12 et 15 entrées aux identifiants uniques', () => {
    expect(OBJECTIVES.length).toBeGreaterThanOrEqual(12);
    expect(OBJECTIVES.length).toBeLessThanOrEqual(15);
    expect(new Set(OBJECTIVES.map((o) => o.id)).size).toBe(OBJECTIVES.length);
  });

  it('montrent les deux premiers non réclamés, dans l’ordre', () => {
    expect(getVisibleObjectives(makeState()).map((o) => o.id)).toEqual(['firstInvoices', 'interns5']);
    expect(getVisibleObjectives(makeState({ claimedObjectives: ['firstInvoices'] })).map((o) => o.id)).toEqual(['interns5', 'income10']);
  });

  it('suivent la progression, plafonnée à la cible', () => {
    const def = OBJECTIVES[0]!;
    expect(getObjectiveProgress(makeState({ stats: { totalEarned: 0, clicks: 4, playMs: 0 } }), def, T0)).toEqual({ current: 4, target: 10, done: false });
    expect(getObjectiveProgress(makeState({ stats: { totalEarned: 0, clicks: 25, playMs: 0 } }), def, T0)).toEqual({ current: 10, target: 10, done: true });
  });

  it('se réclament une seule fois, seulement atteints et visibles', () => {
    const state = makeState({ stats: { totalEarned: 0, clicks: 10, playMs: 0 } });
    expect(applyAction(makeState(), claim('firstInvoices'), T0).result).toEqual({ ok: false, reason: 'missing_prerequisite' });
    expect(applyAction(state, claim('income1000'), T0).result).toEqual({ ok: false, reason: 'locked' });
    const { state: after, result } = applyAction(state, claim('firstInvoices'), T0);
    expect(result.ok).toBe(true);
    expect(after.money).toBe(15);
    expect(after.claimedObjectives).toEqual(['firstInvoices']);
    expect(applyAction(after, claim('firstInvoices'), T0).result).toEqual({ ok: false, reason: 'already_owned' });
  });

  it('une récompense en réputation est créditée', () => {
    const state = makeState({ staff: { intern: 20, junior: 0, senior: 0, manager: 0 }, claimedObjectives: ['firstInvoices', 'interns5'] });
    const { state: after } = applyAction(state, claim('income10'), T0);
    expect(after.reputation).toBe(1);
  });
});
