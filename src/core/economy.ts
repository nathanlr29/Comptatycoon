import { BALANCE } from '../data/balance';
import { STAFF, STAFF_ROLES, type StaffRole } from '../data/staff';
import { UPGRADES } from '../data/upgrades';
import type { GameState } from './state';

/**
 * Multiplicateurs permanents, regroupés par famille (docs/GDD.md §5).
 * Les sources (améliorations, puis bâtiments, départements, technologies)
 * sont toutes lues ici : c'est le seul endroit à étendre.
 */
export interface Multipliers {
  global: number;
  click: number;
  role: Record<StaffRole, number>;
  /** Part du revenu/s ajoutée à chaque clic (technologies). */
  clickIncomeShare: number;
}

export function getMultipliers(state: GameState): Multipliers {
  const role = Object.fromEntries(STAFF_ROLES.map((r) => [r, 1])) as Record<StaffRole, number>;
  let click = 1;
  for (const id of state.upgrades) click *= UPGRADES[id].clickMultiplier;
  return { global: 1, click, role, clickIncomeShare: 0 };
}

export function getReputationMultiplier(state: GameState): number {
  const bonus = Math.min(state.reputation * BALANCE.reputationBonusPerPoint, BALANCE.reputationBonusCap);
  return 1 + bonus;
}

/** Produit des effets temporaires encore actifs à `now`. */
export function getEventMultiplier(state: GameState, now: number): number {
  return state.effects.reduce((acc, e) => (e.expiresAt > now ? acc * e.incomeMultiplier : acc), 1);
}

/** Revenu passif sans les effets temporaires (sert aussi au calcul hors ligne). */
export function getBaseIncomePerSecond(state: GameState): number {
  const m = getMultipliers(state);
  let staffIncome = 0;
  for (const role of STAFF_ROLES) staffIncome += state.staff[role] * STAFF[role].income * m.role[role];
  return staffIncome * m.global * getReputationMultiplier(state);
}

/** Revenu passif en €/s à l'instant `now`, tous multiplicateurs compris. */
export function getIncomePerSecond(state: GameState, now: number): number {
  return getBaseIncomePerSecond(state) * getEventMultiplier(state, now);
}

/** Montant exact crédité par une action manuelle. */
export function getClickValue(state: GameState, now: number): number {
  const m = getMultipliers(state);
  return BALANCE.baseClickValue * m.click + m.clickIncomeShare * getIncomePerSecond(state, now);
}

/** Coût d'achat avec hausse géométrique, arrondi à l'euro supérieur. */
export function scaledCost(baseCost: number, owned: number, growth: number = BALANCE.costGrowth): number {
  return Math.ceil(baseCost * growth ** owned);
}

export function getHireCost(state: GameState, role: StaffRole): number {
  return scaledCost(STAFF[role].baseCost, state.staff[role]);
}

/** Coût du prochain associé : 25 000 €, puis ×4 à chaque associé. */
export function getPartnerCost(state: GameState): number {
  return scaledCost(BALANCE.partnerBaseCost, state.partners - 1, BALANCE.partnerCostGrowth);
}
