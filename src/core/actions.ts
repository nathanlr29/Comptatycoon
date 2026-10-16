import type { BuildingType } from '../data/buildings';
import type { StaffRole } from '../data/staff';
import { DEPARTMENT_REPUTATION, PORTFOLIO, type DepartmentId } from '../data/departments';
import type { UpgradeId } from '../data/upgrades';
import { canBuyDepartment, canBuyPortfolio } from './departments';
import { getClickValue } from './economy';
import { canBuild, canUpgrade, startBuild, startUpgrade } from './buildings';
import { canExpand } from './expansion';
import { canClaimObjective, claimObjective } from './objectives';
import { canDismiss, canDismissPartner, canHire, canHirePartner } from './recruitment';
import type { RefusalReason } from './refusals';
import { canBuyUpgrade } from './upgrades';
import type { GameState } from './state';

export type GameAction =
  | { type: 'click' }
  | { type: 'hire'; role: StaffRole }
  | { type: 'hirePartner' }
  | { type: 'dismiss'; role: StaffRole }
  | { type: 'dismissPartner' }
  | { type: 'buyUpgrade'; id: UpgradeId }
  | { type: 'buyDepartment'; id: DepartmentId }
  | { type: 'buyPortfolio' }
  | { type: 'build'; building: BuildingType }
  /** `hq` = agrandir le cabinet (conditions d'équipe en plus, voir canExpand). */
  | { type: 'upgradeBuilding'; buildingId: string }
  | { type: 'claimObjective'; id: string };

export type ActionResult = { ok: true; amount?: number } | { ok: false; reason: RefusalReason };

export interface ActionOutcome {
  state: GameState;
  result: ActionResult;
}

function refuse(state: GameState, reason: RefusalReason): ActionOutcome {
  return { state, result: { ok: false, reason } };
}

/** Applique une action joueur. Fonction pure : l'état d'entrée n'est jamais modifié. */
export function applyAction(state: GameState, action: GameAction, now: number): ActionOutcome {
  switch (action.type) {
    case 'click': {
      const amount = getClickValue(state, now);
      const next: GameState = {
        ...state,
        money: state.money + amount,
        stats: { totalEarned: state.stats.totalEarned + amount, clicks: state.stats.clicks + 1 },
      };
      return { state: next, result: { ok: true, amount } };
    }
    case 'hire': {
      const check = canHire(state, action.role);
      if (!check.ok) return refuse(state, check.reason);
      const staff = { ...state.staff, [action.role]: state.staff[action.role] + 1 };
      return { state: { ...state, money: state.money - check.cost, staff }, result: { ok: true } };
    }
    case 'hirePartner': {
      const check = canHirePartner(state);
      if (!check.ok) return refuse(state, check.reason);
      return {
        state: { ...state, money: state.money - check.cost, partners: state.partners + 1 },
        result: { ok: true },
      };
    }
    case 'dismiss': {
      const check = canDismiss(state, action.role);
      if (!check.ok) return refuse(state, check.reason);
      const staff = { ...state.staff, [action.role]: state.staff[action.role] - 1 };
      return { state: { ...state, money: state.money - check.cost, staff }, result: { ok: true } };
    }
    case 'dismissPartner': {
      const check = canDismissPartner(state);
      if (!check.ok) return refuse(state, check.reason);
      return {
        state: { ...state, money: state.money - check.cost, partners: state.partners - 1 },
        result: { ok: true },
      };
    }
    case 'buyUpgrade': {
      const check = canBuyUpgrade(state, action.id);
      if (!check.ok) return refuse(state, check.reason);
      return {
        state: { ...state, money: state.money - check.cost, upgrades: [...state.upgrades, action.id] },
        result: { ok: true },
      };
    }
    case 'buyDepartment': {
      const check = canBuyDepartment(state, action.id);
      if (!check.ok) return refuse(state, check.reason);
      const next: GameState = {
        ...state,
        money: state.money - check.cost,
        reputation: state.reputation + DEPARTMENT_REPUTATION,
        departments: [...state.departments, action.id],
      };
      return { state: next, result: { ok: true } };
    }
    case 'buyPortfolio': {
      const check = canBuyPortfolio(state);
      if (!check.ok) return refuse(state, check.reason);
      const next: GameState = {
        ...state,
        money: state.money - check.cost,
        reputation: state.reputation + PORTFOLIO.reputationEach,
        portfolios: state.portfolios + 1,
      };
      return { state: next, result: { ok: true } };
    }
    case 'build': {
      const check = canBuild(state, action.building);
      if (!check.ok) return refuse(state, check.reason);
      return { state: startBuild(state, action.building, check, now), result: { ok: true } };
    }
    case 'upgradeBuilding': {
      const check = action.buildingId === 'hq' ? canExpand(state) : canUpgrade(state, action.buildingId);
      if (!check.ok) return refuse(state, check.reason);
      const upgrade = canUpgrade(state, action.buildingId);
      if (!upgrade.ok) return refuse(state, upgrade.reason);
      return { state: startUpgrade(state, action.buildingId, upgrade, now), result: { ok: true } };
    }
    case 'claimObjective': {
      const check = canClaimObjective(state, action.id, now);
      if (!check.ok) return refuse(state, check.reason);
      return { state: claimObjective(state, check.def), result: { ok: true } };
    }
  }
}
