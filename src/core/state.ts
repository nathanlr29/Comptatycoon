import { STAFF_ROLES, type StaffRole } from '../data/staff';
import type { DepartmentId } from '../data/departments';
import type { UpgradeId } from '../data/upgrades';

/** Effet temporaire (ex. Période fiscale). Expire à `expiresAt` (ms). */
export interface TimedEffect {
  id: string;
  incomeMultiplier: number;
  expiresAt: number;
}

export interface BuildingState {
  id: string;
  type: string;
  level: number;
  slotId: string;
}

/** État complet et sérialisable du jeu : objets simples uniquement. */
export interface GameState {
  money: number;
  reputation: number;
  staff: Record<StaffRole, number>;
  /** Associés experts-comptables, joueur compris (≥ 1). */
  partners: number;
  upgrades: UpgradeId[];
  /** Pôles ouverts (achats uniques). */
  departments: DepartmentId[];
  /** Nombre de rachats de portefeuille clients. */
  portfolios: number;
  buildings: BuildingState[];
  effects: TimedEffect[];
  /** Horodatage (ms) jusqu'auquel la production a été créditée. */
  lastSimulatedAt: number;
  createdAt: number;
  stats: { totalEarned: number; clicks: number };
}

export function createInitialState(now: number): GameState {
  const staff = Object.fromEntries(STAFF_ROLES.map((role) => [role, 0])) as Record<StaffRole, number>;
  return {
    money: 0,
    reputation: 0,
    staff,
    partners: 1,
    upgrades: [],
    departments: [],
    portfolios: 0,
    buildings: [{ id: 'hq', type: 'headquarters', level: 1, slotId: 'hq' }],
    effects: [],
    lastSimulatedAt: now,
    createdAt: now,
    stats: { totalEarned: 0, clicks: 0 },
  };
}
