import Phaser from 'phaser';
import type { CameraController } from './CameraController';
import { GESTURE, isTap, pinchZoomFactor, wheelZoomFactor } from './geometry';

interface Gesture {
  startX: number;
  startY: number;
  startedAt: number;
  maxDistance: number;
  multiTouch: boolean;
}

/**
 * Traduit les pointeurs (souris, doigts) en gestes de carte :
 * glisser, pincer, molette, tap. Seul un tap déclenche `onTap`.
 */
export class InputController {
  private readonly points = new Map<number, { x: number; y: number }>();
  private gesture: Gesture | null = null;
  private vx = 0;
  private vy = 0;
  private lastMoveAt = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly camera: CameraController,
    private readonly onTap: (sx: number, sy: number) => void,
  ) {
    const input = scene.input;
    input.addPointer(1); // 2 doigts au total pour le pincement
    input.on(Phaser.Input.Events.POINTER_DOWN, this.down, this);
    input.on(Phaser.Input.Events.POINTER_MOVE, this.move, this);
    input.on(Phaser.Input.Events.POINTER_UP, this.up, this);
    input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.up, this);
    input.on(Phaser.Input.Events.POINTER_WHEEL, this.wheel, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => input.removeAllListeners());
  }

  private down(p: Phaser.Input.Pointer): void {
    this.points.set(p.id, { x: p.x, y: p.y });
    this.camera.stop();
    if (this.points.size === 1) {
      this.gesture = { startX: p.x, startY: p.y, startedAt: p.downTime, maxDistance: 0, multiTouch: false };
      this.vx = this.vy = 0;
    } else if (this.gesture) {
      this.gesture.multiTouch = true;
    }
  }

  private move(p: Phaser.Input.Pointer): void {
    const prev = this.points.get(p.id);
    if (!prev || !p.isDown || !this.gesture) return;

    if (this.points.size >= 2) {
      this.pinch(p, prev);
      return;
    }

    const g = this.gesture;
    g.maxDistance = Math.max(g.maxDistance, Math.hypot(p.x - g.startX, p.y - g.startY));
    this.points.set(p.id, { x: p.x, y: p.y });
    if (g.maxDistance <= GESTURE.tapMaxDistance) return;

    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    this.camera.panBy(dx, dy);

    const dt = Math.max(1, p.moveTime - this.lastMoveAt);
    this.lastMoveAt = p.moveTime;
    this.vx = 0.8 * (dx / dt) + 0.2 * this.vx;
    this.vy = 0.8 * (dy / dt) + 0.2 * this.vy;
  }

  private pinch(p: Phaser.Input.Pointer, prev: { x: number; y: number }): void {
    const other = [...this.points.entries()].find(([id]) => id !== p.id)?.[1];
    if (!other) return;
    const before = Math.hypot(prev.x - other.x, prev.y - other.y);
    const after = Math.hypot(p.x - other.x, p.y - other.y);
    const midBefore = { x: (prev.x + other.x) / 2, y: (prev.y + other.y) / 2 };
    const midAfter = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 };
    this.points.set(p.id, { x: p.x, y: p.y });

    this.camera.zoomAt(pinchZoomFactor(before, after), midAfter.x, midAfter.y);
    this.camera.panBy(midAfter.x - midBefore.x, midAfter.y - midBefore.y);
  }

  private up(p: Phaser.Input.Pointer): void {
    if (!this.points.delete(p.id)) return;
    const g = this.gesture;
    if (this.points.size > 0 || !g) return; // un doigt reste : le geste continue

    this.gesture = null;
    const sample = { maxDistance: g.maxDistance, durationMs: p.upTime - g.startedAt, multiTouch: g.multiTouch };
    if (isTap(sample)) {
      this.onTap(p.x, p.y);
    } else if (!g.multiTouch && p.upTime - this.lastMoveAt < 80) {
      this.camera.fling(this.vx, this.vy); // inertie seulement si le doigt bougeait encore
    }
  }

  private wheel(p: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number): void {
    this.camera.zoomAt(wheelZoomFactor(dy), p.x, p.y);
  }
}
