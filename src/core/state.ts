import { EVENT_TIMING } from '../data/events';
import { STAFF_ROLES, type StaffRole } from '../data/staff';
import type { DepartmentId } from '../data/departments';
import type { BuildingType } from '../data/buildings';
import type { UpgradeId } from '../data/upgrades';

/** Effet temporaire (ex. Période fiscale). Expire à `expiresAt` (ms). */
export interface TimedEffect {
  id: string;
  incomeMultiplier: number;
  expiresAt: number;
}

export interface BuildingState {
  id: string;
  type: BuildingType;
  /** Niveau effectif (0 pendant le premier chantier). */
  level: number;
  slotId: string;
  /** Chantier en cours : le niveau visé est atteint à `endsAt` (ms). */
  pending?: { targetLevel: number; endsAt: number };
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
  /** Fraction de point de réputation accumulée (salles de réunion). */
  reputationProgress: number;
  /** Échéance (ms) du prochain événement aléatoire (docs/GDD.md §8). */
  nextEventAt: number;
  /** Objectifs dont la récompense a été réclamée (docs/GDD.md §9). */
  claimedObjectives: string[];
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
    reputationProgress: 0,
    nextEventAt: now + EVENT_TIMING.firstAfterMs,
    claimedObjectives: [],
    lastSimulatedAt: now,
    createdAt: now,
    stats: { totalEarned: 0, clicks: 0 },
  };
}
