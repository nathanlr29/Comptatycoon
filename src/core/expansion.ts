import { FIRM_BONUS_PER_LEVEL, getExpansionLevel, type ExpansionLevel } from '../data/expansion';
import { getStaffCount, type Check } from './recruitment';
import type { GameState } from './state';

/** Niveau du cabinet = niveau du Bureau principal. */
export function getFirmLevel(state: GameState): number {
  return state.buildings.find((b) => b.id === 'hq')?.level ?? 1;
}

/** Prochaine étape d'agrandissement, ou null si le cabinet est au maximum. */
export function getNextExpansion(state: GameState): ExpansionLevel | null {
  return getExpansionLevel(getFirmLevel(state) + 1) ?? null;
}

/** Multiplicateur de production globale apporté par le niveau du cabinet. */
export function getFirmMultiplier(state: GameState): number {
  return 1 + FIRM_BONUS_PER_LEVEL * (getFirmLevel(state) - 1);
}

/** Ce qui manque pour l'étape suivante (vide si les conditions d'équipe sont remplies). */
export function missingForExpansion(state: GameState, next: ExpansionLevel): { staff: number; partners: number } {
  return {
    staff: Math.max(0, next.minStaff - getStaffCount(state)),
    partners: Math.max(0, next.minPartners - state.partners),
  };
}

export function canExpand(state: GameState): Check {
  const next = getNextExpansion(state);
  if (!next) return { ok: false, reason: 'max_level', cost: 0 };
  const missing = missingForExpansion(state, next);
  if (missing.staff > 0 || missing.partners > 0) return { ok: false, reason: 'missing_prerequisite', cost: next.cost };
  if (state.money < next.cost) return { ok: false, reason: 'insufficient_funds', cost: next.cost };
  return { ok: true, cost: next.cost };
}

/** Passe le cabinet au niveau suivant. Suppose `canExpand(state).ok`. */
export function expandFirm(state: GameState, cost: number): GameState {
  const level = getFirmLevel(state) + 1;
  return {
    ...state,
    money: state.money - cost,
    buildings: state.buildings.map((b) => (b.id === 'hq' ? { ...b, level } : b)),
  };
}

