/** Primitives de dessin en fausse 3D (volumes, sols, murs). Coordonnées de grille, voir iso.ts. */
import type Phaser from 'phaser';
import { isoQuad, isoToScreen, type ScreenPoint } from './iso';
import { COLORS, shade } from './palette';

type G = Phaser.GameObjects.Graphics;

export function poly(g: G, points: readonly ScreenPoint[], color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillPoints(points as ScreenPoint[], true);
}

/**
 * Parallélépipède posé en (x, y) d'emprise w × h, du niveau z (px) sur `height` px.
 * Faces visibles : dessus, face sud (bord y + h, à gauche) et face est (bord x + w, à droite).
 */
export function box(g: G, x: number, y: number, w: number, h: number, z: number, height: number, top: number, outline = true): void {
  const t = height + z;
  const south: [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint] = [isoToScreen(x, y + h, z), isoToScreen(x + w, y + h, z), isoToScreen(x + w, y + h, t), isoToScreen(x, y + h, t)];
  const east: [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint] = [isoToScreen(x + w, y, z), isoToScreen(x + w, y + h, z), isoToScreen(x + w, y + h, t), isoToScreen(x + w, y, t)];
  poly(g, south, shade(top, 0.86));
  poly(g, east, shade(top, 0.72));
  const lid = isoQuad(x, y, w, h, t);
  poly(g, lid, top);
  if (outline) {
    g.lineStyle(1.5, COLORS.outline, 0.55);
    g.strokePoints([lid[0], lid[1], east[0], east[1], south[0], lid[3]], true);
    g.lineBetween(lid[2].x, lid[2].y, east[1].x, east[1].y);
  }
}

/** Ombre douce au sol sous un objet. */
export function groundShadow(g: G, x: number, y: number, w: number, h: number): void {
  poly(g, isoQuad(x + 0.06, y + 0.08, w, h), COLORS.shadow, 0.16);
}

/** Sol en damier sur un rectangle de cases. */
export function tiles(g: G, x: number, y: number, w: number, h: number, colors: readonly [number, number]): void {
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) poly(g, isoQuad(x + i, y + j, Math.min(1, w - i), Math.min(1, h - j)), colors[(i + j) % 2] as number);
  }
}
