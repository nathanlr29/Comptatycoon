import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { canBuild, getConstructionMs, getHqLevel, getSlotVisual, getUpgradeCost } from '../src/core/buildings';
import { getIncomePerSecond } from '../src/core/economy';
import { simulate } from '../src/core/store';
import type { GameState } from '../src/core/state';
import { BUILDINGS } from '../src/data/buildings';
import { makeState, T0 } from './helpers';

const staff = { intern: 4, junior: 0, senior: 0, manager: 0 };
const OPEN_SLOT = 'start-w';
const EAST_SLOT = 'east-1';

function build(state: GameState, slotId: string, building: keyof typeof BUILDINGS, now = T0) {
  return applyAction(state, { type: 'build', slotId, building }, now);
}

describe('construction', () => {
  it('refuse sans fonds suffisants, sans modifier l’état', () => {
    const state = makeState({ money: 199 });
    const { state: after, result } = build(state, OPEN_SLOT, 'openSpace');
    expect(result).toEqual({ ok: false, reason: 'insufficient_funds' });
    expect(after).toBe(state);
  });

  it('refuse sans le niveau de Bureau principal requis', () => {
    expect(canBuild(makeState({ money: 1e6 }), OPEN_SLOT, 'meetingRoom')).toMatchObject({ ok: false, reason: 'requires_hq' });
  });

  it('refuse dans une zone verrouillée', () => {
    expect(canBuild(makeState({ money: 1e6 }), EAST_SLOT, 'openSpace')).toMatchObject({ ok: false, reason: 'zone_locked' });
  });

  it('refuse un emplacement occupé et un deuxième exemplaire', () => {
    const { state } = build(makeState({ money: 1e6 }), OPEN_SLOT, 'openSpace');
    expect(canBuild(state, OPEN_SLOT, 'serverRoom')).toMatchObject({ ok: false, reason: 'slot_taken' });
    expect(canBuild(state, 'start-e', 'openSpace')).toMatchObject({ ok: false, reason: 'already_owned' });
  });

  it('débite le coût et termine le chantier après exactement 10 s', () => {
    const { state } = build(makeState({ money: 500 }), OPEN_SLOT, 'openSpace');
    expect(state.money).toBe(300);
    expect(getSlotVisual(state, OPEN_SLOT)).toBe('construction');

    const before = simulate(state, T0 + 9_750);
    expect(before.buildings.find((b) => b.slotId === OPEN_SLOT)?.level).toBe(0);
    const done = simulate(state, T0 + 10_000);
    const building = done.buildings.find((b) => b.slotId === OPEN_SLOT);
    expect(building).toMatchObject({ level: 1 });
    expect(building?.pending).toBeUndefined();
    expect(done.reputation).toBe(1);
  });

  it('crédite la réputation bonus d’un décor', () => {
    const { state } = build(makeState({ money: 1_000 }), OPEN_SLOT, 'garden');
    expect(simulate(state, T0 + 10_000).reputation).toBe(1 + 3);
  });
});

describe('amélioration', () => {
  it('suit cost × 5^niveau, et la table explicite pour le Bureau principal', () => {
    expect(getUpgradeCost(BUILDINGS.openSpace, 1)).toBe(1_000);
    expect(getUpgradeCost(BUILDINGS.openSpace, 2)).toBe(5_000);
    expect([1, 2, 3, 4].map((l) => getUpgradeCost(BUILDINGS.headquarters, l))).toEqual([500, 5_000, 50_000, 500_000]);
  });

  it('durée = 10 s × niveau², plafonnée à 10 min', () => {
    expect(getConstructionMs(2)).toBe(40_000);
    expect(getConstructionMs(20)).toBe(600_000);
  });

  it('modifie le niveau et le revenu/s', () => {
    let state = makeState({ money: 1_000, staff });
    expect(getIncomePerSecond(state, T0)).toBe(2);
    state = applyAction(state, { type: 'upgradeBuilding', buildingId: 'hq' }, T0).state;
    expect(state.money).toBe(500);
    expect(applyAction(state, { type: 'upgradeBuilding', buildingId: 'hq' }, T0).result).toEqual({ ok: false, reason: 'under_construction' });
    state = simulate(state, T0 + getConstructionMs(2));
    expect(getHqLevel(state)).toBe(2);
    // +10 % (Bureau principal niv. 2) puis +1 % (1 point de réputation)
    expect(getIncomePerSecond(state, T0)).toBeCloseTo(2 * 1.1 * 1.01, 9);
  });

  it('l’open space augmente alternants et juniors de 25 % par niveau', () => {
    let state = build(makeState({ money: 200, staff }), OPEN_SLOT, 'openSpace').state;
    state = simulate(state, T0 + 10_000);
    expect(getIncomePerSecond({ ...state, reputation: 0 }, T0)).toBeCloseTo(2 * 1.25, 9);
  });

  it('refuse au-delà du niveau maximum', () => {
    const state = makeState({ money: 1e9, buildings: [{ id: 'hq', type: 'headquarters', level: 5, slotId: 'hq' }] });
    expect(applyAction(state, { type: 'upgradeBuilding', buildingId: 'hq' }, T0).result).toEqual({ ok: false, reason: 'max_level' });
  });
});

describe('zones et réputation passive', () => {
  it('ouvre l’Aile Est au niveau 2 du Bureau principal', () => {
    const hq2 = makeState({ money: 1e6, buildings: [{ id: 'hq', type: 'headquarters', level: 2, slotId: 'hq' }] });
    expect(getSlotVisual(makeState(), EAST_SLOT)).toBe('locked');
    expect(getSlotVisual(hq2, EAST_SLOT)).toBe('available');
    expect(canBuild(hq2, EAST_SLOT, 'openSpace').ok).toBe(true);
  });

  it('une salle de réunion donne 1 point de réputation toutes les 120 s', () => {
    const state = makeState({
      buildings: [
        { id: 'hq', type: 'headquarters', level: 2, slotId: 'hq' },
        { id: 'meeting', type: 'meetingRoom', level: 1, slotId: OPEN_SLOT },
      ],
    });
    expect(simulate(state, T0 + 119_750).reputation).toBe(0);
    expect(simulate(state, T0 + 120_000).reputation).toBe(1);
    expect(simulate(state, T0 + 360_000).reputation).toBe(3);
  });
});

describe('état visuel', () => {
  it('n’affiche jamais construit un bâtiment en chantier', () => {
    const { state } = build(makeState({ money: 1e6 }), OPEN_SLOT, 'openSpace');
    expect(getSlotVisual(state, OPEN_SLOT)).toBe('construction');
    expect(getSlotVisual(simulate(state, T0 + 10_000), OPEN_SLOT)).toBe('upgradable');
    expect(getSlotVisual(simulate({ ...state, money: 0 }, T0 + 10_000), OPEN_SLOT)).toBe('built');
  });
});
