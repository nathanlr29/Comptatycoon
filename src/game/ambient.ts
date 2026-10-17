/**
 * Petite vie du cabinet : voyants des serveurs qui clignotent, vapeur du café, ronds dans l'eau de la fontaine,
 * horloge murale à l'heure réelle. Sans animation si les animations sont réduites (Paramètres ou appareil ; l'horloge reste à l'heure).
 * Les autres décors animés (easter eggs, mode café…) s'ajoutent ici plutôt que dans un rendu parallèle.
 */
import Phaser from 'phaser';
import type { Furniture } from '../data/office';
import { onSettingsChange, reducedMotion } from '../settings';
import { clockHands } from './daylight';
import { depthOf, isoToScreen, type ScreenPoint } from './iso';
import { COLORS } from './palette';

type G = Phaser.GameObjects.Graphics;

/** Horloge sur le mur nord, entre deux fenêtres de l'open space. */
const CLOCK = { s: 5.5, z: 54, r: 0.3, rz: 11 } as const;

export class AmbientLayer {
  private objects: Phaser.GameObjects.GameObject[] = [];
  private readonly clock: G;
  private furniture: readonly Furniture[] = [];
  private still = reducedMotion();

  constructor(private readonly scene: Phaser.Scene) {
    this.clock = scene.add.graphics().setDepth(-0.9);
    // Les animations s'arrêtent ou reprennent dès que le réglage change.
    const off = onSettingsChange(() => {
      if (reducedMotion() !== this.still) this.render(this.furniture);
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  /** Recrée la vie ambiante pour le mobilier affiché. */
  render(furniture: readonly Furniture[]): void {
    this.furniture = furniture;
    this.still = reducedMotion();
    for (const o of this.objects) {
      this.scene.tweens.killTweensOf(o);
      o.destroy();
    }
    this.objects = [];
    for (const f of furniture) {
      if (f.type === 'rack') this.serverLeds(f);
      else if (f.type === 'coffee') this.steam(f);
      else if (f.type === 'kitchen') this.steam(f, 0.5, 0.32);
      else if (f.type === 'fountain') this.ripples(f);
    }
    this.tickClock(new Date());
  }

  /** Aiguilles de l'horloge murale (à appeler régulièrement). */
  tickClock(now: Date): void {
    const g = this.clock.clear();
    const at = (u: number, v: number): ScreenPoint => isoToScreen(CLOCK.s + u * CLOCK.r, 0, CLOCK.z + v * CLOCK.rz);
    const ring = (k: number) => Array.from({ length: 20 }, (_, i) => at(Math.cos((i / 20) * Math.PI * 2) * k, Math.sin((i / 20) * Math.PI * 2) * k));
    g.fillStyle(COLORS.woodDark, 1).fillPoints(ring(1.15), true);
    g.fillStyle(COLORS.white, 1).fillPoints(ring(1), true);
    const c = at(0, 0);
    g.fillStyle(COLORS.outline, 0.6);
    for (let k = 0; k < 12; k += 3) {
      const p = at(Math.sin((k / 12) * Math.PI * 2) * 0.8, Math.cos((k / 12) * Math.PI * 2) * 0.8);
      g.fillCircle(p.x, p.y, 1);
    }
    const hands = clockHands(now);
    const hand = (angle: number, len: number, width: number) => {
      const p = at(Math.sin(angle) * len, Math.cos(angle) * len);
      g.lineStyle(width, COLORS.outline, 1).lineBetween(c.x, c.y, p.x, p.y);
    };
    hand(hands.hour, 0.5, 2);
    hand(hands.minute, 0.8, 1.2);
    g.fillStyle(0xdc2626, 1).fillCircle(c.x, c.y, 1.3);
  }

  private add<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.objects.push(o);
    return o;
  }

  /** Voyants verts et orange qui clignotent sur la face de chaque baie. */
  private serverLeds(f: Furniture): void {
    const depth = depthOf(f.x + 0.7, f.y + 0.6) + 0.05;
    for (let k = 0; k < 4; k++) {
      const p = isoToScreen(f.x + 0.7, f.y + 0.45, 14 + k * 14);
      const led = this.add(this.scene.add.graphics().setDepth(depth));
      led.fillStyle(k % 2 ? COLORS.led : 0xfbbf24, 1).fillCircle(p.x - 2, p.y, 1.8);
      if (!this.still) this.scene.tweens.add({ targets: led, alpha: 0.15, duration: 260 + k * 170, yoyo: true, repeat: -1, repeatDelay: 300 + k * 410, delay: k * 230 });
    }
  }

  /** Vapeur au-dessus du point (dx, dy) du meuble : tasse du café, casserole du chef. */
  private steam(f: Furniture, dx = 0.8, dy = 0.25): void {
    if (this.still) return;
    const base = isoToScreen(f.x + dx, f.y + dy, 42);
    for (let k = 0; k < 3; k++) {
      const puff = this.add(this.scene.add.graphics().setDepth(depthOf(f.x + 1.2, f.y + 0.5) + 0.05));
      puff.fillStyle(COLORS.white, 0.7).fillCircle(0, 0, 3);
      puff.setPosition(base.x, base.y).setAlpha(0);
      this.scene.tweens.add({
        targets: puff,
        y: base.y - 22,
        x: base.x + (k - 1) * 3,
        alpha: { from: 0.8, to: 0 },
        scale: { from: 0.6, to: 1.6 },
        duration: 1800,
        delay: k * 600,
        repeat: -1,
      });
    }
  }

  /** Ronds dans l'eau qui s'élargissent autour du jet. */
  private ripples(f: Furniture): void {
    const c = isoToScreen(f.x + 1, f.y + 1, 10);
    const depth = depthOf(f.x + 2, f.y + 2) + 0.05;
    for (let k = 0; k < 2; k++) {
      const ring = this.add(this.scene.add.graphics().setDepth(depth));
      ring.lineStyle(2, COLORS.waterLight, 1).strokeEllipse(0, 0, 80, 38);
      ring.setPosition(c.x, c.y).setScale(0.35).setAlpha(this.still ? 0.6 : 0);
      if (!this.still) this.scene.tweens.add({ targets: ring, scale: 1, alpha: { from: 0.9, to: 0 }, duration: 2400, delay: k * 1200, repeat: -1 });
    }
  }
}
