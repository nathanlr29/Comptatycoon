import { BALANCE } from '../data/balance';
import { BUILDINGS } from '../data/buildings';
import { STAFF, STAFF_ROLES, type StaffRole } from '../data/staff';
import { UPGRADES } from '../data/upgrades';
import { getDepartmentBonuses } from './departments';
import { getDifficulty } from './difficulty';
import { getFirmMultiplier } from './expansion';
import { getPerkEffects } from './perks';
import { getPrestigeMultiplier } from './prestige';
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
  /** Part du revenu/s ajoutée à chaque clic (améliorations, puis technologies). */
  clickIncomeShare: number;
  /** Production fixe en €/s (Pôle Social), ajoutée avant le multiplicateur global. */
  flatIncome: number;
}

export function getMultipliers(state: GameState): Multipliers {
  const role = Object.fromEntries(STAFF_ROLES.map((r) => [r, 1])) as Record<StaffRole, number>;
  let click = 1;
  let clickIncomeShare = 0;
  let global = getFirmMultiplier(state);
  for (const id of state.upgrades) {
    const effect = UPGRADES[id].effect;
    click *= effect.click ?? 1;
    clickIncomeShare += effect.clickIncomeShare ?? 0;
    global *= effect.global ?? 1;
    for (const r of STAFF_ROLES) role[r] *= effect.roles?.[r] ?? 1;
  }
  for (const b of state.buildings) {
    const { globalPerLevel, rolesPerLevel } = BUILDINGS[b.type].effect;
    if (b.level <= 0) continue;
    if (globalPerLevel) global *= 1 + globalPerLevel * b.level;
    if (rolesPerLevel) for (const r of rolesPerLevel.roles) role[r] *= 1 + rolesPerLevel.bonus * b.level;
  }
  const departments = getDepartmentBonuses(state);
  global *= departments.global;
  for (const r of STAFF_ROLES) role[r] *= departments.role[r];
  return { global, click, role, clickIncomeShare, flatIncome: departments.flatIncome };
}

export function getReputationMultiplier(state: GameState): number {
  const bonus = Math.min(state.reputation * BALANCE.reputationBonusPerPoint, BALANCE.reputationBonusCap);
  return 1 + bonus;
}

/** Produit des effets temporaires encore actifs à `now`. */
export function getEventMultiplier(state: GameState, now: number): number {
  return state.effects.reduce((acc, e) => (e.expiresAt > now ? acc * e.incomeMultiplier : acc), 1);
}

/** Facteurs propres au cabinet et non à la partie : mode de difficulté (§13) et contacts des cessions (§14). */
export function getRunMultiplier(state: GameState): number {
  return getDifficulty(state).income * getPrestigeMultiplier(state);
}

/** Revenu passif sans les effets temporaires (sert aussi au calcul hors ligne). */
export function getBaseIncomePerSecond(state: GameState): number {
  const m = getMultipliers(state);
  let staffIncome = 0;
  for (const role of STAFF_ROLES) staffIncome += state.staff[role] * STAFF[role].income * m.role[role];
  return (staffIncome + m.flatIncome) * m.global * getReputationMultiplier(state) * getRunMultiplier(state);
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

/** Prix d'embauche, réduit par les avantages sociaux (mutuelle, titres-restaurant). */
export function getHireCost(state: GameState, role: StaffRole): number {
  return Math.ceil(scaledCost(STAFF[role].baseCost, state.staff[role], STAFF[role].costGrowth) * getPerkEffects(state).hireCost);
}

/** Indemnité pour licencier un collaborateur : part du prix payé pour le dernier recruté. */
export function getSeveranceCost(state: GameState, role: StaffRole): number {
  return Math.ceil(scaledCost(STAFF[role].baseCost, Math.max(state.staff[role] - 1, 0), STAFF[role].costGrowth) * BALANCE.severanceShare);
}

/** Indemnité pour le départ d'un associé (même règle, sur le prix du dernier associé). */
export function getPartnerSeveranceCost(state: GameState): number {
  return Math.ceil(scaledCost(BALANCE.partnerBaseCost, Math.max(state.partners - 2, 0), BALANCE.partnerCostGrowth) * BALANCE.severanceShare);
}

/** Coût du prochain associé : 25 000 €, puis ×4 à chaque associé. */
export function getPartnerCost(state: GameState): number {
  return scaledCost(BALANCE.partnerBaseCost, state.partners - 1, BALANCE.partnerCostGrowth);
}
