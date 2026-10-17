import { DEFAULT_DIFFICULTY, type DifficultyId } from '../data/difficulty';
import { EVENT_TIMING } from '../data/events';
import { STAFF_ROLES, type StaffRole } from '../data/staff';
import type { DepartmentId } from '../data/departments';
import type { BuildingType } from '../data/buildings';
import type { SecretId } from '../data/secrets';
import type { TalentLevels } from '../data/talents';
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

/** Ce qui survit à la cession du cabinet (docs/GDD.md §14). */
export interface PrestigeState {
  /** Contacts du carnet d'adresses : production +10 % chacun. */
  contacts: number;
  /** Cabinets cédés. */
  sales: number;
  /** Chiffre d'affaires des parties précédentes (la partie en cours est dans `stats.totalEarned`). */
  pastEarned: number;
  /** Atouts du réseau achetés avec les contacts (docs/GDD.md §14 bis). */
  talents: TalentLevels;
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
  /** Secrets (easter eggs) découverts, dans l'ordre de découverte. */
  secrets: SecretId[];
  /** Mode café (docs/GDD.md §8 bis) : niveau de la machine et heure (ms) de la prochaine pause possible. */
  coffee: { machine: number; readyAt: number };
  /** Horodatage (ms) jusqu'auquel la production a été créditée. */
  lastSimulatedAt: number;
  createdAt: number;
  /** `playMs` : temps passé le jeu ouvert (hors absences rattrapées), gardé après une cession. */
  stats: { totalEarned: number; clicks: number; playMs: number };
  /** Choisie à la fondation, fixe ensuite (docs/GDD.md §13). */
  difficulty: DifficultyId;
  prestige: PrestigeState;
}

export interface NewGameOptions {
  difficulty?: DifficultyId;
  prestige?: PrestigeState;
  /** Date de fondation d'origine (gardée après une cession). */
  createdAt?: number;
}

export function createInitialState(now: number, options: NewGameOptions = {}): GameState {
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
    secrets: [],
    coffee: { machine: 1, readyAt: 0 },
    lastSimulatedAt: now,
    createdAt: options.createdAt ?? now,
    stats: { totalEarned: 0, clicks: 0, playMs: 0 },
    difficulty: options.difficulty ?? DEFAULT_DIFFICULTY,
    prestige: options.prestige ?? { contacts: 0, sales: 0, pastEarned: 0, talents: {} },
  };
}
