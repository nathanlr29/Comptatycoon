import { getBuildingVisual, getConstructionProgress, type BuildingVisual } from '../core/buildings';
import type { GameState } from '../core/state';
import { DEPARTMENTS } from '../data/departments';
import { ROOMS, type RoomType } from '../data/office';

const ROOM_TYPES = new Set<string>(ROOMS.map((r) => r.type));

export interface RoomView {
  type: RoomType;
  level: number;
  visual: BuildingVisual;
}

/** Ce que la vue montre : niveau d'agrandissement (= niveau du Bureau principal, GDD §6) et pièces. */
export interface OfficeView {
  stage: number;
  rooms: RoomView[];
}

export function toOfficeView(state: GameState): OfficeView {
  const stage = state.buildings.find((b) => b.id === 'hq')?.level ?? 1;
  const rooms = state.buildings
    .filter((b) => ROOM_TYPES.has(b.type))
    .map((b): RoomView => ({ type: b.type as RoomType, level: b.level, visual: getBuildingVisual(state, b) }));
  // Un pôle ouvert occupe son espace dans le cabinet, sans chantier.
  for (const id of state.departments) {
    const type = DEPARTMENTS[id].room;
    if (!rooms.some((r) => r.type === type)) rooms.push({ type, level: 1, visual: 'built' });
  }
  return { stage, rooms };
}

/** Pièces terminées (leurs postes accueillent des employés). */
export function builtRoomTypes(view: OfficeView): RoomType[] {
  return view.rooms.filter((r) => r.visual !== 'works').map((r) => r.type);
}

/** Avancement des travaux en cours, par type de pièce. */
export function worksProgress(state: GameState, now: number): Map<string, number> {
  const out = new Map<string, number>();
  for (const b of state.buildings) if (b.pending || b.level === 0) out.set(b.type, getConstructionProgress(b, now));
  return out;
}

/** Clé qui change seulement quand le visuel doit changer. */
export function officeViewKey(view: OfficeView): string {
  return `${view.stage}|${view.rooms.map((r) => `${r.type}:${r.level}:${r.visual}`).sort().join(',')}`;
}
