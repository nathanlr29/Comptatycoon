import { BUILDINGS, CONSTRUCTIBLE, CONSTRUCTION, type BuildingDefinition, type BuildingType } from '../data/buildings';
import { EXTERIOR_TYPES, ROOMS } from '../data/office';
import type { RefusalReason } from './refusals';
import { talentValue } from './talents';
import type { BuildingState, GameState } from './state';

export type BuildCheck =
  | { ok: true; cost: number; durationMs: number }
  | { ok: false; reason: RefusalReason; cost: number; durationMs: number };

/** Aménagement possible : l'emplacement est choisi par le jeu, pas par le joueur. */
export type PlaceCheck = { ok: true; cost: number; durationMs: number; slotId: string } | Extract<BuildCheck, { ok: false }>;

/** Ce que le rendu doit dessiner pour une pièce : jamais aménagée pendant les travaux. */
export type BuildingVisual = 'works' | 'built' | 'upgradable';

export function getHqLevel(state: GameState): number {
  return state.buildings.find((b) => b.type === 'headquarters')?.level ?? 1;
}

export function getBuildingAt(state: GameState, slotId: string): BuildingState | undefined {
  return state.buildings.find((b) => b.slotId === slotId);
}

export function getUpgradeCost(def: BuildingDefinition, level: number): number {
  return def.upgradeCosts?.[level - 1] ?? Math.ceil(def.cost * CONSTRUCTION.upgradeCostGrowth ** level);
}

/** Durée du chantier pour atteindre `targetLevel`, raccourcie par l'atout « Artisans de confiance » si `state` est donné. */
export function getConstructionMs(targetLevel: number, state?: GameState): number {
  const speed = state ? talentValue(state, 'trustedBuilders') : 1;
  return Math.round(Math.min(CONSTRUCTION.maxMs, CONSTRUCTION.baseMs * targetLevel ** 2) * speed);
}

/** Prix pour monter une pièce au niveau suivant ; l'agrandissement du cabinet profite de l'atout « Bailleur ami ». */
export function getUpgradePrice(state: GameState, building: BuildingState): number {
  const cost = getUpgradeCost(BUILDINGS[building.type], building.level);
  return building.type === 'headquarters' ? Math.ceil(cost * talentValue(state, 'friendlyLandlord')) : cost;
}

/**
 * Place de la pièce si elle est libre et existe à ce niveau du cabinet : chaque type de pièce a sa place
 * fixe sur le plan (`ROOMS` de src/data/office.ts), dont l'identifiant est le type lui-même.
 */
export function findFreeSlot(state: GameState, type: BuildingType): string | undefined {
  if (getBuildingAt(state, type)) return undefined;
  // Parking et enseigne n'occupent pas de pièce : leur place existe dès que le cabinet le permet.
  if (EXTERIOR_TYPES.includes(type)) return getHqLevel(state) >= BUILDINGS[type].requiresHq ? type : undefined;
  const room = ROOMS.find((r) => r.type === type);
  if (!room || getHqLevel(state) < room.minStage) return undefined;
  return type;
}

export function canBuild(state: GameState, type: BuildingType): PlaceCheck {
  const def = BUILDINGS[type];
  const base = { cost: def.cost, durationMs: getConstructionMs(1, state) };
  if (!CONSTRUCTIBLE.includes(type)) return { ok: false, reason: 'unknown', ...base };
  if (state.buildings.some((b) => b.type === type)) return { ok: false, reason: 'already_owned', ...base };
  if (getHqLevel(state) < def.requiresHq) return { ok: false, reason: 'requires_hq', ...base };
  const slot = findFreeSlot(state, type);
  if (!slot) return { ok: false, reason: 'no_space', ...base };
  if (state.money < def.cost) return { ok: false, reason: 'insufficient_funds', ...base };
  return { ok: true, slotId: slot, ...base };
}

export function canUpgrade(state: GameState, buildingId: string): BuildCheck {
  const building = state.buildings.find((b) => b.id === buildingId);
  if (!building) return { ok: false, reason: 'unknown', cost: 0, durationMs: 0 };
  const def = BUILDINGS[building.type];
  const target = building.level + 1;
  const base = { cost: getUpgradePrice(state, building), durationMs: getConstructionMs(target, state) };
  if (building.pending) return { ok: false, reason: 'under_construction', ...base };
  if (building.level >= def.maxLevel) return { ok: false, reason: 'max_level', ...base };
  if (state.money < base.cost) return { ok: false, reason: 'insufficient_funds', ...base };
  return { ok: true, ...base };
}

/** Lance l'aménagement d'une pièce (à appeler après un `canBuild` réussi). */
export function startBuild(state: GameState, type: BuildingType, check: Extract<PlaceCheck, { ok: true }>, now: number): GameState {
  const slotId = check.slotId;
  const building: BuildingState = {
    id: type,
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

export function getBuildingVisual(state: GameState, building: BuildingState): BuildingVisual {
  if (building.pending || building.level === 0) return 'works';
  return canUpgrade(state, building.id).ok ? 'upgradable' : 'built';
}

/** Avancement du chantier entre 0 et 1. */
export function getConstructionProgress(building: BuildingState, now: number): number {
  if (!building.pending) return 1;
  const total = getConstructionMs(building.pending.targetLevel);
  return Math.min(1, Math.max(0, 1 - (building.pending.endsAt - now) / total));
}
