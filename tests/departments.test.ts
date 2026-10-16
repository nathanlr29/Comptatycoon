import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import {
  canBuyDepartment,
  getMissingRequirements,
  getPortfolioCost,
  isProtectedFromTaxAudit,
  resolveTaxAudit,
} from '../src/core/departments';
import { getBaseIncomePerSecond, getMultipliers } from '../src/core/economy';
import type { BuildingState, GameState } from '../src/core/state';
import { DEPARTMENTS } from '../src/data/departments';
import { makeState, T0 } from './helpers';

const wing = (type: string, level = 1): BuildingState => ({ id: type, type, level, slotId: 'east-1' });
const hq: BuildingState = { id: 'hq', type: 'headquarters', level: 1, slotId: 'hq' };
const noStaff = { intern: 0, junior: 0, senior: 0, manager: 0 };

function ready(patch: Partial<GameState> = {}): GameState {
  return makeState({
    money: 1e7,
    reputation: 100,
    buildings: [hq, wing('socialWing'), wing('legalWing'), wing('advisoryWing')],
    ...patch,
  });
}

describe('ouverture des pôles', () => {
  it('débite le coût, ajoute le pôle et +5 réputation', () => {
    const { state, result } = applyAction(ready({ money: 25_000, reputation: 15 }), { type: 'buyDepartment', id: 'social' }, T0);
    expect(result).toEqual({ ok: true });
    expect(state.money).toBe(5_000);
    expect(state.reputation).toBe(20);
    expect(state.departments).toEqual(['social']);
  });

  it('refuse un deuxième achat du même pôle', () => {
    const first = applyAction(ready(), { type: 'buyDepartment', id: 'legal' }, T0).state;
    const second = applyAction(first, { type: 'buyDepartment', id: 'legal' }, T0);
    expect(second.result).toEqual({ ok: false, reason: 'already_owned' });
    expect(second.state).toBe(first);
  });

  it('exige les locaux aménagés (pas en premier chantier)', () => {
    const noWing = ready({ buildings: [hq] });
    expect(canBuyDepartment(noWing, 'social')).toMatchObject({ ok: false, reason: 'missing_prerequisite' });
    const underWorks = ready({ buildings: [hq, wing('socialWing', 0)] });
    expect(canBuyDepartment(underWorks, 'social')).toMatchObject({ ok: false, reason: 'missing_prerequisite' });
  });

  it('exige la réputation, puis les fonds', () => {
    expect(canBuyDepartment(ready({ reputation: 49 }), 'advisory')).toMatchObject({ ok: false, reason: 'locked' });
    expect(canBuyDepartment(ready({ money: 399_999 }), 'advisory')).toMatchObject({ ok: false, reason: 'insufficient_funds' });
    expect(canBuyDepartment(ready({ money: 400_000, reputation: 50 }), 'advisory')).toEqual({ ok: true, cost: 400_000 });
  });

  it('liste les prérequis manquants en clair', () => {
    const missing = getMissingRequirements(makeState({ reputation: 3 }), 'legal');
    expect(missing).toEqual([
      { kind: 'building', name: 'Locaux Pôle Juridique' },
      { kind: 'reputation', required: 25 },
    ]);
    expect(getMissingRequirements(ready(), 'legal')).toEqual([]);
  });
});

describe('effets des pôles sur le revenu', () => {
  const staff = { intern: 0, junior: 10, senior: 2, manager: 1 };
  // 10 × 4 + 2 × 30 + 1 × 250 = 350 €/s, réputation 0.
  const base = makeState({ staff });

  it('Pôle Social : +150 €/s avant les multiplicateurs, juniors × 1,5', () => {
    const s = makeState({ staff, departments: ['social'] });
    expect(getBaseIncomePerSecond(base)).toBe(350);
    expect(getBaseIncomePerSecond(s)).toBe(10 * 4 * 1.5 + 60 + 250 + 150);
  });

  it('Pôle Juridique : seniors × 1,5', () => {
    expect(getBaseIncomePerSecond(makeState({ staff, departments: ['legal'] }))).toBe(40 + 90 + 250);
  });

  it('Conseil & Audit : production × 2 et managers × 1,5, y compris sur le fixe du Pôle Social', () => {
    expect(getBaseIncomePerSecond(makeState({ staff, departments: ['advisory'] }))).toBe((40 + 60 + 375) * 2);
    const both = makeState({ staff: noStaff, departments: ['social', 'advisory'] });
    expect(getBaseIncomePerSecond(both)).toBe(300);
  });

  it('se multiplie avec les améliorations de la même catégorie', () => {
    const m = getMultipliers(makeState({ upgrades: ['ebics'], departments: ['social'] }));
    expect(m.role.junior).toBe(3);
  });

  it('applique la réputation après le fixe', () => {
    expect(getBaseIncomePerSecond(makeState({ staff: noStaff, departments: ['social'], reputation: 50 }))).toBe(225);
  });
});

describe('rachat de portefeuille clients', () => {
  it('coûte ceil(10 000 × 1,5^n)', () => {
    expect(getPortfolioCost(makeState())).toBe(10_000);
    expect(getPortfolioCost(makeState({ portfolios: 3 }))).toBe(33_750);
  });

  it('nécessite le Pôle Social', () => {
    const { result } = applyAction(ready(), { type: 'buyPortfolio' }, T0);
    expect(result).toEqual({ ok: false, reason: 'missing_prerequisite' });
  });

  it('est répétable : +2 réputation et +5 % de production par rachat', () => {
    let state = ready({ reputation: 0, departments: ['social'], staff: noStaff });
    for (let i = 0; i < 2; i++) state = applyAction(state, { type: 'buyPortfolio' }, T0).state;
    expect(state.portfolios).toBe(2);
    expect(state.reputation).toBe(4);
    expect(state.money).toBe(1e7 - 10_000 - 15_000);
    expect(getMultipliers(state).global).toBeCloseTo(1.1, 10);
  });
});

describe('contrôle fiscal', () => {
  it('le Pôle Juridique immunise et donne +1 réputation', () => {
    const state = makeState({ money: 10_000, reputation: 30, departments: ['legal'] });
    expect(isProtectedFromTaxAudit(state)).toBe(true);
    const out = resolveTaxAudit(state, 100);
    expect(out).toMatchObject({ protected: true, loss: 0, reputationChange: 1 });
    expect(out.state.money).toBe(10_000);
    expect(out.state.reputation).toBe(31);
  });

  it('sans protection, la perte est plafonnée à 10 % du solde', () => {
    const out = resolveTaxAudit(makeState({ money: 10_000, reputation: 10 }), 100);
    expect(out.loss).toBe(1_000);
    expect(out.state.money).toBe(9_000);
    expect(out.state.reputation).toBe(8);
  });

  it('sans protection, la perte est plafonnée à 300 × revenu/s', () => {
    const out = resolveTaxAudit(makeState({ money: 1_000_000 }), 10);
    expect(out.loss).toBe(3_000);
  });

  it('ne rend jamais le solde ni la réputation négatifs', () => {
    const out = resolveTaxAudit(makeState({ money: 0, reputation: 1 }), 50);
    expect(out.state.money).toBe(0);
    expect(out.state.reputation).toBe(0);
    expect(out.reputationChange).toBe(-1);
  });

  it('seul le Pôle Juridique protège', () => {
    expect(isProtectedFromTaxAudit(makeState({ departments: ['social', 'advisory'] }))).toBe(false);
    expect(DEPARTMENTS.legal.effect.taxAuditImmunity).toBe(true);
  });
});
