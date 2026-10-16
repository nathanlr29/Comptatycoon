import { DEPARTMENTS, DEPARTMENT_IDS, PORTFOLIO, TAX_AUDIT, type DepartmentId } from '../data/departments';
import { getExpansionLevel } from '../data/expansion';
import { STAFF_ROLES, type StaffRole } from '../data/staff';
import { getFirmLevel } from './expansion';
import type { Check } from './recruitment';
import type { GameState } from './state';

/** Prérequis non remplis d'un pôle, pour les afficher en clair. */
export type MissingRequirement =
  | { kind: 'space'; level: number; name: string }
  | { kind: 'reputation'; required: number }
  | { kind: 'funds'; cost: number };

/** Le cabinet est assez grand pour installer le pôle (pas de locaux séparés à aménager). */
export function hasDepartmentSpace(state: GameState, id: DepartmentId): boolean {
  return getFirmLevel(state) >= DEPARTMENTS[id].minFirmLevel;
}

/** Prérequis non remplis (place, réputation) ; l'argent est à part, voir `getDepartmentStatus`. */
export function getMissingRequirements(state: GameState, id: DepartmentId): MissingRequirement[] {
  const def = DEPARTMENTS[id];
  const missing: MissingRequirement[] = [];
  if (!hasDepartmentSpace(state, id)) {
    missing.push({ kind: 'space', level: def.minFirmLevel, name: getExpansionLevel(def.minFirmLevel)?.name ?? '' });
  }
  if (state.reputation < def.minReputation) missing.push({ kind: 'reputation', required: def.minReputation });
  return missing;
}

export interface DepartmentStatus {
  owned: boolean;
  cost: number;
  /** Toutes les conditions manquantes, fonds compris ; vide = achetable (ou déjà acquis). */
  missing: MissingRequirement[];
}

/** Statut d'un pôle pour l'écran « Développement ». */
export function getDepartmentStatus(state: GameState, id: DepartmentId): DepartmentStatus {
  const cost = DEPARTMENTS[id].cost;
  if (state.departments.includes(id)) return { owned: true, cost, missing: [] };
  const missing = getMissingRequirements(state, id);
  if (state.money < cost) missing.push({ kind: 'funds', cost });
  return { owned: false, cost, missing };
}

/** Conditions d'ouverture d'un pôle (docs/GDD.md §7). */
export function canBuyDepartment(state: GameState, id: DepartmentId): Check {
  const def = DEPARTMENTS[id];
  const cost = def.cost;
  if (state.departments.includes(id)) return { ok: false, reason: 'already_owned', cost };
  if (!hasDepartmentSpace(state, id)) return { ok: false, reason: 'no_space', cost };
  if (state.reputation < def.minReputation) return { ok: false, reason: 'locked', cost };
  if (state.money < cost) return { ok: false, reason: 'insufficient_funds', cost };
  return { ok: true, cost };
}

export function getPortfolioCost(state: GameState): number {
  return Math.ceil(PORTFOLIO.baseCost * PORTFOLIO.costGrowth ** state.portfolios);
}

/** Rachat de portefeuille : répétable, nécessite le Pôle Social. */
export function canBuyPortfolio(state: GameState): Check {
  const cost = getPortfolioCost(state);
  if (!state.departments.includes(PORTFOLIO.requires)) return { ok: false, reason: 'missing_prerequisite', cost };
  if (state.money < cost) return { ok: false, reason: 'insufficient_funds', cost };
  return { ok: true, cost };
}

/** Effets cumulés des pôles ouverts et des rachats de portefeuille. */
export interface DepartmentBonuses {
  flatIncome: number;
  global: number;
  role: Record<StaffRole, number>;
}

export function getDepartmentBonuses(state: GameState): DepartmentBonuses {
  const role = Object.fromEntries(STAFF_ROLES.map((r) => [r, 1])) as Record<StaffRole, number>;
  let flatIncome = 0;
  let global = 1 + PORTFOLIO.globalBonusEach * state.portfolios;
  for (const id of DEPARTMENT_IDS) {
    if (!state.departments.includes(id)) continue;
    const effect = DEPARTMENTS[id].effect;
    flatIncome += effect.flatIncome ?? 0;
    global *= effect.global ?? 1;
    for (const r of STAFF_ROLES) role[r] *= effect.roles?.[r] ?? 1;
  }
  return { flatIncome, global, role };
}

export function isProtectedFromTaxAudit(state: GameState): boolean {
  return state.departments.some((id) => DEPARTMENTS[id].effect.taxAuditImmunity === true);
}

export interface TaxAuditOutcome {
  state: GameState;
  protected: boolean;
  /** Argent perdu (0 si protégé). */
  loss: number;
  /** Variation de réputation réellement appliquée. */
  reputationChange: number;
}

/**
 * Effet du contrôle fiscal (docs/GDD.md §8). `incomePerSecond` est fourni par l'appelant
 * (moteur d'événements) pour garder ce module indépendant du calcul du revenu.
 * Sans Pôle Juridique : perte = min(10 % du solde, 300 × revenu/s), réputation −2, jamais négatifs.
 */
export function resolveTaxAudit(state: GameState, incomePerSecond: number): TaxAuditOutcome {
  if (isProtectedFromTaxAudit(state)) {
    const gain = TAX_AUDIT.protectedReputationGain;
    return { state: { ...state, reputation: state.reputation + gain }, protected: true, loss: 0, reputationChange: gain };
  }
  const money = Math.max(state.money, 0);
  const loss = Math.max(0, Math.min(money * TAX_AUDIT.maxLossShare, incomePerSecond * TAX_AUDIT.maxLossIncomeSeconds));
  const reputation = Math.max(0, state.reputation - TAX_AUDIT.reputationLoss);
  return {
    state: { ...state, money: state.money - loss, reputation },
    protected: false,
    loss,
    reputationChange: reputation - state.reputation,
  };
}
