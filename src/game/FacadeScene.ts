import Phaser from 'phaser';
import type { GameStore } from '../core/store';
import { facadeLayout } from '../data/facade';
import { reducedMotion } from '../settings';
import { FlatBaker, type Rect } from './bake';
import { daylightAt, localHour } from './daylight';
import { drawFacade, facadeBounds, type FacadeLook } from './facadeDraw';
import { parkingLevel, toOfficeView } from './officeView';

export const FACADE_SCENE = 'facade';
const MAP_SCENE = 'map';
/** Place laissée en haut pour la barre « ← Cabinet » et en bas pour le bord de l'écran. */
const MARGIN_TOP = 84;
const MARGIN_BOTTOM = 24;
const MAX_ZOOM = 1.6;

/**
 * Vue extérieure du cabinet (docs/GDD.md §6 quater) : un aperçu plein écran, sans rien de jouable.
 * La scène entière est figée en une image, redessinée seulement quand le cabinet ou l'heure change.
 */
export class FacadeScene extends Phaser.Scene {
  private baker!: FlatBaker;
  private sky!: Phaser.GameObjects.Graphics;
  private image: Phaser.GameObjects.Image | null = null;
  /** Échelle de l'image figée à zoom 1 (le baker double la résolution). */
  private baseScale = 1;
  private bounds: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private current: FacadeLook | null = null;
  private key = '';

  constructor(private readonly store: GameStore) {
    super(FACADE_SCENE);
  }

  create(): void {
    this.baker = new FlatBaker(this, 'facade');
    this.sky = this.add.graphics().setDepth(-1);
    this.redraw();
    const onResize = () => this.layoutScreen();
    const unsubscribe = this.store.subscribe(() => this.redraw());
    // Le ciel et les fenêtres suivent l'heure réelle, comme à l'intérieur.
    const clock = this.time.addEvent({ delay: 30_000, loop: true, callback: () => this.redraw() });
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribe();
      clock.remove();
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      this.image?.destroy();
      this.image = null;
      this.baker.release();
      this.key = '';
    });
    if (!reducedMotion()) this.cameras.main.fadeIn(250, 15, 23, 42);
  }

  private look(): FacadeLook {
    const view = toOfficeView(this.store.getState());
    const hour = localHour(new Date());
    const parking = view.rooms.find((r) => r.type === 'parking');
    const sign = view.rooms.find((r) => r.type === 'signage');
    return {
      daylight: daylightAt(hour),
      hour,
      stage: view.stage,
      parking: parking && parking.level >= 1 ? parkingLevel(view) : 0,
      sign: !!sign && sign.level >= 1,
    };
  }

  private redraw(): void {
    const look = this.look();
    const late = look.hour >= 22 || look.hour < 6;
    const key = `${look.stage}|${look.parking}|${look.sign}|${Math.round(look.daylight.darkness * 20)}|${late}`;
    if (key === this.key) return;
    this.key = key;
    const layout = facadeLayout(look.stage);
    this.bounds = facadeBounds(layout, look.sign);
    this.image?.destroy();
    this.baker.release();
    this.image = this.baker.bake(0, this.bounds, (g) => drawFacade(g, layout, look));
    this.baseScale = this.image.scaleX;
    this.current = look;
    this.layoutScreen();
  }

  /** Ciel en dégradé derrière l'immeuble, cadrage sous la barre du haut. */
  private layoutScreen(): void {
    const cam = this.cameras.main;
    const d = this.current?.daylight;
    if (d) {
      this.sky.clear();
      this.sky.fillGradientStyle(d.skyTop, d.skyTop, d.skyLow, d.skyLow, 1).fillRect(0, 0, cam.width, cam.height * 0.75);
      this.sky.fillGradientStyle(d.skyLow, d.skyLow, d.backdrop, d.backdrop, 1).fillRect(0, cam.height * 0.75, cam.width, cam.height * 0.25 + 1);
      if (d.darkness > 0.6) {
        for (let i = 0; i < 50; i++) {
          const s = Math.sin(i * 91.7) * 43758.5453;
          const t = Math.sin(i * 37.1) * 12543.123;
          this.sky.fillStyle(0xffffff, (d.darkness - 0.6) * 2 * (0.4 + (i % 5) / 8)).fillRect((s - Math.floor(s)) * cam.width, (t - Math.floor(t)) * cam.height * 0.45, 1.5, 1.5);
        }
      }
    }
    // L'image est mise à l'échelle (la caméra reste à zoom 1 pour que le ciel couvre tout l'écran).
    // Un peu plus large que l'écran sur les côtés : seuls les bords de pelouse sont coupés.
    const b = this.bounds;
    const availH = cam.height - MARGIN_TOP - MARGIN_BOTTOM;
    const zoom = Math.max(0.05, Math.min(((cam.width - 8) * 1.12) / b.width, availH / b.height, MAX_ZOOM));
    this.image?.setScale(this.baseScale * zoom).setPosition(cam.width / 2 - (b.width / 2) * zoom, MARGIN_TOP + availH / 2 - (b.height / 2) * zoom);
  }
}

/** Ouvre la Façade par-dessus le cabinet ; le cabinet est mis en veille (ni rendu ni mise à jour). */
export function openFacade(game: Phaser.Game): void {
  game.scene.sleep(MAP_SCENE);
  game.scene.run(FACADE_SCENE);
}

export function closeFacade(game: Phaser.Game): void {
  game.scene.stop(FACADE_SCENE);
  game.scene.wake(MAP_SCENE);
}
