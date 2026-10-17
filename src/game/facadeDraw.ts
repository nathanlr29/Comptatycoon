/**
 * Dessin de la Façade (docs/GDD.md §6 quater) : l'immeuble vu du dehors, figé en une image par FacadeScene.
 * Même projection et mêmes primitives que l'intérieur ; l'ambiance vient de daylight.ts (fenêtres allumées le soir).
 */
import type Phaser from 'phaser';
import { FACADE_FLOOR_H, FACADE_PARAPET, facadeStalls, type FacadeBuilding, type FacadeLayout } from '../data/facade';
import type { Rect } from './bake';
import { mixColor, type Daylight } from './daylight';
import { isoQuad, isoToScreen, type ScreenPoint } from './iso';
import { box, poly } from './isoDraw';
import { CAR_COLORS, GLYPHS, drawCar, noise } from './isoExterior';
import { COLORS, shade } from './palette';

type G = Phaser.GameObjects.Graphics;

export interface FacadeLook {
  daylight: Daylight;
  /** Heure locale : tard le soir, moins de bureaux restent allumés. */
  hour: number;
  stage: number;
  /** Niveau du parking acheté (0 = aucun). */
  parking: number;
  sign: boolean;
}

const NIGHT_TINT = 0x141c36;
const WALLS: Record<FacadeBuilding['kind'], number> = { main: 0xefe6d8, annex: 0xdfe6ec, campus: 0xe8dcc6 };

const faceY = (y: number, xa: number, xb: number, za: number, zb: number): ScreenPoint[] => [isoToScreen(xa, y, za), isoToScreen(xb, y, za), isoToScreen(xb, y, zb), isoToScreen(xa, y, zb)];
const faceX = (x: number, ya: number, yb: number, za: number, zb: number): ScreenPoint[] => [isoToScreen(x, ya, za), isoToScreen(x, yb, za), isoToScreen(x, yb, zb), isoToScreen(x, ya, zb)];

/** Pinceau du dessin : assombrit et bleuit les couleurs à la tombée de la nuit. */
class Painter {
  readonly dark: number;
  readonly lightsOn: boolean;

  constructor(
    readonly g: G,
    readonly look: FacadeLook,
  ) {
    this.dark = look.daylight.darkness;
    this.lightsOn = this.dark > 0.3;
  }

  tint = (c: number): number => mixColor(shade(c, 1 - 0.35 * this.dark), NIGHT_TINT, 0.5 * this.dark);

  glass(f = 1): number {
    return shade(mixColor(this.look.daylight.skyLow, COLORS.window, 0.45), f);
  }

  window(pts: ScreenPoint[], seed: number, f: number): void {
    const { g } = this;
    if (!this.lightsOn) {
      poly(g, pts, this.glass(f));
      const [a, b, c, d] = pts as [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];
      const at = (p: ScreenPoint, q: ScreenPoint, t: number) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
      poly(g, [a, at(a, b, 0.35), at(d, c, 0.6), d], COLORS.white, 0.16);
      return;
    }
    const late = this.look.hour >= 22 || this.look.hour < 6;
    if (noise(seed, this.look.stage * 3.1) < (late ? 0.3 : 0.72)) {
      poly(g, pts.map((p, i) => ({ x: p.x + [-3, 3, 3, -3][i]!, y: p.y + [3, 3, -3, -3][i]! })), COLORS.lamp, 0.22 * this.dark);
      poly(g, pts, COLORS.litWindow);
    } else poly(g, pts, mixColor(0x1b2540, this.look.daylight.skyLow, 0.15));
  }
}

function drawSign(p: Painter, y: number, x0: number, x1: number, z0: number, z1: number): void {
  const { g } = p;
  poly(g, faceY(y, x0 - 0.08, x1 + 0.08, z0 - 2, z1 + 1), p.tint(0x1f2937));
  poly(g, faceY(y, x0 - 0.04, x1 + 0.04, z0 - 1, z1 + 0.5), 0x0b1220);
  const cw = (x1 - x0 - 0.3) / 23;
  const rh = (z1 - z0 - 4) / 5;
  [...'COMPTA'].forEach((ch, k) =>
    (GLYPHS[ch] ?? []).forEach((bits, r) =>
      [...bits].forEach((bit, c) => {
        if (bit !== '#') return;
        const sx = x0 + 0.15 + (k * 4 + c) * cw;
        const zt = z1 - 2 - r * rh;
        poly(g, faceY(y, sx - 0.02, sx + cw + 0.02, zt - rh - 0.8, zt + 0.8), COLORS.gold, 0.2 + 0.5 * p.dark);
        poly(g, faceY(y, sx, sx + cw, zt - rh, zt), p.lightsOn ? 0xfff1b8 : 0xfde68a);
      }),
    ),
  );
  poly(g, faceY(y, x0 - 0.08, x1 + 0.08, z0 - 2, z0 - 1), COLORS.accent, 0.9);
}

