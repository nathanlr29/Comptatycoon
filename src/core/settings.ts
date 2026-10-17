/**
 * Réglages de l'appareil (son, affichage, notifications…), distincts de la sauvegarde d'un cabinet.
 * Fonctions pures : la lecture du stockage et l'application à la page sont dans `src/settings.ts`.
 */

/** `system` suit le réglage « Réduire les animations » de l'appareil. */
export type MotionPreference = 'system' | 'full' | 'reduced';
/** `short` : 12,5 k€ ; `full` : 12 500 €. */
export type NumberNotation = 'short' | 'full';
export type NotificationKind = 'events' | 'works' | 'objectives';

export const NOTIFICATION_KINDS: readonly NotificationKind[] = ['events', 'works', 'objectives'];
export const TEXT_SCALES = [0.9, 1, 1.15, 1.3] as const;
export const AUTOSAVE_SECONDS = [5, 15, 30, 60] as const;

export interface Settings {
  /** Effets sonores : coupés ou non, volume de 0 à 1. */
  sound: { enabled: boolean; volume: number };
  motion: MotionPreference;
  notation: NumberNotation;
  /** Facteur de la taille du texte de l'interface (une des valeurs de `TEXT_SCALES`). */
  textScale: number;
  /** Intervalle de la sauvegarde automatique (une des valeurs de `AUTOSAVE_SECONDS`). */
  autosaveSeconds: number;
  notifications: Record<NotificationKind, boolean>;
  /** Carte des objectifs en bas de l'écran. */
  showObjectives: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  sound: { enabled: true, volume: 0.5 },
  motion: 'system',
  notation: 'short',
  textScale: 1,
  autosaveSeconds: 15,
  notifications: { events: true, works: true, objectives: true },
  showObjectives: true,
};

type Raw = Record<string, unknown>;

function record(value: unknown): Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Raw) : {};
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function oneOf<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Relit des réglages venus du stockage : toute valeur absente ou invalide reprend sa valeur par défaut. */
export function readSettings(value: unknown): Settings {
  const raw = record(value);
  const sound = record(raw.sound);
  const notifications = record(raw.notifications);
  const d = DEFAULT_SETTINGS;
  const volume = typeof sound.volume === 'number' && Number.isFinite(sound.volume) ? Math.min(1, Math.max(0, sound.volume)) : d.sound.volume;
  return {
    sound: { enabled: bool(sound.enabled, d.sound.enabled), volume },
    motion: oneOf(raw.motion, ['system', 'full', 'reduced'] as const, d.motion),
    notation: oneOf(raw.notation, ['short', 'full'] as const, d.notation),
    textScale: oneOf(raw.textScale, TEXT_SCALES, 1),
    autosaveSeconds: oneOf(raw.autosaveSeconds, AUTOSAVE_SECONDS, 15),
    notifications: Object.fromEntries(NOTIFICATION_KINDS.map((k) => [k, bool(notifications[k], d.notifications[k])])) as Record<NotificationKind, boolean>,
    showObjectives: bool(raw.showObjectives, d.showObjectives),
  };
}

/** Applique une modification partielle (les sous-objets sont fusionnés) puis revalide. */
export function updateSettings(current: Settings, patch: SettingsPatch): Settings {
  return readSettings({
    ...current,
    ...patch,
    sound: { ...current.sound, ...patch.sound },
    notifications: { ...current.notifications, ...patch.notifications },
  });
}

export type SettingsPatch = Partial<Omit<Settings, 'sound' | 'notifications'>> & {
  sound?: Partial<Settings['sound']>;
  notifications?: Partial<Settings['notifications']>;
};

/** Animations réduites : choix du joueur, ou réglage de l'appareil en mode `system`. */
export function isMotionReduced(settings: Settings, systemPrefersReduced: boolean): boolean {
  return settings.motion === 'system' ? systemPrefersReduced : settings.motion === 'reduced';
}

/** Volume réellement joué (0 si le son est coupé). */
export function effectiveVolume(settings: Settings): number {
  return settings.sound.enabled ? settings.sound.volume : 0;
}

/** Une notification de ce type doit-elle s'afficher ? Les autres (alertes de sauvegarde…) s'affichent toujours. */
export function isNotificationEnabled(settings: Settings, kind: NotificationKind | undefined): boolean {
  return kind === undefined || settings.notifications[kind];
}
