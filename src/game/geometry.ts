/** Fonctions pures de la carte : gestes, zoom, sélection. Testées sans Phaser. */
import type { Rect } from '../data/map';

export const GESTURE = {
  /** Au-delà de ce déplacement (px écran), le geste est un glissement. */
  tapMaxDistance: 8,
  /** Au-delà de cette durée (ms), le geste n'est plus un tap. */
  tapMaxDuration: 250,
} as const;

export const ZOOM = { min: 0.5, max: 2, initial: 0.65 } as const;

export interface GestureSample {
  /** Distance maximale parcourue depuis le point de départ, en px écran. */
  maxDistance: number;
  durationMs: number;
  /** Un second doigt a touché l'écran pendant le geste. */
  multiTouch: boolean;
}

/** Un tap sélectionne ; un glissement ou un pincement ne sélectionne jamais. */
export function isTap(g: GestureSample): boolean {
  return !g.multiTouch && g.maxDistance <= GESTURE.tapMaxDistance && g.durationMs <= GESTURE.tapMaxDuration;
}

/**
 * Zoom minimal : jamais sous ZOOM.min, et assez grand pour que le monde
 * couvre toujours l'écran (pas de bande vide sur tablette ou en paysage).
 */
export function minZoomFor(viewW: number, viewH: number, worldW: number, worldH: number): number {
  return Math.min(ZOOM.max, Math.max(ZOOM.min, viewW / worldW, viewH / worldH));
}

export function clampZoom(zoom: number, minZoom: number): number {
  return Math.min(ZOOM.max, Math.max(minZoom, zoom));
}

/** Facteur de zoom pour une rotation de molette (deltaY > 0 = dézoomer). */
export function wheelZoomFactor(deltaY: number): number {
  return Math.pow(1.0015, -deltaY);
}

export function contains(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** Premier élément dont le rectangle contient le point (ordre = priorité). */
export function hitTest<T extends Rect>(items: readonly T[], x: number, y: number): T | undefined {
  return items.find((item) => contains(item, x, y));
}

/** Vitesse après frottement : décroissance exponentielle indépendante des FPS. */
export function applyFriction(velocity: number, dtMs: number, halfLifeMs = 120): number {
  const v = velocity * Math.pow(0.5, dtMs / halfLifeMs);
  return Math.abs(v) < 0.01 ? 0 : v;
}

/**
 * Caméra Phaser : elle zoome autour de son centre. Le point du monde sous le
 * point écran (sx, sy) vaut scroll + taille/2 + (s − taille/2) / zoom.
 */
export interface CameraView {
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
  zoom: number;
}

export function screenToWorld(v: CameraView, sx: number, sy: number): { x: number; y: number } {
  return {
    x: v.scrollX + v.width / 2 + (sx - v.width / 2) / v.zoom,
    y: v.scrollY + v.height / 2 + (sy - v.height / 2) / v.zoom,
  };
}

/** Scroll qui garde le même point du monde sous (sx, sy) après passage à `zoom`. */
export function scrollForZoomAt(v: CameraView, zoom: number, sx: number, sy: number): { scrollX: number; scrollY: number } {
  const p = screenToWorld(v, sx, sy);
  return {
    scrollX: p.x - v.width / 2 - (sx - v.width / 2) / zoom,
    scrollY: p.y - v.height / 2 - (sy - v.height / 2) / zoom,
  };
}

/** Garde la vue dans le monde ; si la vue est plus grande que le monde, elle est centrée. */
export function clampScrollAxis(scroll: number, viewSize: number, zoom: number, worldSize: number): number {
  const visible = viewSize / zoom;
  const offset = viewSize / 2 - visible / 2; // scroll → bord gauche visible
  if (visible >= worldSize) return worldSize / 2 - viewSize / 2;
  const min = -offset;
  const max = worldSize - visible - offset;
  return Math.min(max, Math.max(min, scroll));
}

/** Scroll qui centre la vue sur le point (x, y) du monde. */
export function scrollToCenter(v: Pick<CameraView, 'width' | 'height'>, x: number, y: number): { scrollX: number; scrollY: number } {
  return { scrollX: x - v.width / 2, scrollY: y - v.height / 2 };
}
