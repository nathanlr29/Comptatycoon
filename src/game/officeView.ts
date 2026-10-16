import type { GameState } from '../core/state';
import { ROOMS, type RoomType } from '../data/office';
import type { OfficeView } from './OfficeRenderer';

const ROOM_TYPES = new Set<string>(ROOMS.map((r) => r.type));

/** Ce que la vue doit montrer d'après l'état : niveau d'agrandissement = niveau du Bureau principal (GDD §6). */
export function toOfficeView(state: GameState): OfficeView {
  const stage = state.buildings.find((b) => b.id === 'hq')?.level ?? 1;
  const rooms = state.buildings.filter((b) => ROOM_TYPES.has(b.type)).map((b) => ({ type: b.type as RoomType, level: b.level }));
  return { stage, rooms };
}

/** Clé qui change seulement quand le visuel doit changer. */
export function officeViewKey(view: OfficeView): string {
  return `${view.stage}|${view.rooms.map((r) => `${r.type}:${r.level}`).sort().join(',')}`;
}
