/**
 * Cycle jour / nuit de la vue du cabinet, calé sur l'heure réelle du joueur. Fonctions pures, testées sans Phaser.
 * Seul l'habillage change (ciel des fenêtres, fond, éclairage) : aucune règle du jeu n'en dépend.
 */

export type DayPhase = 'night' | 'dawn' | 'day' | 'dusk';

export interface Daylight {
  phase: DayPhase;
  /** Ciel en haut et près de l'horizon (vu par les fenêtres). */
  skyTop: number;
  skyLow: number;
  /** Fond de la scène autour de l'immeuble. */
  backdrop: number;
  /** 0 = plein jour, 1 = nuit noire : assombrit la pièce et allume les lampes. */
  darkness: number;
  /** Intensité des taches de soleil au sol (0 à 1). */
  sun: number;
}

interface Key {
  hour: number;
  skyTop: number;
  skyLow: number;
  backdrop: number;
  darkness: number;
  sun: number;
}

const NIGHT: Omit<Key, 'hour'> = { skyTop: 0x0b1530, skyLow: 0x23305a, backdrop: 0x161d2b, darkness: 1, sun: 0 };
const DAY: Omit<Key, 'hour'> = { skyTop: 0x6cbcec, skyLow: 0xd4f0fc, backdrop: 0x232c3b, darkness: 0, sun: 1 };

/** Repères de la journée (heures locales), interpolés linéairement. */
const KEYS: Key[] = [
  { hour: 0, ...NIGHT },
  { hour: 5.5, ...NIGHT },
  { hour: 7, skyTop: 0x6f7fbf, skyLow: 0xf7b58c, backdrop: 0x262b3e, darkness: 0.45, sun: 0.35 },
  { hour: 8.5, ...DAY },
  { hour: 17.5, ...DAY },
  { hour: 19.5, skyTop: 0x51539c, skyLow: 0xf59a62, backdrop: 0x272a3d, darkness: 0.5, sun: 0.4 },
  { hour: 21.5, ...NIGHT },
  { hour: 24, ...NIGHT },
];

/** Mélange deux couleurs 0xRRGGBB (t = 0 → a, t = 1 → b). */
export function mixColor(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Heure décimale (0 ≤ h < 24) → ambiance. */
export function daylightAt(hour: number): Daylight {
  const h = ((hour % 24) + 24) % 24;
  const i = KEYS.findIndex((k) => k.hour > h);
  const b = KEYS[i] as Key;
  const a = KEYS[i - 1] as Key;
  const t = (h - a.hour) / (b.hour - a.hour);
  const lerp = (x: number, y: number) => x + (y - x) * t;
  const darkness = lerp(a.darkness, b.darkness);
  const phase: DayPhase = darkness >= 0.8 ? 'night' : darkness <= 0.05 ? 'day' : h < 12 ? 'dawn' : 'dusk';
  return {
    phase,
    skyTop: mixColor(a.skyTop, b.skyTop, t),
    skyLow: mixColor(a.skyLow, b.skyLow, t),
    backdrop: mixColor(a.backdrop, b.backdrop, t),
    darkness,
    sun: lerp(a.sun, b.sun),
  };
}

/** Heure décimale locale d'une date. */
export function localHour(date: Date): number {
  return date.getHours() + date.getMinutes() / 60;
}

/** Angles des aiguilles d'une horloge (radians, 0 = midi, sens horaire). */
export function clockHands(date: Date): { hour: number; minute: number } {
  const m = date.getMinutes() + date.getSeconds() / 60;
  const h = (date.getHours() % 12) + m / 60;
  return { hour: (h / 12) * Math.PI * 2, minute: (m / 60) * Math.PI * 2 };
}
