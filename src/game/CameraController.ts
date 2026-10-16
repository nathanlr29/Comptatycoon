import Phaser from 'phaser';
import { applyFriction, clampScrollIn, clampZoom, fitZoom, scrollForZoomAt, scrollToCenter, ZOOM } from './geometry';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Caméra de la carte : déplacement, zoom, inertie, limites. Coordonnées écran en px CSS. */
export class CameraController {
  private vx = 0;
  private vy = 0;
  private minZoom: number = ZOOM.min;

  constructor(
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
    private bounds: Bounds,
  ) {
    this.updateMinZoom();
    camera.setZoom(clampZoom(ZOOM.initial, this.minZoom));
  }

  /** Change la zone visitable (le cabinet s'agrandit). */
  setBounds(bounds: Bounds): void {
    this.bounds = bounds;
    this.updateMinZoom();
    this.camera.setZoom(clampZoom(this.camera.zoom, this.minZoom));
    this.setScroll(this.camera.scrollX, this.camera.scrollY);
  }

  /** Cadre toute la zone visitable, sans dépasser `maxZoom`. */
  fit(maxZoom: number): void {
    const b = this.bounds;
    this.camera.setZoom(clampZoom(Math.min(maxZoom, fitZoom(this.camera.width, this.camera.height, b.width, b.height)), this.minZoom));
    this.centerOn(b.x + b.width / 2, b.y + b.height / 2);
  }

  get zoom(): number {
    return this.camera.zoom;
  }

  /** Déplace la vue de (dx, dy) px écran, dans le sens du doigt. */
  panBy(dx: number, dy: number): void {
    const cam = this.camera;
    this.setScroll(cam.scrollX - dx / cam.zoom, cam.scrollY - dy / cam.zoom);
  }

  /** Multiplie le zoom par `factor` en gardant fixe le point écran (sx, sy). */
  zoomAt(factor: number, sx: number, sy: number): void {
    const cam = this.camera;
    const zoom = clampZoom(cam.zoom * factor, this.minZoom);
    if (zoom === cam.zoom) return;
    const next = scrollForZoomAt(this.view(), zoom, sx, sy);
    cam.setZoom(zoom);
    this.setScroll(next.scrollX, next.scrollY);
  }

  /** Lance l'inertie avec une vitesse en px écran par ms. */
  fling(vx: number, vy: number): void {
    this.vx = vx;
    this.vy = vy;
  }

  stop(): void {
    this.vx = 0;
    this.vy = 0;
  }

  centerOn(x: number, y: number): void {
    this.stop();
    const s = scrollToCenter(this.camera, x, y);
    this.setScroll(s.scrollX, s.scrollY);
  }

  /** Après un redimensionnement ou une rotation d'écran. */
  resize(width: number, height: number): void {
    this.camera.setSize(width, height);
    this.updateMinZoom();
    this.camera.setZoom(clampZoom(this.camera.zoom, this.minZoom));
    this.setScroll(this.camera.scrollX, this.camera.scrollY);
  }

  update(dtMs: number): void {
    if (this.vx === 0 && this.vy === 0) return;
    this.panBy(this.vx * dtMs, this.vy * dtMs);
    this.vx = applyFriction(this.vx, dtMs);
    this.vy = applyFriction(this.vy, dtMs);
  }

  view() {
    const { scrollX, scrollY, width, height, zoom } = this.camera;
    return { scrollX, scrollY, width, height, zoom };
  }

  private updateMinZoom(): void {
    // On peut dézoomer jusqu'à voir tout le cabinet (avec du fond autour), jamais en dessous de ZOOM.min.
    const b = this.bounds;
    this.minZoom = Math.min(1, Math.max(ZOOM.min, fitZoom(this.camera.width, this.camera.height, b.width, b.height)));
  }

  private setScroll(x: number, y: number): void {
    const cam = this.camera;
    cam.setScroll(
      clampScrollIn(x, cam.width, cam.zoom, this.bounds.x, this.bounds.width),
      clampScrollIn(y, cam.height, cam.zoom, this.bounds.y, this.bounds.height),
    );
  }
}
