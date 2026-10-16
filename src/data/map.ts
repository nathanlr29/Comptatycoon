/** Plan intérieur du cabinet : locaux (zones) et emplacements de pièces prédéfinis (docs/GDD.md §6). */

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

export const WORLD = { width: 1600, height: 1240 } as const;

/** Enveloppe du bâtiment (murs extérieurs) ; la rue est en dessous. */
export const BUILDING: Rect = { x: 60, y: 100, w: 1480, h: 900 };

/** Locaux loués au fil de la partie. `start` est le petit bureau de départ. */
export const ZONES: Zone[] = [
  { id: 'start', name: 'Le bureau', rect: { x: 480, y: 540, w: 560, h: 440 }, unlockLevel: 1 },
  { id: 'east', name: 'Local voisin', rect: { x: 1080, y: 540, w: 440, h: 440 }, unlockLevel: 2 },
  { id: 'north', name: 'Le plateau', rect: { x: 480, y: 120, w: 1040, h: 380 }, unlockLevel: 3 },
  { id: 'garden', name: 'Espace détente', rect: { x: 80, y: 120, w: 360, h: 860 }, unlockLevel: 4 },
];

/** Bureau principal : la première pièce du petit bureau. */
export const HQ_SLOT: Slot = { id: 'hq', zone: 'start', x: 500, y: 560, w: 250, h: 190 };

/** Accueil du petit bureau (décor fixe, porte sur la rue). */
export const RECEPTION: Rect = { x: 770, y: 770, w: 250, h: 190 };

/** Coin café du local voisin (décor fixe). */
export const KITCHEN: Rect = { x: 1310, y: 770, w: 190, h: 190 };

/** Point cadré au lancement et par « Recentrer » : le centre du petit bureau. */
export const START_VIEW = { x: 760, y: 730 } as const;

/** Emplacements de pièces (le type est choisi par le joueur, étape 5). */
export const SLOTS: Slot[] = [
  { id: 'start-1', zone: 'start', x: 770, y: 560, w: 250, h: 190 },
  { id: 'start-2', zone: 'start', x: 500, y: 770, w: 250, h: 190 },
  { id: 'east-1', zone: 'east', x: 1100, y: 560, w: 190, h: 190 },
  { id: 'east-2', zone: 'east', x: 1310, y: 560, w: 190, h: 190 },
  { id: 'east-3', zone: 'east', x: 1100, y: 770, w: 190, h: 190 },
  { id: 'north-1', zone: 'north', x: 510, y: 150, w: 300, h: 320 },
  { id: 'north-2', zone: 'north', x: 850, y: 150, w: 300, h: 320 },
  { id: 'north-3', zone: 'north', x: 1190, y: 150, w: 300, h: 320 },
  { id: 'garden-1', zone: 'garden', x: 110, y: 170, w: 300, h: 220 },
  { id: 'garden-2', zone: 'garden', x: 110, y: 440, w: 300, h: 220 },
  { id: 'garden-3', zone: 'garden', x: 110, y: 710, w: 300, h: 220 },
];

export function getZone(id: ZoneId): Zone {
  const zone = ZONES.find((z) => z.id === id);
  if (!zone) throw new Error(`Zone inconnue : ${id}`);
  return zone;
}

export function isZoneUnlocked(zone: Zone, hqLevel: number): boolean {
  return hqLevel >= zone.unlockLevel;
}
