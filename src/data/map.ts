/** Carte du cabinet : monde, zones et emplacements prédéfinis (docs/GDD.md §6). */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ZoneId = 'start' | 'east' | 'north' | 'garden';

export interface Zone {
  id: ZoneId;
  name: string;
  rect: Rect;
  /** Niveau du Bureau principal qui ouvre la zone (1 = ouverte dès le départ). */
  unlockLevel: number;
}

export interface Slot extends Rect {
  id: string;
  zone: ZoneId;
}

export const WORLD = { width: 2400, height: 1800 } as const;

export const ZONES: Zone[] = [
  { id: 'start', name: 'Cabinet', rect: { x: 650, y: 560, w: 1100, h: 800 }, unlockLevel: 1 },
  { id: 'east', name: 'Aile Est', rect: { x: 1800, y: 420, w: 560, h: 1000 }, unlockLevel: 2 },
  { id: 'north', name: 'Aile Nord', rect: { x: 650, y: 60, w: 1100, h: 450 }, unlockLevel: 3 },
  { id: 'garden', name: 'Jardins', rect: { x: 40, y: 420, w: 560, h: 1000 }, unlockLevel: 4 },
];

/** Emplacement du Bureau principal, au centre de la carte. */
export const HQ_SLOT: Slot = { id: 'hq', zone: 'start', x: 1090, y: 800, w: 220, h: 200 };

/** Emplacements constructibles (le type de bâtiment est choisi par le joueur, étape 5). */
export const SLOTS: Slot[] = [
  { id: 'start-w', zone: 'start', x: 720, y: 820, w: 180, h: 160 },
  { id: 'start-e', zone: 'start', x: 1500, y: 820, w: 180, h: 160 },
  { id: 'start-sw', zone: 'start', x: 850, y: 1130, w: 180, h: 160 },
  { id: 'start-se', zone: 'start', x: 1370, y: 1130, w: 180, h: 160 },
  { id: 'east-1', zone: 'east', x: 1880, y: 500, w: 200, h: 180 },
  { id: 'east-2', zone: 'east', x: 1880, y: 820, w: 200, h: 180 },
  { id: 'east-3', zone: 'east', x: 1880, y: 1140, w: 200, h: 180 },
  { id: 'north-1', zone: 'north', x: 740, y: 160, w: 220, h: 200 },
  { id: 'north-2', zone: 'north', x: 1090, y: 160, w: 220, h: 200 },
  { id: 'north-3', zone: 'north', x: 1440, y: 160, w: 220, h: 200 },
  { id: 'garden-1', zone: 'garden', x: 140, y: 520, w: 160, h: 140 },
  { id: 'garden-2', zone: 'garden', x: 140, y: 850, w: 160, h: 140 },
  { id: 'garden-3', zone: 'garden', x: 140, y: 1180, w: 160, h: 140 },
];

export function getZone(id: ZoneId): Zone {
  const zone = ZONES.find((z) => z.id === id);
  if (!zone) throw new Error(`Zone inconnue : ${id}`);
  return zone;
}

export function isZoneUnlocked(zone: Zone, hqLevel: number): boolean {
  return hqLevel >= zone.unlockLevel;
}
