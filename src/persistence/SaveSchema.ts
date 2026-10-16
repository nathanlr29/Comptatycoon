import { BUILDINGS, type BuildingType } from '../data/buildings';
import { DEPARTMENT_IDS, type DepartmentId } from '../data/departments';
import { STAFF_ROLES, type StaffRole } from '../data/staff';
import { UPGRADE_IDS, type UpgradeId } from '../data/upgrades';
import type { BuildingState, GameState, TimedEffect } from '../core/state';

/** Format stocké : `{ schemaVersion, savedAt, state }` (docs/GDD.md §10). */
export const SCHEMA_VERSION = 1;

export interface SaveFile {
  schemaVersion: number;
  savedAt: number;
  state: GameState;
}

export type ParseResult = { ok: true; save: SaveFile } | { ok: false; error: string };

type Raw = Record<string, unknown>;

/**
 * Migrations `vN → vN+1`, indexées par la version de départ.
 * v0 est un format fictif (sans `schemaVersion` ni `stats`) qui prouve le mécanisme.
 */
const MIGRATIONS: Record<number, (save: Raw) => Raw> = {
  0: (save) => {
    const state = isObject(save.state) ? save.state : {};
    return { ...save, schemaVersion: 1, state: { stats: { totalEarned: 0, clicks: 0 }, ...state } };
  },
};

class SchemaError extends Error {}

function isObject(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function obj(value: unknown, path: string): Raw {
  if (!isObject(value)) throw new SchemaError(`${path} : objet attendu`);
  return value;
}

function num(value: unknown, path: string, min = -Infinity): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new SchemaError(`${path} : nombre attendu`);
  if (value < min) throw new SchemaError(`${path} : doit valoir au moins ${min}`);
  return value;
}

function int(value: unknown, path: string, min: number): number {
  const n = num(value, path, min);
  if (!Number.isInteger(n)) throw new SchemaError(`${path} : entier attendu`);
  return n;
}

function str(value: unknown, path: string): string {
  if (typeof value !== 'string' || value === '') throw new SchemaError(`${path} : texte attendu`);
  return value;
}

function arr<T>(value: unknown, path: string, item: (v: unknown, p: string) => T): T[] {
  if (!Array.isArray(value)) throw new SchemaError(`${path} : liste attendue`);
  return value.map((v, i) => item(v, `${path}[${i}]`));
}

/** Les améliorations inconnues (retirées du jeu, ou version plus récente) sont ignorées sans rejeter la partie. */
function upgradeIds(value: unknown, path: string): UpgradeId[] {
  const ids = arr(value, path, str);
  return ids.filter((id): id is UpgradeId => (UPGRADE_IDS as string[]).includes(id));
}

/** Pôles : absents des anciennes sauvegardes (liste vide), identifiants inconnus ignorés. */
function departmentIds(value: unknown, path: string): DepartmentId[] {
  if (value === undefined) return [];
  return arr(value, path, str).filter((id): id is DepartmentId => (DEPARTMENT_IDS as string[]).includes(id));
}

function buildingType(value: unknown, path: string): BuildingType {
  const type = str(value, path);
  if (!(type in BUILDINGS)) throw new SchemaError(`${path} : type de pièce inconnu`);
  return type as BuildingType;
}

/** Niveau 0 = premier aménagement en cours ; `pending` = travaux en cours. */
function building(value: unknown, path: string): BuildingState {
  const b = obj(value, path);
  const result: BuildingState = {
    id: str(b.id, `${path}.id`),
    type: buildingType(b.type, `${path}.type`),
    level: int(b.level, `${path}.level`, 0),
    slotId: str(b.slotId, `${path}.slotId`),
  };
  if (b.pending !== undefined) {
    const p = obj(b.pending, `${path}.pending`);
    result.pending = { targetLevel: int(p.targetLevel, `${path}.pending.targetLevel`, 1), endsAt: num(p.endsAt, `${path}.pending.endsAt`, 0) };
  }
  return result;
}

function effect(value: unknown, path: string): TimedEffect {
  const e = obj(value, path);
  return {
    id: str(e.id, `${path}.id`),
    incomeMultiplier: num(e.incomeMultiplier, `${path}.incomeMultiplier`, 0),
    expiresAt: num(e.expiresAt, `${path}.expiresAt`),
  };
}

/** Valide champ par champ et reconstruit un état propre (les champs inconnus sont ignorés). */
function readState(value: unknown): GameState {
  const s = obj(value, 'state');
  const rawStaff = obj(s.staff, 'state.staff');
  const staff = {} as Record<StaffRole, number>;
  for (const role of STAFF_ROLES) staff[role] = int(rawStaff[role], `state.staff.${role}`, 0);
  const stats = obj(s.stats, 'state.stats');
  return {
    money: num(s.money, 'state.money'),
    reputation: num(s.reputation, 'state.reputation', 0),
    staff,
    partners: int(s.partners, 'state.partners', 1),
    upgrades: upgradeIds(s.upgrades, 'state.upgrades'),
    departments: departmentIds(s.departments, 'state.departments'),
    portfolios: s.portfolios === undefined ? 0 : int(s.portfolios, 'state.portfolios', 0),
    buildings: arr(s.buildings, 'state.buildings', building),
    effects: arr(s.effects, 'state.effects', effect),
    reputationProgress: s.reputationProgress === undefined ? 0 : num(s.reputationProgress, 'state.reputationProgress', 0),
    lastSimulatedAt: num(s.lastSimulatedAt, 'state.lastSimulatedAt', 0),
    createdAt: num(s.createdAt, 'state.createdAt', 0),
    stats: {
      totalEarned: num(stats.totalEarned, 'state.stats.totalEarned', 0),
      clicks: int(stats.clicks, 'state.stats.clicks', 0),
    },
  };
}

/** Applique les migrations nécessaires puis valide. Ne lève jamais d'exception. */
export function validateSave(value: unknown): ParseResult {
  try {
    let save = obj(value, 'sauvegarde');
    let version = save.schemaVersion === undefined ? 0 : int(save.schemaVersion, 'schemaVersion', 0);
    if (version > SCHEMA_VERSION) {
      return { ok: false, error: `version ${version} plus récente que ce jeu (${SCHEMA_VERSION})` };
    }
    while (version < SCHEMA_VERSION) {
      const migrate = MIGRATIONS[version];
      if (!migrate) return { ok: false, error: `aucune migration depuis la version ${version}` };
      save = migrate(save);
      version += 1;
    }
    return {
      ok: true,
      save: { schemaVersion: SCHEMA_VERSION, savedAt: num(save.savedAt, 'savedAt', 0), state: readState(save.state) },
    };
  } catch (error) {
    if (error instanceof SchemaError) return { ok: false, error: error.message };
    throw error;
  }
}

export function parseSave(text: string): ParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, error: 'JSON invalide' };
  }
  return validateSave(value);
}

export function serializeSave(state: GameState, savedAt: number): string {
  const save: SaveFile = { schemaVersion: SCHEMA_VERSION, savedAt, state };
  return JSON.stringify(save);
}
