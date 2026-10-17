import { BALANCE } from '../data/balance';
import { BUILDINGS } from '../data/buildings';
import { STAFF, STAFF_ROLES, type StaffRole } from '../data/staff';
import { getHireCost, getPartnerCost, getPartnerSeveranceCost, getSeveranceCost } from './economy';
import { getPerkEffects } from './perks';
import type { GameState } from './state';

import type { RefusalReason } from './refusals';

export type { RefusalReason };
export type Check = { ok: true; cost: number } | { ok: false; reason: RefusalReason; cost: number };

/** Collaborateurs comptés dans la capacité d'encadrement (associés exclus). */
export function getStaffCount(state: GameState): number {
  return STAFF_ROLES.reduce((sum, role) => sum + state.staff[role], 0);
}

/** Places d'encadrement par associé : 15, plus le Séminaire annuel. */
export function getStaffPerPartner(state: GameState): number {
  return BALANCE.staffPerPartner + getPerkEffects(state).staffPerPartner;
}

/** Places d'encadrement apportées par les aménagements (parking). */
export function getBuildingCapacity(state: GameState): number {
  return state.buildings.reduce((sum, b) => sum + (b.level > 0 ? (BUILDINGS[b.type].effect.capacityPerLevel ?? 0) * b.level : 0), 0);
}

export function getCapacity(state: GameState): number {
  return state.partners * getStaffPerPartner(state) + getBuildingCapacity(state);
}

export function canHire(state: GameState, role: StaffRole): Check {
  const cost = getHireCost(state, role);
  if (state.reputation < STAFF[role].minReputation) return { ok: false, reason: 'locked', cost };
  if (getStaffCount(state) >= getCapacity(state)) return { ok: false, reason: 'capacity_full', cost };
  if (state.money < cost) return { ok: false, reason: 'insufficient_funds', cost };
  return { ok: true, cost };
}

/** L'embauche d'un associé reste possible à capacité pleine. */
export function canHirePartner(state: GameState): Check {
  const cost = getPartnerCost(state);
  if (state.reputation < BALANCE.partnerMinReputation) return { ok: false, reason: 'locked', cost };
  if (state.money < cost) return { ok: false, reason: 'insufficient_funds', cost };
  return { ok: true, cost };
}

/** Licenciement d'un collaborateur contre une indemnité (docs/GDD.md §4). */
export function canDismiss(state: GameState, role: StaffRole): Check {
  const cost = getSeveranceCost(state, role);
  if (state.staff[role] <= 0) return { ok: false, reason: 'nobody_to_dismiss', cost };
  if (state.money < cost) return { ok: false, reason: 'insufficient_funds', cost };
  return { ok: true, cost };
}

/** Un associé peut partir s'il en reste un et que les places restantes suffisent à l'équipe. */
export function canDismissPartner(state: GameState): Check {
  const cost = getPartnerSeveranceCost(state);
  if (state.partners <= 1) return { ok: false, reason: 'last_partner', cost };
  if (getStaffCount(state) > getCapacity(state) - getStaffPerPartner(state)) return { ok: false, reason: 'team_too_large', cost };
  if (state.money < cost) return { ok: false, reason: 'insufficient_funds', cost };
  return { ok: true, cost };
}

/** Un collaborateur de la catégorie part. Sans effet si l'effectif est nul ; jamais un associé. */
export function resign(state: GameState, role: StaffRole): GameState {
  if (state.staff[role] <= 0) return state;
  return { ...state, staff: { ...state.staff, [role]: state.staff[role] - 1 } };
}
