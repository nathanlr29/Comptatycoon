import { createInitialState, type GameState } from '../core/state';
import { MAX_PROFILES, PROFILE_NAME_MAX, ProfileStore } from './ProfileStore';
import { parseSave, serializeSave, validateSave } from './SaveSchema';
import {
  backupKey,
  corruptKey,
  saveKey,
  type ImportResult,
  type KeyValueStorage,
  type LoadResult,
  type SaveResult,
  type SaveService,
} from './SaveService';

/** Texte d'export : la sauvegarde accompagnée du nom du cabinet. */
const EXPORT_FORMAT = 'comptatycoon-cabinet';

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22);
}

/** Renvoie `localStorage`, ou `null` s'il est inaccessible (certains modes privés lèvent une exception). */
export function getBrowserStorage(): KeyValueStorage | null {
  try {
    const storage = globalThis.localStorage;
    const probe = 'comptatycoon:probe';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/** Demande au navigateur de ne pas effacer les données du site (sans effet si refusé). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await globalThis.navigator?.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export class LocalSaveService implements SaveService {
  constructor(
    private readonly storage: KeyValueStorage | null,
    readonly profiles: ProfileStore,
    private readonly now: () => number = Date.now,
  ) {}

  load(profileId: string): LoadResult {
    const fresh = createInitialState(this.now());
    const raw = this.get(saveKey(profileId));
    if (raw === undefined) return { status: 'unavailable', state: fresh };
    if (raw === null) return { status: 'new', state: fresh };
    const parsed = parseSave(raw);
    if (parsed.ok) return { status: 'ok', state: parsed.save.state };

    // Donnée illisible : on la met de côté, la partie démarre quand même.
    const keptAt = corruptKey(profileId, this.now());
    const kept = this.set(keptAt, raw) === null;
    if (kept) this.del(saveKey(profileId));
    const backup = this.get(backupKey(profileId));
    return {
      status: 'corrupt',
      state: fresh,
      error: parsed.error,
      corruptKey: kept ? keptAt : null,
      backupAvailable: typeof backup === 'string' && parseSave(backup).ok,
    };
  }

  /** Restaure la copie de secours en sauvegarde principale ; `null` si elle est absente ou invalide. */
  restoreBackup(profileId: string): GameState | null {
    const raw = this.get(backupKey(profileId));
    if (typeof raw !== 'string') return null;
    const parsed = parseSave(raw);
    if (!parsed.ok) return null;
    this.set(saveKey(profileId), raw);
    return parsed.save.state;
  }

  save(profileId: string, state: GameState): SaveResult {
    if (!this.storage) return { ok: false, reason: 'unavailable' };
    if (!this.profiles.get(profileId)) return { ok: false, reason: 'unknown_profile' };
    // La sauvegarde précédente, si elle est valide, devient la copie de secours.
    const previous = this.get(saveKey(profileId));
    if (typeof previous === 'string' && parseSave(previous).ok) this.set(backupKey(profileId), previous);
    const error = this.set(saveKey(profileId), serializeSave(state, this.now()));
    if (error) return { ok: false, reason: error };
    this.profiles.recordSave(profileId, state);
    return { ok: true };
  }

  /** Efface toutes les données du cabinet (sauvegarde, secours, données corrompues) et son entrée d'index. */
  remove(profileId: string): void {
    const prefix = saveKey(profileId);
    for (const key of this.keys()) {
      if (key === prefix || key.startsWith(`${prefix}:`)) this.del(key);
    }
    this.profiles.remove(profileId);
  }

  exportText(profileId: string): string | null {
    const profile = this.profiles.get(profileId);
    const raw = this.get(saveKey(profileId));
    if (!profile || typeof raw !== 'string') return null;
    const parsed = parseSave(raw);
    if (!parsed.ok) return null;
    return JSON.stringify({ format: EXPORT_FORMAT, name: profile.name, ...parsed.save });
  }

  /** Valide le texte collé et crée un nouveau cabinet avec cette partie. */
  importText(text: string): ImportResult {
    let value: unknown;
    try {
      value = JSON.parse(text.trim());
    } catch {
      return { ok: false, reason: 'invalid', error: 'texte illisible' };
    }
    const data = value as { format?: unknown; name?: unknown } | null;
    if (data?.format !== EXPORT_FORMAT) return { ok: false, reason: 'invalid', error: 'ce n’est pas un export ComptaTycoon' };
    const parsed = validateSave(value);
    if (!parsed.ok) return { ok: false, reason: 'invalid', error: parsed.error };
    if (!this.storage) return { ok: false, reason: 'unavailable' };
    if (this.profiles.list().length >= MAX_PROFILES) return { ok: false, reason: 'limit' };

    const name = typeof data.name === 'string' ? [...data.name.trim()].slice(0, PROFILE_NAME_MAX).join('') : '';
    const created = this.profiles.create(name.length >= 2 ? name : 'Cabinet importé');
    if (!created.ok) return { ok: false, reason: created.reason === 'limit' ? 'limit' : 'unavailable' };
    const saved = this.save(created.profile.id, parsed.save.state);
    if (!saved.ok) {
      this.profiles.remove(created.profile.id);
      return { ok: false, reason: 'unavailable' };
    }
    return { ok: true, profile: this.profiles.get(created.profile.id) ?? created.profile };
  }

  /** `undefined` si le stockage est inaccessible. */
  private get(key: string): string | null | undefined {
    try {
      return this.storage ? this.storage.getItem(key) : undefined;
    } catch {
      return undefined;
    }
  }

  /** Renvoie `null` si l'écriture a réussi, sinon la raison de l'échec. */
  private set(key: string, value: string): 'unavailable' | 'quota' | null {
    try {
      if (!this.storage) return 'unavailable';
      this.storage.setItem(key, value);
      return null;
    } catch (error) {
      return isQuotaError(error) ? 'quota' : 'unavailable';
    }
  }

  private del(key: string): void {
    try {
      this.storage?.removeItem(key);
    } catch {
      // Rien à faire : la clé restera, sans conséquence pour la partie en cours.
    }
  }

  private keys(): string[] {
    const keys: string[] = [];
    try {
      if (!this.storage) return keys;
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key !== null) keys.push(key);
      }
    } catch {
      // Stockage inaccessible : aucune clé.
    }
    return keys;
  }
}
