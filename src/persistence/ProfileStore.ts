import { getIncomePerSecond } from '../core/economy';
import type { GameState } from '../core/state';
import { STORAGE_PREFIX, type KeyValueStorage } from './SaveService';

export const PROFILE_INDEX_KEY = `${STORAGE_PREFIX}profiles`;
export const MAX_PROFILES = 5;
export const PROFILE_NAME_MIN = 2;
export const PROFILE_NAME_MAX = 24;

/** Ce qui s'affiche sur l'écran d'accueil sans charger la partie. */
export interface ProfileSummary {
  money: number;
  incomePerSecond: number;
}

export interface ProfileEntry {
  id: string;
  name: string;
  createdAt: number;
  lastPlayedAt: number;
  summary: ProfileSummary;
  /** Compte joueur propriétaire (étape 10). */
  ownerUid?: string;
}

export type ProfileRefusal = 'limit' | 'invalid_name' | 'unknown_profile' | 'unavailable';
export type ProfileResult = { ok: true; profile: ProfileEntry } | { ok: false; reason: ProfileRefusal };

export function normalizeProfileName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  const length = [...trimmed].length;
  return length >= PROFILE_NAME_MIN && length <= PROFILE_NAME_MAX ? trimmed : null;
}

export function summarize(state: GameState, now: number): ProfileSummary {
  return { money: state.money, incomePerSecond: getIncomePerSecond(state, now) };
}

function defaultId(): string {
  const random = globalThis.crypto?.randomUUID?.();
  return random ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isEntry(value: unknown): value is ProfileEntry {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  const summary = e.summary as Record<string, unknown> | null;
  return (
    typeof e.id === 'string' &&
    typeof e.name === 'string' &&
    typeof e.createdAt === 'number' &&
    typeof e.lastPlayedAt === 'number' &&
    typeof summary === 'object' &&
    summary !== null &&
    typeof summary.money === 'number' &&
    typeof summary.incomePerSecond === 'number'
  );
}

/** Index des cabinets de cet appareil : `comptatycoon:profiles` (docs/GDD.md §10 bis). */
export class ProfileStore {
  constructor(
    private readonly storage: KeyValueStorage | null,
    private readonly now: () => number = Date.now,
    private readonly newId: () => string = defaultId,
  ) {}

  /** Cabinets du plus récemment joué au plus ancien. */
  list(): ProfileEntry[] {
    return this.read().sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
  }

  get(id: string): ProfileEntry | undefined {
    return this.read().find((p) => p.id === id);
  }

  canCreate(): boolean {
    return this.read().length < MAX_PROFILES;
  }

  create(name: string, summary: ProfileSummary = { money: 0, incomePerSecond: 0 }): ProfileResult {
    const clean = normalizeProfileName(name);
    if (clean === null) return { ok: false, reason: 'invalid_name' };
    const profiles = this.read();
    if (profiles.length >= MAX_PROFILES) return { ok: false, reason: 'limit' };
    const now = this.now();
    const profile: ProfileEntry = { id: this.newId(), name: clean, createdAt: now, lastPlayedAt: now, summary };
    if (!this.write([...profiles, profile])) return { ok: false, reason: 'unavailable' };
    return { ok: true, profile };
  }

  rename(id: string, name: string): ProfileResult {
    const clean = normalizeProfileName(name);
    if (clean === null) return { ok: false, reason: 'invalid_name' };
    return this.update(id, (p) => ({ ...p, name: clean }));
  }

  /** Appelé à chaque sauvegarde : le résumé suit la dernière partie. */
  recordSave(id: string, state: GameState): ProfileResult {
    const now = this.now();
    return this.update(id, (p) => ({ ...p, lastPlayedAt: now, summary: summarize(state, now) }));
  }

  /** Retire le cabinet de l'index ; ses sauvegardes sont effacées par `SaveService.remove`. */
  remove(id: string): boolean {
    const profiles = this.read();
    const rest = profiles.filter((p) => p.id !== id);
    return rest.length !== profiles.length && this.write(rest);
  }

  private update(id: string, change: (p: ProfileEntry) => ProfileEntry): ProfileResult {
    const profiles = this.read();
    const index = profiles.findIndex((p) => p.id === id);
    const current = profiles[index];
    if (!current) return { ok: false, reason: 'unknown_profile' };
    const profile = change(current);
    profiles[index] = profile;
    if (!this.write(profiles)) return { ok: false, reason: 'unavailable' };
    return { ok: true, profile };
  }

  private read(): ProfileEntry[] {
    let raw: string | null | undefined;
    try {
      raw = this.storage?.getItem(PROFILE_INDEX_KEY);
    } catch {
      return [];
    }
    if (!raw) return [];
    try {
      const list = (JSON.parse(raw) as { profiles?: unknown } | null)?.profiles;
      if (Array.isArray(list)) return list.filter(isEntry);
    } catch {
      // Index illisible : traité ci-dessous.
    }
    this.quarantine(raw);
    return [];
  }

  /** Conserve un index illisible à part plutôt que de l'écraser à la prochaine écriture. */
  private quarantine(raw: string): void {
    try {
      this.storage?.setItem(`${PROFILE_INDEX_KEY}:corrupt-${this.now()}`, raw);
      this.storage?.removeItem(PROFILE_INDEX_KEY);
    } catch {
      // Stockage plein ou refusé : on laisse la donnée en place.
    }
  }

  private write(profiles: ProfileEntry[]): boolean {
    try {
      if (!this.storage) return false;
      this.storage.setItem(PROFILE_INDEX_KEY, JSON.stringify({ version: 1, profiles }));
      return true;
    } catch {
      return false;
    }
  }
}
