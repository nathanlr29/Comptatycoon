import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { getBaseIncomePerSecond, getClickValue, getMultipliers } from '../src/core/economy';
import { canBuyUpgrade } from '../src/core/upgrades';
import { UPGRADES, UPGRADE_IDS } from '../src/data/upgrades';
import { makeState, T0 } from './helpers';

describe('améliorations', () => {
  it('sont affichées par coût croissant et leurs prérequis existent', () => {
    const costs = UPGRADE_IDS.map((id) => UPGRADES[id].cost);
    expect(costs).toEqual([...costs].sort((a, b) => a - b));
    for (const id of UPGRADE_IDS) {
      const req = UPGRADES[id].requires;
      if (req) expect(UPGRADE_IDS.indexOf(req)).toBeLessThan(UPGRADE_IDS.indexOf(id));
    }
  });

  it('le Logiciel OCR exige le scanner puis triple la saisie', () => {
    const state = makeState({ money: 10_000 });
    expect(applyAction(state, { type: 'buyUpgrade', id: 'ocr' }, T0).result).toEqual({ ok: false, reason: 'missing_prerequisite' });
    const withScanner = applyAction(state, { type: 'buyUpgrade', id: 'scanner' }, T0).state;
    const { state: after, result } = applyAction(withScanner, { type: 'buyUpgrade', id: 'ocr' }, T0);
    expect(result.ok).toBe(true);
    expect(after.money).toBe(10_000 - 150 - 2_000);
    expect(getClickValue(after, T0)).toBe(3);
  });

  it('exige la réputation demandée', () => {
    expect(canBuyUpgrade(makeState({ money: 1e6, reputation: 4 }), 'reviewSoftware')).toMatchObject({ ok: false, reason: 'locked' });
    expect(canBuyUpgrade(makeState({ money: 1e6, reputation: 5 }), 'reviewSoftware').ok).toBe(true);
  });

  it('n’est pas achetable deux fois', () => {
    const state = makeState({ money: 1e6, upgrades: ['ebics'] });
    expect(applyAction(state, { type: 'buyUpgrade', id: 'ebics' }, T0).result).toEqual({ ok: false, reason: 'already_owned' });
  });

  it('multiplie les effets d’une même famille', () => {
    const m = getMultipliers(makeState({ upgrades: ['scanner', 'ocr', 'einvoicing', 'edi', 'ged'] }));
    expect(m.role.intern).toBe(3);
    expect(m.role.junior).toBe(1.5);
    expect(m.click).toBe(3);
    expect(m.global).toBeCloseTo(1.375);
  });

  it('EBICS double la production des juniors', () => {
    const staff = { intern: 0, junior: 10, senior: 0, manager: 0 };
    expect(getBaseIncomePerSecond(makeState({ staff }))).toBe(40);
    expect(getBaseIncomePerSecond(makeState({ staff, upgrades: ['ebics'] }))).toBe(80);
  });
});