function drawBuilding(p: Painter, b: FacadeBuilding): void {
  const { g, tint } = p;
  const H = b.floors * FACADE_FLOOR_H + FACADE_PARAPET;
  const wall = WALLS[b.kind];
  const front = b.y + b.h;
  const side = b.x + b.w;
  poly(g, isoQuad(b.x + 0.3, b.y + 0.3, b.w + 0.5, b.h + 0.5), COLORS.shadow, 0.18);
  poly(g, faceY(front, b.x, side, 0, H), tint(wall));
  poly(g, faceX(side, b.y, front, 0, H), tint(shade(wall, 0.86)));
  poly(g, isoQuad(b.x, b.y, b.w, b.h, H), tint(COLORS.wallCap));
  poly(g, faceY(front, b.x, side, 0, 5), tint(COLORS.baseboard));
  poly(g, faceX(side, b.y, front, 0, 5), tint(shade(COLORS.baseboard, 0.86)));
  for (let k = 1; k < b.floors; k++) {
    poly(g, faceY(front, b.x, side, k * FACADE_FLOOR_H - 1, k * FACADE_FLOOR_H + 2), tint(0xcfc2ae), 0.9);
    poly(g, faceX(side, b.y, front, k * FACADE_FLOOR_H - 1, k * FACADE_FLOOR_H + 2), tint(0xb9ad9a), 0.9);
  }
  if (b.kind === 'campus') {
    // Pavillon vitré tout autour, toit végétalisé.
    for (let i = 0; i < Math.floor(b.w); i++) p.window(faceY(front, b.x + i + 0.08, b.x + i + 0.92, 6, 36), 900 + i, 1);
    for (let j = 0; j < Math.floor(b.h); j++) p.window(faceX(side, b.y + j + 0.08, b.y + j + 0.92, 6, 36), 950 + j, 0.86);
    poly(g, isoQuad(b.x + 0.2, b.y + 0.2, b.w - 0.4, b.h - 0.4, H), tint(0x7fae5a));
    return;
  }
  const door = b.door - b.x;
  for (let k = 0; k < b.floors; k++) {
    const za = k * FACADE_FLOOR_H + (k === 0 ? 6 : 10);
    const zb = k * FACADE_FLOOR_H + (k === 0 ? 30 : 34);
    const shop = k === 0 && b.kind === 'main';
    for (let i = 0; i < Math.floor(b.w); i++) {
      if (k === 0 && i === door) continue;
      p.window(faceY(front, b.x + i + (shop ? 0.1 : 0.22), b.x + i + (shop ? 0.9 : 0.78), za, zb), b.x * 7 + i * 13 + k * 101, 1);
    }
    for (let j = 0; j < Math.floor(b.h); j++) p.window(faceX(side, b.y + j + 0.22, b.y + j + 0.78, za, zb), b.x * 5 + j * 17 + k * 211 + 7, 0.86);
  }
  if (door >= 0) {
    const dx = b.door;
    const glass = p.lightsOn ? 0xffe4a3 : p.glass();
    poly(g, faceY(front, dx + 0.12, dx + 0.88, 0, 32), tint(COLORS.outline));
    poly(g, faceY(front, dx + 0.18, dx + 0.49, 0, 29), glass);
    poly(g, faceY(front, dx + 0.51, dx + 0.82, 0, 29), glass);
    box(g, dx - 0.05, front, 1.1, 0.45, 34, 4, tint(COLORS.accent), false);
  }
  poly(g, isoQuad(b.x + 0.18, b.y + 0.18, b.w - 0.36, b.h - 0.36, H), tint(0x6f6457));
  if (b.floors >= 3) for (const ax of [1, 2.6]) box(g, b.x + ax, b.y + 0.8, 1.2, 0.9, H, 12, tint(0xcbd5e1), false);
  if (b.kind === 'main' && p.look.sign) {
    // Au rez-de-chaussée : bandeau au-dessus de la vitrine ; ensuite, enseigne posée sur le toit.
    const x0 = b.x + 0.5;
    const x1 = b.x + Math.min(b.w - 0.5, b.floors >= 4 ? 6.5 : 4.6);
    if (b.floors === 1) drawSign(p, front + 0.02, x0, x1, 33, 44);
    else {
      const y = front - 0.5;
      for (const px of [x0 + 0.4, x1 - 0.5]) box(g, px, y - 0.05, 0.1, 0.1, H, 8, tint(0x64748b), false);
      drawSign(p, y, x0, x1, H + 8, H + 8 + (b.floors >= 4 ? 26 : 18));
    }
  }
}

function drawBridge(p: Painter, r: { x: number; y: number; w: number; h: number }): void {
  const z = FACADE_FLOOR_H;
  poly(p.g, faceY(r.y + r.h, r.x, r.x + r.w, z, z + 33), p.lightsOn ? COLORS.litWindow : p.glass());
  poly(p.g, isoQuad(r.x, r.y, r.w, r.h, z + 33), p.tint(COLORS.wallCap));
  poly(p.g, faceY(r.y + r.h, r.x, r.x + r.w, z, z + 3), p.tint(0x7b8794));
}

