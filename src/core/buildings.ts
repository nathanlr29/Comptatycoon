import { BUILDINGS, CONSTRUCTION, type BuildingDefinition, type BuildingType } from '../data/buildings';
import { HQ_SLOT, SLOTS, getZone, isZoneUnlocked } from '../data/map';
import type { RefusalReason } from './refusals';
import type { BuildingState, GameState } from './state';

export type BuildCheck =
  | { ok: true; cost: number; durationMs: number }
  | { ok: false; reason: RefusalReason; cost: number; durationMs: number };

/** Ce que la carte doit dessiner pour un emplacement. */
export type SlotVisual = 'locked' | 'available' | 'construction' | 'built' | 'upgradable';

export function getHqLevel(state: GameState): number {
  return state.buildings.find((b) => b.type === 'headquarters')?.level ?? 1;
}

export function getBuildingAt(state: GameState, slotId: string): BuildingState | undefined {
  return state.buildings.find((b) => b.slotId === slotId);
}

export function getUpgradeCost(def: BuildingDefinition, level: number): number {
  return def.upgradeCosts?.[level - 1] ?? Math.ceil(def.cost * CONSTRUCTION.upgradeCostGrowth ** level);
}

/** Durée du chantier pour atteindre `targetLevel`. */
export function getConstructionMs(targetLevel: number): number {
  return Math.min(CONSTRUCTION.maxMs, CONSTRUCTION.baseMs * targetLevel ** 2);
}

function slotZoneUnlocked(state: GameState, slotId: string): boolean | undefined {
  const slot = SLOTS.find((s) => s.id === slotId);
  return slot && isZoneUnlocked(getZone(slot.zone), getHqLevel(state));
}

export function canBuild(state: GameState, slotId: string, type: BuildingType): BuildCheck {
  const def = BUILDINGS[type];
  const base = { cost: def.cost, durationMs: getConstructionMs(1) };
  const unlocked = slotZoneUnlocked(state, slotId);
  if (unlocked === undefined || type === 'headquarters') return { ok: false, reason: 'unknown', ...base };
  if (!unlocked) return { ok: false, reason: 'zone_locked', ...base };
  if (getBuildingAt(state, slotId)) return { ok: false, reason: 'slot_taken', ...base };
  if (state.buildings.some((b) => b.type === type)) return { ok: false, reason: 'already_owned', ...base };
  if (getHqLevel(state) < def.requiresHq) return { ok: false, reason: 'requires_hq', ...base };
  if (state.money < def.cost) return { ok: false, reason: 'insufficient_funds', ...base };
  return { ok: true, ...base };
}

export function canUpgrade(state: GameState, buildingId: string): BuildCheck {
  const building = state.buildings.find((b) => b.id === buildingId);
  if (!building) return { ok: false, reason: 'unknown', cost: 0, durationMs: 0 };
  const def = BUILDINGS[building.type];
  const target = building.level + 1;
  const base = { cost: getUpgradeCost(def, building.level), durationMs: getConstructionMs(target) };
  if (building.pending) return { ok: false, reason: 'under_construction', ...base };
  if (building.level >= def.maxLevel) return { ok: false, reason: 'max_level', ...base };
  if (state.money < base.cost) return { ok: false, reason: 'insufficient_funds', ...base };
  return { ok: true, ...base };
}

/** Lance le chantier d'un nouveau bâtiment (à appeler après `canBuild`). */
export function startBuild(state: GameState, slotId: string, type: BuildingType, check: BuildCheck, now: number): GameState {
  const building: BuildingState = {
    id: `${type}-${slotId}`,
    type,
    level: 0,
    slotId,
    pending: { targetLevel: 1, endsAt: now + check.durationMs },
  };
  return { ...state, money: state.money - check.cost, buildings: [...state.buildings, building] };
}

/** Lance l'amélioration d'un bâtiment (à appeler après `canUpgrade`). */
export function startUpgrade(state: GameState, buildingId: string, check: BuildCheck, now: number): GameState {
  return {
    ...state,
    money: state.money - check.cost,
    buildings: state.buildings.map((b) =>
      b.id === buildingId ? { ...b, pending: { targetLevel: b.level + 1, endsAt: now + check.durationMs } } : b,
    ),
  };
}

/** Termine les chantiers échus à `now` et crédite leur réputation. */
export function completeConstructions(state: GameState, now: number): GameState {
  if (!state.buildings.some((b) => b.pending && b.pending.endsAt <= now)) return state;
  let reputation = state.reputation;
  const buildings = state.buildings.map((b) => {
    if (!b.pending || b.pending.endsAt > now) return b;
    const def = BUILDINGS[b.type];
    reputation += CONSTRUCTION.reputationPerBuild;
    if (b.level === 0) reputation += def.effect.reputationOnBuild ?? 0;
    return { id: b.id, type: b.type, slotId: b.slotId, level: b.pending.targetLevel };
  });
  return { ...state, buildings, reputation };
}

/** Réputation passive des salles de réunion sur `ms` millisecondes. */
export function accrueReputation(state: GameState, ms: number): GameState {
  let perMs = 0;
  for (const b of state.buildings) {
    const every = BUILDINGS[b.type].effect.reputationEveryMs;
    if (every && b.level > 0) perMs += b.level / every;
  }
  if (perMs === 0) return state;
  const progress = state.reputationProgress + perMs * ms;
  const whole = Math.floor(progress + 1e-9);
  return { ...state, reputation: state.reputation + whole, reputationProgress: Math.max(0, progress - whole) };
}

export function getSlotVisual(state: GameState, slotId: string): SlotVisual {
  const building = slotId === HQ_SLOT.id ? state.buildings.find((b) => b.type === 'headquarters') : getBuildingAt(state, slotId);
  if (!building) return slotZoneUnlocked(state, slotId) === false ? 'locked' : 'available';
  if (building.pending) return 'construction';
  return building.level < BUILDINGS[building.type].maxLevel && canUpgrade(state, building.id).ok ? 'upgradable' : 'built';
}

/** Avancement du chantier entre 0 et 1. */
export function getConstructionProgress(building: BuildingState, now: number): number {
  if (!building.pending) return 1;
  const total = getConstructionMs(building.pending.targetLevel);
  return Math.min(1, Math.max(0, 1 - (building.pending.endsAt - now) / total));
}
