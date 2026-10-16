import Phaser from 'phaser';
import { getCoffeeBreakEnd } from '../core/coffee';
import type { GameStore } from '../core/store';
import { getStage } from '../data/office';
import { CameraController } from './CameraController';
import { coffeeSpots, type CoffeeSpot } from './characters/coffeeSpots';
import { officeSeats } from './characters/officeSeats';
import { StaffLayer } from './characters/StaffLayer';
import { playReveal } from './expansionView';
import { screenToWorld } from './geometry';
import { InputController } from './InputController';
import { isoQuad, isoToScreen } from './iso';
import { OfficeRenderer } from './OfficeRenderer';
import { builtRoomTypes, officeViewKey, toOfficeView, worksProgress, type OfficeView } from './officeView';

/** Ce que l'interface peut écouter sur `game.events`. */
export const MAP_EVENTS = {
  /** id du bâtiment (pièce) sélectionné, ou null pour désélection. */
  buildingSelected: 'building:selected',
  /** À émettre par l'interface pour recentrer la caméra. */
  recenter: 'camera:recenter',
  /** À émettre par l'interface quand le panneau de sélection se ferme. */
  clearSelection: 'selection:clear',
} as const;

/** Zoom maximal quand on cadre tout le cabinet (le petit bureau ne doit pas paraître énorme). */
const FIT_MAX_ZOOM = 1.25;

/** Scène du cabinet en fausse 3D (docs/GDD.md §6) : plan, mobilier et employés. */
export class MapScene extends Phaser.Scene {
  private camera!: CameraController;
  private office!: OfficeRenderer;
  private staff!: StaffLayer;
  private view: OfficeView | null = null;
  private viewKey = '';
  private spots: CoffeeSpot[] = [];

  constructor(private readonly store: GameStore) {
    super('map');
  }

  create(): void {
    this.office = new OfficeRenderer(this);
    this.staff = new StaffLayer(this);
    this.camera = new CameraController(this.cameras.main, this.office.bounds());
    this.refresh();
    this.camera.fit(FIT_MAX_ZOOM);
    new InputController(this, this.camera, (sx, sy) => this.select(sx, sy));

    const onResize = (size: Phaser.Structs.Size) => this.camera.resize(size.width, size.height);
    const onRecenter = () => this.camera.fit(FIT_MAX_ZOOM);
    const onClear = () => this.office.setHighlight(null);
    const unsubscribe = this.store.subscribe(() => this.refresh());
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

  /** Redessine le plan seulement si le niveau ou les pièces changent ; les effectifs suivent à chaque état. */
  private refresh(): void {
    const state = this.store.getState();
    const view = toOfficeView(state);
    const key = officeViewKey(view);
    if (key !== this.viewKey) {
      const grew = this.view !== null && view.stage > this.view.stage;
      this.viewKey = key;
      this.view = view;
      this.office.render(view);
      this.staff.setSeats(officeSeats(view.stage, builtRoomTypes(view)));
      const stage = getStage(view.stage);
      const door = isoToScreen(stage.entranceX, stage.size.h + 0.8);
      this.staff.setEntrance(door.x, door.y);
      this.spots = coffeeSpots(view.stage);
      this.camera.setBounds(this.office.bounds());
      if (grew) this.reveal(view.stage);
    }
    this.office.updateWorks(worksProgress(state, Date.now()));
    this.staff.sync(state);
    this.staff.setCoffeeBreak(getCoffeeBreakEnd(state, Date.now()) !== null, this.spots);
  }

  /** Nouveau niveau : la caméra recadre le cabinet agrandi et son contour pulse. */
  private reveal(stage: number): void {
    const cam = this.cameras.main;
    const from = { x: cam.midPoint.x, y: cam.midPoint.y };
    this.camera.fit(FIT_MAX_ZOOM);
    const { w, h } = getStage(stage).size;
    playReveal(this, { focus: this.office.center(), outline: isoQuad(0, 0, w, h) }, (x, y) => this.camera.centerOn(x, y), from);
  }

  private select(sx: number, sy: number): void {
    const p = screenToWorld(this.camera.view(), sx, sy);
    const type = this.office.roomAt(p.x, p.y);
    const id = type ? (this.store.getState().buildings.find((b) => b.type === type)?.id ?? null) : null;
    this.office.setHighlight(id ? type : null);
    this.game.events.emit(MAP_EVENTS.buildingSelected, id);
  }
}
