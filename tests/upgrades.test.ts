import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { getBaseIncomePerSecond, getClickValue, getMultipliers } from '../src/core/economy';
import { canBuyUpgrade, isUpgradeListed } from '../src/core/upgrades';
import { BUILDINGS } from '../src/data/buildings';
import { UPGRADE_CATEGORIES, UPGRADES, UPGRADE_IDS } from '../src/data/upgrades';
import type { GameState } from '../src/core/state';
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

  it('chaque rubrique existe, chaque palier suit le précédent de la même rubrique, chaque pièce requise existe', () => {
    const categories = UPGRADE_CATEGORIES.map((c) => c.id);
    for (const id of UPGRADE_IDS) {
      const def = UPGRADES[id];
      expect(categories).toContain(def.category);
      if ((def.tier ?? 1) > 1) {
        expect(def.requires).toBeDefined();
        expect(UPGRADES[def.requires!].category).toBe(def.category);
        expect(UPGRADES[def.requires!].tier).toBe(def.tier! - 1);
      }
      if (def.requiresBuilding) expect(BUILDINGS[def.requiresBuilding.type].maxLevel).toBeGreaterThanOrEqual(def.requiresBuilding.level);
    }
  });

  const server = (level: number, pending = false): GameState['buildings'] => [
    { id: 'hq', type: 'headquarters', level: 1, slotId: 'hq' },
    { id: 'srv', type: 'serverRoom', level, slotId: 'serverRoom', ...(pending ? { pending: { targetLevel: level + 1, endsAt: T0 + 1 } } : {}) },
  ];

  it('les technologies exigent la Salle serveurs au niveau voulu, travaux terminés', () => {
    const base = { money: 1e7, reputation: 100, upgrades: ['scanner', 'ocr'] as GameState['upgrades'] };
    expect(canBuyUpgrade(makeState(base), 'automation')).toMatchObject({ ok: false, reason: 'missing_building' });
    expect(canBuyUpgrade(makeState({ ...base, buildings: server(0, true) }), 'automation')).toMatchObject({ ok: false, reason: 'missing_building' });
    expect(canBuyUpgrade(makeState({ ...base, buildings: server(1) }), 'automation').ok).toBe(true);
    const withAuto = { ...base, upgrades: [...base.upgrades, 'automation'] as GameState['upgrades'] };
    expect(canBuyUpgrade(makeState({ ...withAuto, buildings: server(2, true) }), 'aiAssistant')).toMatchObject({ ok: false, reason: 'missing_building' });
    expect(canBuyUpgrade(makeState({ ...withAuto, buildings: server(3) }), 'aiAssistant').ok).toBe(true);
  });

  it('l’Assistant IA porte la part du revenu/s ajoutée au clic à 12 %', () => {
    const all = UPGRADE_IDS.filter((id) => UPGRADES[id].effect.clickIncomeShare);
    expect(getMultipliers(makeState({ upgrades: all })).clickIncomeShare).toBeCloseTo(0.12);
    expect(getMultipliers(makeState({ upgrades: ['aiAssistant'] })).global).toBeCloseTo(1.5);
  });

  it('une certification donne sa réputation à l’achat, une seule fois', () => {
    const state = makeState({ money: 20_000, reputation: 5 });
    const { state: after, result } = applyAction(state, { type: 'buyUpgrade', id: 'qualityCharter' }, T0);
    expect(result.ok).toBe(true);
    expect(after.reputation).toBe(8);
    expect(after.money).toBe(10_000);
    expect(applyAction(after, { type: 'buyUpgrade', id: 'qualityCharter' }, T0).state.reputation).toBe(8);
  });

  it('un palier de formation n’apparaît qu’après le précédent', () => {
    const state = makeState();
    expect(isUpgradeListed(state, 'internTraining1')).toBe(true);
    expect(isUpgradeListed(state, 'internTraining2')).toBe(false);
    expect(isUpgradeListed(makeState({ upgrades: ['internTraining1'] }), 'internTraining2')).toBe(true);
    expect(isUpgradeListed(state, 'ocr')).toBe(true);
  });

  it('les formations d’une catégorie se multiplient : × 4,5 au total', () => {
    const m = getMultipliers(makeState({ upgrades: ['juniorTraining1', 'juniorTraining2', 'juniorTraining3'] }));
    expect(m.role.junior).toBeCloseTo(4.5);
    expect(m.role.senior).toBe(1);
  });
});
