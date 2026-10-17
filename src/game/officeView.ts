import { getBuildingVisual, getConstructionProgress, type BuildingVisual } from '../core/buildings';
import type { GameState } from '../core/state';
import { DEPARTMENTS } from '../data/departments';
import { EXTERIOR_TYPES, ROOMS, SIGN_SPAN, parkingRect, type PlanType, type RoomType, type TileRect } from '../data/office';
import { PERK_CATALOG, type PerkId } from '../data/perks';

const PLAN_TYPES = new Set<string>([...ROOMS.map((r) => r.type), ...EXTERIOR_TYPES]);

export interface RoomView {
  type: PlanType;
  level: number;
  visual: BuildingVisual;
}

/** Ce que la vue montre : niveau d'agrandissement (= niveau du Bureau principal, GDD §6) et pièces. */
export interface OfficeView {
  stage: number;
  rooms: RoomView[];
  /** Confort des équipes acheté : chaque avantage a son objet sur le plan (src/data/perks.ts). */
  perks?: PerkId[];
}

export function toOfficeView(state: GameState): OfficeView {
  const stage = state.buildings.find((b) => b.id === 'hq')?.level ?? 1;
  const rooms = state.buildings
    .filter((b) => PLAN_TYPES.has(b.type))
    .map((b): RoomView => ({ type: b.type as PlanType, level: b.level, visual: getBuildingVisual(state, b) }));
  // Un pôle ouvert occupe son espace dans le cabinet, sans chantier.
  for (const id of state.departments) {
    const type = DEPARTMENTS[id].room;
    if (!rooms.some((r) => r.type === type)) rooms.push({ type, level: 1, visual: 'built' });
  }
  const perks = state.upgrades.filter((id): id is PerkId => id in PERK_CATALOG);
  return { stage, rooms, perks };
}

/** Pièces terminées (leurs postes accueillent des employés). */
export function builtRoomTypes(view: OfficeView): RoomType[] {
  return view.rooms.filter((r) => r.visual !== 'works' && !EXTERIOR_TYPES.includes(r.type)).map((r) => r.type as RoomType);
}

/** Niveau du parking affiché (0 = aucun), en comptant le niveau en travaux pour ne rien couper à l'écran. */
export function parkingLevel(view: OfficeView): number {
  const p = view.rooms.find((r) => r.type === 'parking');
  return p ? Math.max(1, p.level) : 0;
}

/** Avancement des travaux en cours, par type de pièce. */
export function worksProgress(state: GameState, now: number): Map<string, number> {
  const out = new Map<string, number>();
  for (const b of state.buildings) if (b.pending || b.level === 0) out.set(b.type, getConstructionProgress(b, now));
  return out;
}

/** Clé qui change seulement quand le visuel doit changer. */
export function officeViewKey(view: OfficeView): string {
  return `${view.stage}|${view.rooms.map((r) => `${r.type}:${r.level}:${r.visual}`).sort().join(',')}|${[...(view.perks ?? [])].sort().join(',')}`;
}

/** Emprise au sol d'un bâtiment acheté (pièce, parking) ; pour l'enseigne, la bande de sol sous elle. */
export function planRect(view: OfficeView, type: PlanType): TileRect | null {
  if (type === 'parking') return parkingRect(view.stage, parkingLevel(view));
  if (type === 'signage') return { x: SIGN_SPAN.x0, y: 0, w: SIGN_SPAN.x1 - SIGN_SPAN.x0, h: 0.6 };
  return ROOMS.find((r) => r.type === type)?.rect ?? null;
}
