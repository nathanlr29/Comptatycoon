import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { canBuild, findFreeSlot, getBuildingVisual, getConstructionMs, getUpgradeCost } from '../src/core/buildings';
import { getIncomePerSecond } from '../src/core/economy';
import { simulate } from '../src/core/store';
import type { BuildingState, GameState } from '../src/core/state';
import { BUILDINGS, CONSTRUCTIBLE, type BuildingType } from '../src/data/buildings';
import { MAX_FIRM_LEVEL } from '../src/data/expansion';
import { EXTERIOR_TYPES, ROOMS } from '../src/data/office';
import { makeState, T0 } from './helpers';

const staff = { intern: 4, junior: 0, senior: 0, manager: 0 };
const hq = (level: number): BuildingState => ({ id: 'hq', type: 'headquarters', level, slotId: 'hq' });
/** Cabinet agrandi au niveau `level`, avec de quoi payer. */
const firm = (level: number, patch: Partial<GameState> = {}) => makeState({ money: 1e6, buildings: [hq(level)], ...patch });
const room = (state: GameState, type: BuildingType) => state.buildings.find((b) => b.type === type);

function build(state: GameState, building: BuildingType, now = T0) {
  return applyAction(state, { type: 'build', building }, now);
}

describe('aménagement depuis le menu', () => {
  it('refuse sans fonds suffisants, sans modifier l’état', () => {
    const state = firm(2, { money: 199 });
    const { state: after, result } = build(state, 'openSpace');
    expect(result).toEqual({ ok: false, reason: 'insufficient_funds' });
    expect(after).toBe(state);
  });

  it('refuse sans le niveau de cabinet requis', () => {
    expect(canBuild(firm(1), 'garden')).toMatchObject({ ok: false, reason: 'requires_hq' });
  });

  it('refuse d’aménager l’espace d’un pôle : il vient avec le pôle', () => {
    expect(canBuild(firm(5), 'advisoryWing')).toMatchObject({ ok: false, reason: 'unknown' });
  });

  it('le petit bureau de départ a déjà la place de l’open space et de la salle serveurs', () => {
    expect(canBuild(firm(1), 'openSpace')).toMatchObject({ ok: true, slotId: 'openSpace' });
    expect(canBuild(firm(1), 'serverRoom')).toMatchObject({ ok: true });
    expect(canBuild(firm(1), 'meetingRoom')).toMatchObject({ ok: false, reason: 'requires_hq' });
  });

  it('refuse un deuxième exemplaire', () => {
    const { state } = build(firm(2), 'openSpace');
    expect(canBuild(state, 'openSpace')).toMatchObject({ ok: false, reason: 'already_owned' });
  });

  it('chaque pièce a sa place fixe sur le plan, qui existe au niveau de cabinet demandé', () => {
    for (const type of CONSTRUCTIBLE) {
      if (EXTERIOR_TYPES.includes(type)) continue;
      const place = ROOMS.find((r) => r.type === type);
      expect(place, type).toBeDefined();
      expect(BUILDINGS[type].requiresHq, type).toBeGreaterThanOrEqual(place!.minStage);
      expect(findFreeSlot(firm(BUILDINGS[type].requiresHq), type), type).toBe(type);
    }
    const { state } = build(firm(4), 'fountain');
    expect(room(state, 'fountain')?.slotId).toBe('fountain');
    expect(findFreeSlot(state, 'fountain')).toBeUndefined();
  });

  it('débite le coût et termine les travaux après exactement 10 s', () => {
    const { state } = build(firm(2, { money: 500 }), 'openSpace');
    expect(state.money).toBe(300);
    expect(room(state, 'openSpace')).toMatchObject({ id: 'openSpace', level: 0 });

    expect(room(simulate(state, T0 + 9_750), 'openSpace')?.level).toBe(0);
    const done = simulate(state, T0 + 10_000);
    expect(room(done, 'openSpace')).toEqual({ id: 'openSpace', type: 'openSpace', level: 1, slotId: room(state, 'openSpace')?.slotId });
    expect(done.reputation).toBe(1);
  });

  it('crédite la réputation bonus d’un décor', () => {
    const { state } = build(firm(4, { money: 1_000 }), 'garden');
    expect(simulate(state, T0 + 10_000).reputation).toBe(1 + 3);
  });
});

