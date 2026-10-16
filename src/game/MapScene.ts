import Phaser from 'phaser';
import { HQ_SLOT, SLOTS, WORLD, ZONES, isZoneUnlocked, type Rect } from '../data/map';
import { CameraController } from './CameraController';
import { hitTest, screenToWorld } from './geometry';
import { InputController } from './InputController';
import { MapRenderer } from './MapRenderer';
import type { GameStore } from '../core/store';

/** Ce que l'interface peut écouter sur `game.events`. */
export const MAP_EVENTS = {
  /** id du bâtiment sélectionné, ou null pour désélection. */
  buildingSelected: 'building:selected',
  /** id d'un emplacement libre d'une zone ouverte. */
  slotSelected: 'slot:selected',
  /** id d'une zone verrouillée touchée. */
  zoneSelected: 'zone:selected',
  /** À émettre par l'interface pour recentrer la caméra. */
  recenter: 'camera:recenter',
  /** À émettre par l'interface quand le panneau de sélection se ferme. */
  clearSelection: 'selection:clear',
} as const;

const HQ_CENTER = { x: HQ_SLOT.x + HQ_SLOT.w / 2, y: HQ_SLOT.y + HQ_SLOT.h / 2 };

export class MapScene extends Phaser.Scene {
  private camera!: CameraController;
  private mapView!: MapRenderer;
  private hqLevel = 1;

  constructor(private readonly store: GameStore) {
    super('map');
  }

  create(): void {
    this.mapView = new MapRenderer(this);
    this.hqLevel = this.readHqLevel();
    this.mapView.render(this.hqLevel);

    this.camera = new CameraController(this.cameras.main);
    this.camera.centerOn(HQ_CENTER.x, HQ_CENTER.y);
    new InputController(this, this.camera, (sx, sy) => this.select(sx, sy));

    const onResize = (size: Phaser.Structs.Size) => this.camera.resize(size.width, size.height);
    const onRecenter = () => this.camera.centerOn(HQ_CENTER.x, HQ_CENTER.y);
    const onClear = () => this.mapView.setHighlight(null);
    // Ne redessine la carte que si le niveau du Bureau principal change.
    const unsubscribe = this.store.subscribe(() => {
      const level = this.readHqLevel();
      if (level !== this.hqLevel) this.mapView.render((this.hqLevel = level));
    });
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

    if (hitTest([HQ_SLOT], p.x, p.y)) return this.emitSelection(MAP_EVENTS.buildingSelected, 'hq', HQ_SLOT);

    // Pas de surbrillance tant qu'on ne peut rien construire (étape 5).
    const slot = hitTest(SLOTS, p.x, p.y);
    if (slot) return this.emitSelection(MAP_EVENTS.slotSelected, slot.id, null);

    this.emitSelection(MAP_EVENTS.buildingSelected, null, null);
  }

  private readHqLevel(): number {
    return this.store.getState().buildings.find((b) => b.id === 'hq')?.level ?? 1;
  }

  private emitSelection(event: string, id: string | null, rect: Rect | null): void {
    this.mapView.setHighlight(rect);
    this.game.events.emit(event, id);
  }
}
