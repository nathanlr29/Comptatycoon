/**
 * Sièges provisoires sur le plan actuel, en attendant les bureaux de la refonte en fausse 3D
 * (fil « Vue intérieure du cabinet ») : l'associé dans le Bureau principal, les collaborateurs
 * en open space dans les emplacements des locaux loués.
 */
import { HQ_SLOT, SLOTS, ZONES, isZoneUnlocked, type Slot } from '../../data/map';
import type { Seat } from './seating';
import { CHARACTER } from './sprites';

const CELL = { w: CHARACTER.width + 2, h: CHARACTER.height + 10 } as const;
/** Emplacement du Plateau réservé aux bureaux des associés suivants. */
const PARTNER_SLOT = 'north-1';

/** Emplacements meublés en open space provisoire (plus de « + » dessus). */
export function staffSlots(hqLevel: number): Slot[] {
  const open = new Set(ZONES.filter((z) => isZoneUnlocked(z, hqLevel)).map((z) => z.id));
  return SLOTS.filter((s) => open.has(s.zone));
}

export function tempSeats(hqLevel: number): Seat[] {
  const seats: Seat[] = [{ x: HQ_SLOT.x + HQ_SLOT.w / 2 + 20, y: HQ_SLOT.y + HQ_SLOT.h - 18, kind: 'partner' }];
  for (const slot of staffSlots(hqLevel)) seats.push(...grid(slot, slot.id === PARTNER_SLOT ? 'partner' : 'staff'));
  return seats;
}

function grid(r: Slot, kind: Seat['kind']): Seat[] {
  const cols = Math.floor((r.w - 12) / CELL.w);
  const rows = Math.floor((r.h - 12) / CELL.h);
  const ox = r.x + (r.w - cols * CELL.w) / 2 + CELL.w / 2;
  const oy = r.y + (r.h - rows * CELL.h) / 2 + CELL.h - 4;
  const seats: Seat[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) seats.push({ x: ox + col * CELL.w, y: oy + row * CELL.h, kind });
  }
  return seats;
}
