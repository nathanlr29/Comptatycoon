/** Mobilier de la cantine en fausse 3D (docs/GDD.md §6 ter) : kitchenette, tables, buffet du self, cuisine du chef. */
import type Phaser from 'phaser';
import type { Furniture } from '../data/office';
import { isoQuad, isoToScreen } from './iso';
import { box, groundShadow, poly } from './isoDraw';
import { COLORS, shade } from './palette';

type G = Phaser.GameObjects.Graphics;
type Add = (draw: (g: G) => void, px?: number, py?: number, pw?: number, ph?: number) => void;

export const CANTEEN_SIZES = {
  kitchenette: [1.6, 0.5],
  canteenTable: [1.6, 0.75],
  buffet: [2.4, 0.55],
  kitchen: [2.3, 0.6],
} as const satisfies Record<string, [number, number]>;

export type CanteenFurnitureType = keyof typeof CANTEEN_SIZES;

const TRAYS = [0xef4444, 0x10b981, 0xf59e0b, 0x3b82f6] as const;

export function isCanteenFurniture(type: Furniture['type']): type is CanteenFurnitureType {
  return type in CANTEEN_SIZES;
}

/** Dessine un meuble de cantine ; `add` crée un Graphics trié par son coin avant. */
export function drawCanteenFurniture(f: Furniture & { type: CanteenFurnitureType }, add: Add): void {
  const { x, y } = f;
  const [w, h] = CANTEEN_SIZES[f.type];
  switch (f.type) {
    case 'kitchenette':
      add((g) => {
        // Plan de travail, micro-ondes, et frigo au bout
        box(g, x, y, w - 0.5, h, 0, 32, COLORS.deskTop);
        box(g, x + 0.1, y + 0.08, 0.45, 0.32, 32, 14, 0x334155, false);
        poly(g, [isoToScreen(x + 0.15, y + 0.4, 35), isoToScreen(x + 0.42, y + 0.4, 35), isoToScreen(x + 0.42, y + 0.4, 44), isoToScreen(x + 0.15, y + 0.4, 44)], COLORS.screen);
        box(g, x + w - 0.48, y, 0.46, h, 0, 62, 0xe2e8f0);
        const a = isoToScreen(x + w - 0.1, y + h, 50);
        g.fillStyle(COLORS.metal, 1).fillRect(a.x - 1, a.y - 10, 2, 12);
      });
      break;
    case 'canteenTable':
      for (const dx of [0.3, 1.0]) {
        add((g) => box(g, x + dx, y - 0.35, 0.3, 0.3, 0, 14, COLORS.chair), x + dx, y - 0.35, 0.3, 0.3);
        add((g) => box(g, x + dx, y + h + 0.05, 0.3, 0.3, 0, 14, COLORS.chair), x + dx, y + h + 0.05, 0.3, 0.3);
      }
      add((g) => {
        groundShadow(g, x, y, w, h);
        box(g, x + 0.7, y + 0.28, 0.2, 0.2, 0, 20, COLORS.metal, false);
        box(g, x, y, w, h, 20, 4, 0xf3ede2);
        // Deux plateaux et une carafe
        poly(g, isoQuad(x + 0.2, y + 0.15, 0.45, 0.32, 24.5), TRAYS[Math.round(x) % 4] as number);
        poly(g, isoQuad(x + 0.95, y + 0.3, 0.45, 0.32, 24.5), TRAYS[(Math.round(x) + 1) % 4] as number);
        box(g, x + 0.72, y + 0.1, 0.1, 0.1, 24, 10, 0xbae6fd, false);
      });
      break;
    case 'buffet':
      add((g) => {
        groundShadow(g, x, y, w, h);
        box(g, x, y, w, h, 0, 30, COLORS.metal);
        // Bacs chauds sous vitre, plateaux empilés au bout
        for (let i = 0; i < 4; i++) poly(g, isoQuad(x + 0.15 + i * 0.5, y + 0.12, 0.4, 0.3, 30.5), [0xf59e0b, 0x65a30d, 0xb45309, 0xfde68a][i] as number);
        poly(g, [isoToScreen(x, y + h, 30), isoToScreen(x + 2.05, y + h, 30), isoToScreen(x + 2.05, y + h - 0.1, 44), isoToScreen(x, y + h - 0.1, 44)], 0xdbeafe, 0.45);
        box(g, x + 2.05, y + 0.1, 0.3, 0.36, 30, 10, TRAYS[0], false);
      });
      break;
    case 'kitchen':
      add((g) => {
        groundShadow(g, x, y, w, h);
        box(g, x, y, w, h, 0, 32, 0xcbd5e1);
        // Plaques, casserole fumante et passe-plat
        for (const dx of [0.3, 0.9]) {
          const c = isoToScreen(x + dx + 0.2, y + 0.3, 32);
          g.fillStyle(0x1f2937, 1).fillEllipse(c.x, c.y, 22, 11);
        }
        box(g, x + 0.35, y + 0.2, 0.3, 0.25, 32, 10, shade(COLORS.metal, 0.8), false);
        box(g, x + 1.5, y + 0.1, 0.7, 0.4, 32, 3, COLORS.white, false);
      });
      // Le chef, toque blanche, derrière son piano
      add((g) => chef(g, x + 1.2, y + 0.35), x + 1.0, y, 0.5, 0.4);
      break;
  }
}

function chef(g: G, x: number, y: number): void {
  const p = isoToScreen(x, y, 0);
  g.fillStyle(0x334155, 1).fillRect(p.x - 6, p.y - 26, 12, 26);
  g.fillStyle(COLORS.white, 1).fillRoundedRect(p.x - 9, p.y - 50, 18, 26, 5);
  g.fillStyle(0xf1c27d, 1).fillCircle(p.x, p.y - 58, 8);
  g.fillStyle(COLORS.white, 1).fillRect(p.x - 7, p.y - 74, 14, 10).fillCircle(p.x - 5, p.y - 75, 5).fillCircle(p.x + 5, p.y - 75, 5).fillCircle(p.x, p.y - 78, 6);
  g.fillStyle(0x1f2937, 1).fillCircle(p.x - 3, p.y - 59, 1.2).fillCircle(p.x + 3, p.y - 59, 1.2);
}
