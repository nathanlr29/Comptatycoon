import Phaser from 'phaser';
import { getExpansionLevel } from '../data/expansion';
import { HQ_SLOT, START_VIEW, WORLD, getZone, type Rect } from '../data/map';
import { CameraController } from './CameraController';
import { playReveal } from './expansionView';
import { hitTest, screenToWorld } from './geometry';
import { InputController } from './InputController';
import { MapRenderer } from './MapRenderer';
import { StaffLayer } from './characters/StaffLayer';
import { tempSeats } from './characters/tempSeats';
import type { GameStore } from '../core/store';

/** Ce que l'interface peut écouter sur `game.events`. */
export const MAP_EVENTS = {
  /** id du bâtiment sélectionné, ou null pour désélection. */
  buildingSelected: 'building:selected',
  /** À émettre par l'interface pour recentrer la caméra. */
  recenter: 'camera:recenter',
  /** À émettre par l'interface quand le panneau de sélection se ferme. */
  clearSelection: 'selection:clear',
} as const;

export class MapScene extends Phaser.Scene {
  private camera!: CameraController;
  private mapView!: MapRenderer;
  private staffView!: StaffLayer;
  private hqLevel = 1;

  constructor(private readonly store: GameStore) {
    super('map');
  }

  create(): void {
    this.mapView = new MapRenderer(this);
    this.hqLevel = this.readHqLevel();
    this.mapView.render(this.hqLevel);
    this.staffView = new StaffLayer(this);
    this.staffView.setSeats(tempSeats(this.hqLevel));
    this.staffView.sync(this.store.getState());

    this.camera = new CameraController(this.cameras.main);
    this.camera.centerOn(START_VIEW.x, START_VIEW.y);
    new InputController(this, this.camera, (sx, sy) => this.select(sx, sy));

    const onResize = (size: Phaser.Structs.Size) => this.camera.resize(size.width, size.height);
    const onRecenter = () => this.camera.centerOn(START_VIEW.x, START_VIEW.y);
    const onClear = () => this.mapView.setHighlight(null);
    // Ne redessine la carte que si le niveau du cabinet change ; un agrandissement se révèle.
    const unsubscribe = this.store.subscribe(() => {
      const level = this.readHqLevel();
      if (level !== this.hqLevel) {
        const grew = level === this.hqLevel + 1;
        this.hqLevel = level;
        if (grew) this.reveal(level);
        else this.mapView.render(level);
        this.staffView.setSeats(tempSeats(level));
      }
      this.staffView.sync(this.store.getState());
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

    if (hitTest([HQ_SLOT], p.x, p.y)) return this.emitSelection(MAP_EVENTS.buildingSelected, 'hq', HQ_SLOT);
    this.emitSelection(MAP_EVENTS.buildingSelected, null, null);
  }

  /** Dessine le nouveau niveau et le révèle (local loué, ou bureau de direction rénové). */
  private reveal(level: number): void {
    const zone = getExpansionLevel(level)?.zone ?? null;
    const cover = this.mapView.render(level, zone);
    const focus = zone ? getZone(zone).rect : HQ_SLOT;
    const cam = this.cameras.main;
    const from = { x: cam.midPoint.x, y: cam.midPoint.y };
    playReveal(this, { cover, focus }, (x, y) => this.camera.centerOn(x, y), from);
  }

  private readHqLevel(): number {
    return this.store.getState().buildings.find((b) => b.id === 'hq')?.level ?? 1;
  }

  private emitSelection(event: string, id: string | null, rect: Rect | null): void {
    this.mapView.setHighlight(rect);
    this.game.events.emit(event, id);
  }
}
