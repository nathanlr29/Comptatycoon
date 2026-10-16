import Phaser from 'phaser';
import { HQ_SLOT, SLOTS, START_VIEW, WORLD, ZONES, isZoneUnlocked, type Rect } from '../data/map';
import { CameraController } from './CameraController';
import { hitTest, screenToWorld } from './geometry';
import { InputController } from './InputController';
import { MapRenderer } from './MapRenderer';
import { getBuildingAt, getConstructionProgress, getHqLevel, getOpenSpaceStaff, getSlotVisual } from '../core/buildings';
import type { GameState } from '../core/state';
import type { GameStore } from '../core/store';

/** Ce que l'interface peut écouter sur `game.events`. */
export const MAP_EVENTS = {
  /** id du bâtiment sélectionné, ou null pour désélection. */
  buildingSelected: 'building:selected',
  /** id d'un emplacement libre d'un local ouvert. */
  slotSelected: 'slot:selected',
  /** id d'une zone verrouillée touchée. */
  zoneSelected: 'zone:selected',
  /** À émettre par l'interface pour recentrer la caméra. */
  recenter: 'camera:recenter',
  /** À émettre par l'interface quand le panneau de sélection se ferme. */
  clearSelection: 'selection:clear',
} as const;

export class MapScene extends Phaser.Scene {
  private camera!: CameraController;
  private mapView!: MapRenderer;
  private hqLevel = 1;
  private signature = '';
  private pending = new Set<string>();

  constructor(private readonly store: GameStore) {
    super('map');
  }

  create(): void {
    this.mapView = new MapRenderer(this);
    this.refresh(this.store.getState());

    this.camera = new CameraController(this.cameras.main);
    this.camera.centerOn(START_VIEW.x, START_VIEW.y);
    new InputController(this, this.camera, (sx, sy) => this.select(sx, sy));

    const onResize = (size: Phaser.Structs.Size) => this.camera.resize(size.width, size.height);
    const onRecenter = () => this.camera.centerOn(START_VIEW.x, START_VIEW.y);
    const onClear = () => this.mapView.setHighlight(null);
    const unsubscribe = this.store.subscribe((state) => this.refresh(state));
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.game.events.on(MAP_EVENTS.recenter, onRecenter);
    this.game.events.on(MAP_EVENTS.clearSelection, onClear);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribe();
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      this.game.events.off(MAP_EVENTS.recenter, onRecenter);
      this.game.events.off(MAP_EVENTS.clearSelection, onClear);
    });
  }

  update(_time: number, delta: number): void {
    this.camera.update(delta);
  }

  private select(sx: number, sy: number): void {
    const p = screenToWorld(this.camera.view(), sx, sy);
    if (p.x < 0 || p.y < 0 || p.x > WORLD.width || p.y > WORLD.height) return;

    const lockedZone = hitTest(
      ZONES.filter((z) => !isZoneUnlocked(z, this.hqLevel)).map((z) => ({ ...z.rect, id: z.id })),
      p.x,
      p.y,
    );
    if (lockedZone) return this.emitSelection(MAP_EVENTS.zoneSelected, lockedZone.id, null);

    const slot = hitTest([HQ_SLOT, ...SLOTS], p.x, p.y);
    if (slot) {
      const building = getBuildingAt(this.store.getState(), slot.id);
      if (building) return this.emitSelection(MAP_EVENTS.buildingSelected, building.id, slot);
      return this.emitSelection(MAP_EVENTS.slotSelected, slot.id, slot);
    }

    this.emitSelection(MAP_EVENTS.buildingSelected, null, null);
  }

  /** Redessine seulement si ce qui se voit a changé (barre de travaux par pas de 5 %). */
  private refresh(state: GameState): void {
    const now = Date.now();
    this.hqLevel = getHqLevel(state);
    const parts = [String(Math.min(getOpenSpaceStaff(state), 99))];
    for (const b of state.buildings) {
      const progress = b.pending ? Math.floor(getConstructionProgress(b, now) * 20) : '';
      parts.push(`${b.id}:${b.level}:${progress}:${getSlotVisual(state, b.slotId)}`);
    }
    const signature = parts.join('|');
    if (signature !== this.signature) {
      this.signature = signature;
      this.mapView.render(state, now);
    }
    this.flashFinished(state);
  }

  private flashFinished(state: GameState): void {
    const pending = new Set(state.buildings.filter((b) => b.pending).map((b) => b.id));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const id of this.pending) {
      if (pending.has(id) || reduced) continue;
      const slotId = state.buildings.find((b) => b.id === id)?.slotId;
      const rect = [HQ_SLOT, ...SLOTS].find((s) => s.id === slotId);
      if (rect) this.mapView.flash(rect);
    }
    this.pending = pending;
  }

  private emitSelection(event: string, id: string | null, rect: Rect | null): void {
    this.mapView.setHighlight(rect);
    this.game.events.emit(event, id);
  }
}
