import { OBJECTIVES, VISIBLE_OBJECTIVES, type ObjectiveDefinition } from '../data/objectives';
import { getIncomePerSecond } from './economy';
import { getFirmLevel } from './expansion';
import type { RefusalReason } from './refusals';
import type { GameState } from './state';

export interface ObjectiveProgress {
  current: number;
  target: number;
  done: boolean;
}

export function getObjective(id: string): ObjectiveDefinition | undefined {
  return OBJECTIVES.find((o) => o.id === id);
}

export function getObjectiveProgress(state: GameState, def: ObjectiveDefinition, now: number): ObjectiveProgress {
  const c = def.condition;
  let current: number;
  let target = 1;
  switch (c.kind) {
    case 'clicks':
      current = state.stats.clicks;
      break;
    case 'staff':
      current = state.staff[c.role];
      break;
    case 'income':
      current = getIncomePerSecond(state, now);
      break;
    case 'firmLevel':
      current = getFirmLevel(state);
      break;
    case 'building':
      current = state.buildings.some((b) => b.type === c.type && b.level >= 1) ? 1 : 0;
      break;
    case 'partners':
      current = state.partners;
      break;
    case 'departments':
      current = state.departments.length;
      break;
    case 'totalEarned':
      current = state.stats.totalEarned;
      break;
  }
  if (c.kind !== 'building') target = c.target;
  return { current: Math.min(current, target), target, done: current >= target };
}

/** Les premiers objectifs non réclamés, dans l'ordre de la liste. */
export function getVisibleObjectives(state: GameState): ObjectiveDefinition[] {
  return OBJECTIVES.filter((o) => !state.claimedObjectives.includes(o.id)).slice(0, VISIBLE_OBJECTIVES);
}

export type ClaimCheck = { ok: true; def: ObjectiveDefinition } | { ok: false; reason: RefusalReason };

export function canClaimObjective(state: GameState, id: string, now: number): ClaimCheck {
  const def = getObjective(id);
  if (!def) return { ok: false, reason: 'unknown' };
  if (state.claimedObjectives.includes(id)) return { ok: false, reason: 'already_owned' };
  if (!getVisibleObjectives(state).includes(def)) return { ok: false, reason: 'locked' };
  if (!getObjectiveProgress(state, def, now).done) return { ok: false, reason: 'missing_prerequisite' };
  return { ok: true, def };
}

/** Crédite la récompense. Suppose `canClaimObjective(...).ok`. */
export function claimObjective(state: GameState, def: ObjectiveDefinition): GameState {
  return {
    ...state,
    money: state.money + (def.reward.money ?? 0),
    reputation: state.reputation + (def.reward.reputation ?? 0),
    claimedObjectives: [...state.claimedObjectives, def.id],
  };
}
