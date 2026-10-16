import type { StaffRole } from '../data/staff';
import type { UpgradeId } from '../data/upgrades';
import { getClickValue } from './economy';
import { canDismiss, canDismissPartner, canHire, canHirePartner, type RefusalReason } from './recruitment';
import { canBuyUpgrade } from './upgrades';
import type { GameState } from './state';

export type GameAction =
  | { type: 'click' }
  | { type: 'hire'; role: StaffRole }
  | { type: 'hirePartner' }
  | { type: 'dismiss'; role: StaffRole }
  | { type: 'dismissPartner' }
  | { type: 'buyUpgrade'; id: UpgradeId };

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
  }
}
