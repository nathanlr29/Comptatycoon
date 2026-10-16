import type { GameState } from '../core/state';
import type { ProfileEntry } from './ProfileStore';

/** Sous-ensemble de l'API Web Storage utilisé (remplaçable en test). */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

export const STORAGE_PREFIX = 'comptatycoon:';
export const saveKey = (profileId: string): string => `${STORAGE_PREFIX}save:${profileId}`;
export const backupKey = (profileId: string): string => `${saveKey(profileId)}:backup`;
export const corruptKey = (profileId: string, at: number): string => `${saveKey(profileId)}:corrupt-${at}`;

/**
 * - `ok` : sauvegarde valide restaurée ;
 * - `new` : aucune sauvegarde, partie neuve ;
 * - `corrupt` : donnée illisible, conservée sous `corruptKey`, partie neuve en attendant ;
 * - `unavailable` : stockage inaccessible (mode privé, refus), partie neuve non sauvegardée.
 */
export type LoadResult =
  | { status: 'ok' | 'new'; state: GameState }
  | { status: 'corrupt'; state: GameState; error: string; corruptKey: string | null; backupAvailable: boolean }
  | { status: 'unavailable'; state: GameState };

export type SaveResult = { ok: true } | { ok: false; reason: 'unavailable' | 'quota' | 'unknown_profile' };

export type ImportResult =
  | { ok: true; profile: ProfileEntry }
  | { ok: false; reason: 'invalid'; error: string }
  | { ok: false; reason: 'limit' | 'unavailable' };

/** Sauvegarde par profil (cabinet). Une implémentation locale ; un compte en ligne viendra à l'étape 10. */
export interface SaveService {
  load(profileId: string): LoadResult;
  save(profileId: string, state: GameState): SaveResult;
  remove(profileId: string): void;
  exportText(profileId: string): string | null;
  importText(text: string): ImportResult;
}