describe('amélioration', () => {
  it('suit cost × 5^niveau, et la table explicite pour le Bureau principal', () => {
    expect(getUpgradeCost(BUILDINGS.openSpace, 1)).toBe(1_000);
    expect(getUpgradeCost(BUILDINGS.openSpace, 2)).toBe(5_000);
    expect([1, 2, 3, 4].map((l) => getUpgradeCost(BUILDINGS.headquarters, l))).toEqual([500, 7_500, 500_000, 25_000_000]);
  });

  it('durée = 10 s × niveau², plafonnée à 10 min', () => {
    expect(getConstructionMs(2)).toBe(40_000);
    expect(getConstructionMs(20)).toBe(600_000);
  });

  it('modifie le niveau et le revenu/s (open space +25 % par niveau)', () => {
    let state = simulate(build(firm(2, { money: 1_200, staff }), 'openSpace').state, T0 + 10_000);
    const base = { ...state, reputation: 0 };
    expect(getIncomePerSecond(base, T0)).toBeCloseTo(getIncomePerSecond({ ...base, buildings: [hq(2)] }, T0) * 1.25, 9);

    const moneyBefore = state.money;
    state = applyAction(state, { type: 'upgradeBuilding', buildingId: 'openSpace' }, T0 + 10_000).state;
    expect(moneyBefore - state.money).toBe(1_000);
    expect(applyAction(state, { type: 'upgradeBuilding', buildingId: 'openSpace' }, T0).result).toEqual({ ok: false, reason: 'under_construction' });
    state = simulate(state, T0 + 10_000 + getConstructionMs(2));
    expect(room(state, 'openSpace')?.level).toBe(2);
    expect(getIncomePerSecond({ ...state, reputation: 0 }, T0)).toBeCloseTo(getIncomePerSecond({ ...base, buildings: [hq(2)] }, T0) * 1.5, 9);
  });

  it('refuse au-delà du niveau maximum', () => {
    const state = makeState({ money: 1e15, buildings: [hq(MAX_FIRM_LEVEL)] });
    expect(applyAction(state, { type: 'upgradeBuilding', buildingId: 'hq' }, T0).result).toEqual({ ok: false, reason: 'max_level' });
  });
});

describe('locaux et réputation passive', () => {
  it('une salle de réunion donne 1 point de réputation toutes les 120 s', () => {
    const state = makeState({ buildings: [hq(2), { id: 'meetingRoom', type: 'meetingRoom', level: 1, slotId: 'meetingRoom' }] });
    expect(simulate(state, T0 + 119_750).reputation).toBe(0);
    expect(simulate(state, T0 + 120_000).reputation).toBe(1);
    expect(simulate(state, T0 + 360_000).reputation).toBe(3);
  });
});

describe('état visuel', () => {
  it('n’affiche jamais aménagée une pièce en travaux', () => {
    const { state } = build(firm(2), 'openSpace');
    expect(getBuildingVisual(state, room(state, 'openSpace')!)).toBe('works');
    const done = simulate(state, T0 + 10_000);
    expect(getBuildingVisual(done, room(done, 'openSpace')!)).toBe('upgradable');
    const poor = simulate({ ...state, money: 0 }, T0 + 10_000);
    expect(getBuildingVisual(poor, room(poor, 'openSpace')!)).toBe('built');
    const upgrading = applyAction(done, { type: 'upgradeBuilding', buildingId: 'openSpace' }, T0 + 10_000).state;
    expect(getBuildingVisual(upgrading, room(upgrading, 'openSpace')!)).toBe('works');
  });
});