function drawParking(p: Painter, layout: FacadeLayout): void {
  const { g, tint } = p;
  const r = layout.parking;
  poly(g, isoQuad(r.x, r.y, r.w, r.h), tint(0x4b5160));
  const stalls = facadeStalls(r);
  for (const s of [...stalls, { ...r, x: r.x + r.w }]) {
    const a = isoToScreen(s.x, r.y + 0.1);
    const b = isoToScreen(s.x, r.y + 1.9);
    g.lineStyle(1.5, COLORS.white, 0.75).lineBetween(a.x, a.y, b.x, b.y);
  }
  stalls.forEach((s, i) => {
    if (noise(i, p.look.stage) < 0.75) drawCar(g, { ...s, y: s.y + 0.08 }, CAR_COLORS[Math.floor(noise(p.look.stage, i) * CAR_COLORS.length)] as number, tint);
  });
}

function drawTree(p: Painter, x: number, y: number, k: number): void {
  const { g, tint } = p;
  poly(g, isoQuad(x - 0.25, y - 0.1, 0.9, 0.6), COLORS.shadow, 0.18);
  box(g, x - 0.06, y - 0.06, 0.12, 0.12, 0, 16, tint(COLORS.woodDark), false);
  const c = isoToScreen(x, y, 30);
  const r = 15 + (k % 3) * 2;
  g.fillStyle(tint(COLORS.plant), 1).fillCircle(c.x, c.y, r);
  g.fillStyle(tint(COLORS.plantLight), 1).fillCircle(c.x - r * 0.3, c.y - r * 0.3, r * 0.6);
}

function drawLamp(p: Painter, x: number, y: number): void {
  const { g } = p;
  if (p.lightsOn) {
    const c = isoToScreen(x, y);
    for (const [rx, a] of [[60, 0.12], [38, 0.16], [20, 0.2]] as const) g.fillStyle(COLORS.lamp, a * p.dark).fillEllipse(c.x, c.y, rx * 2, rx);
  }
  box(g, x - 0.04, y - 0.04, 0.08, 0.08, 0, 46, p.tint(0x475569), false);
  const head = isoToScreen(x, y, 48);
  g.fillStyle(p.lightsOn ? 0xffe6a8 : p.tint(0xe2e8f0), 1).fillCircle(head.x, head.y, 3.5);
}

/** Toute la scène : socle, rue, parking, puis bâtiments, arbres et lampadaires triés en profondeur. */
export function drawFacade(g: G, layout: FacadeLayout, look: FacadeLook): void {
  const p = new Painter(g, look);
  const { plate, buildings } = layout;
  const main = buildings[0] as FacadeBuilding;
  box(g, plate.x, plate.y, plate.w, plate.h, -16, 16, p.tint(0x6f8f55), false);
  poly(g, isoQuad(plate.x, main.h + 0.1, plate.w, 1.2), p.tint(0xb8b2a6));
  poly(g, isoQuad(-0.6, -0.6, main.w + 1.2, main.h + 0.7), p.tint(0xc9c2b4));
  for (const b of buildings.slice(1)) poly(g, isoQuad(b.x - 0.6, b.y - 0.5, b.w + 1.2, b.h + 1.1), p.tint(0xc9c2b4));
  poly(g, isoQuad(plate.x, plate.y + plate.h - 1.4, plate.w, 1.4), p.tint(0x3a3f4b));
  for (let x = plate.x + 0.5; x < plate.x + plate.w - 1; x += 2) poly(g, isoQuad(x, plate.y + plate.h - 0.75, 1, 0.1), 0xe2e8f0, 0.6);
  if (look.parking > 0) drawParking(p, layout);

  const items: Array<{ d: number; draw: () => void }> = buildings.map((b) => ({ d: b.x + b.w + b.y + b.h, draw: () => drawBuilding(p, b) }));
  const bridge = layout.bridge;
  if (bridge) items.push({ d: bridge.x + bridge.w + bridge.y + bridge.h - 0.01, draw: () => drawBridge(p, bridge) });
  layout.trees.forEach(([x, y], k) => items.push({ d: x + y + 0.3, draw: () => drawTree(p, x, y, k) }));
  for (const [x, y] of layout.lamps) items.push({ d: x + y, draw: () => drawLamp(p, x, y) });
  items.sort((a, b) => a.d - b.d).forEach((it) => it.draw());
}

/** Rectangle du monde à cadrer : socle et toits (enseigne comprise). */
export function facadeBounds(layout: FacadeLayout, sign: boolean): Rect {
  const { plate } = layout;
  const pts: ScreenPoint[] = [];
  for (const [x, y] of [[plate.x, plate.y], [plate.x + plate.w, plate.y], [plate.x + plate.w, plate.y + plate.h], [plate.x, plate.y + plate.h]] as const) pts.push(isoToScreen(x, y), isoToScreen(x, y, -16));
  for (const b of layout.buildings) pts.push(isoToScreen(b.x, b.y, b.floors * FACADE_FLOOR_H + FACADE_PARAPET + (b.kind === 'main' && sign ? 40 : 14)));
  const xs = pts.map((q) => q.x);
  const ys = pts.map((q) => q.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
