import { DEFAULT_SETTINGS, readSettings, updateSettings, type Settings, type SettingsPatch } from '../core/settings';
import type { KeyValueStorage } from './SaveService';

/** Clé des réglages : un seul jeu de réglages par appareil, quel que soit le cabinet. */
export const SETTINGS_KEY = 'comptatycoon:settings';

export type SettingsListener = (settings: Settings) => void;

/** Réglages de l'appareil, relus et écrits dans le stockage local ; prévient les abonnés à chaque changement. */
export class SettingsStore {
  private current: Settings;
  private readonly listeners = new Set<SettingsListener>();

  /** `storage` : `null` si le stockage est indisponible (les réglages durent alors le temps de la page). */
  constructor(private readonly storage: KeyValueStorage | null) {
    this.current = this.load();
  }

  get(): Settings {
    return this.current;
  }

  update(patch: SettingsPatch): Settings {
    this.current = updateSettings(this.current, patch);
    try {
      this.storage?.setItem(SETTINGS_KEY, JSON.stringify(this.current));
    } catch {
      // Stockage plein ou refusé : le réglage reste actif pour cette visite.
    }
    this.emit();
    return this.current;
  }

  reset(): Settings {
    return this.update(DEFAULT_SETTINGS);
  }

  /** Abonnement ; renvoie la fonction de désabonnement. */
  subscribe(fn: SettingsListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Prévient les abonnés sans changement de réglage (ex. réglage de l'appareil modifié). */
  emit(): void {
    for (const fn of this.listeners) fn(this.current);
  }

  private load(): Settings {
    try {
      const text = this.storage?.getItem(SETTINGS_KEY);
      return text ? readSettings(JSON.parse(text)) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
}
