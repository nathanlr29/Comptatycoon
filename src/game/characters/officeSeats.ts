/** Sièges du plan en fausse 3D : un par poste visible (src/data/office.ts), en coordonnées monde. */
import { visibleDesks, type RoomType } from '../../data/office';
import { depthOf, isoToScreen } from '../iso';
import type { Seat } from './seating';

/** Décalage écran (px) entre le point du siège et le personnage. */
const SHIFT_X = 9;
const SHIFT_Y = 7;

export function officeSeats(stage: number, rooms: readonly RoomType[]): Seat[] {
  return visibleDesks(stage, rooms).map((d) => {
    const p = isoToScreen(d.x, d.y);
    // Recentre la personne au-dessus de son bureau (décalé d'un côté selon `facing`), mains sur le plateau.
    return { x: p.x + (d.facing === 's' ? -SHIFT_X : SHIFT_X), y: p.y + SHIFT_Y, kind: d.reserved ? 'partner' : 'staff', depth: depthOf(d.x, d.y) + 1 };
  });
}
