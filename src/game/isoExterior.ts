/**
 * Aménagements hors des pièces (docs/GDD.md §6) : parking devant l'immeuble et enseigne lumineuse
 * sur le mur du fond. Rien n'est dessiné avant l'achat ; les places viennent de src/data/office.ts.
 */
import type Phaser from 'phaser';
import { SIGN_SPAN, parkingRect, parkingStalls, type TileRect } from '../data/office';
import type { FlatBaker, Rect } from './bake';
import { DEPTH, ISO, depthOf, isoQuad, isoToScreen, type ScreenPoint } from './iso';
import type { RoomView } from './officeView';
import { box, groundShadow, poly } from './isoDraw';
import { COLORS, shade } from './palette';

type G = Phaser.GameObjects.Graphics;

const ASPHALT = 0x4b5160;
const SIDEWALK = 0xb8b2a6;
export const CAR_COLORS = [0xdc2626, 0xf8fafc, 0x1e3a8a, 0x111827, 0x9ca3af, 0x0f766e, 0xf59e0b] as const;

export function noise(a: number, b: number): number {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function line(g: G, x0: number, y0: number, x1: number, y1: number, color: number, alpha: number, width = 2): void {
  const a = isoToScreen(x0, y0, 0.5);
  const b = isoToScreen(x1, y1, 0.5);
  g.lineStyle(width, color, alpha).lineBetween(a.x, a.y, b.x, b.y);
}

/** Bitume, trottoir et marquage au sol : dessin plat, à figer en image (voir bake.ts). */
export function drawParkingGround(g: G, stage: number, level: number): void {
  const r = parkingRect(stage, level);
  box(g, r.x - 0.1, r.y - 0.4, r.w + 0.2, r.h + 0.5, -22, 22, shade(COLORS.ground, 0.92), false);
  poly(g, isoQuad(r.x, r.y - 0.4, r.w, 0.55), SIDEWALK);
  poly(g, isoQuad(r.x, r.y + 0.15, r.w, r.h - 0.15), ASPHALT);
  for (const s of parkingStalls(stage, level)) {
    line(g, s.x, s.y, s.x, s.y + s.h - 0.15, COLORS.white, 0.85);
    line(g, s.x + s.w, s.y, s.x + s.w, s.y + s.h - 0.15, COLORS.white, 0.85);
    line(g, s.x, s.y, s.x + s.w, s.y, COLORS.white, 0.5);
  }
}

/** Voiture garée dans une place, capot vers l'allée (+y), dessinée dans `g`. */
export function drawCar(g: G, s: TileRect, color: number, tint: (c: number) => number = (c) => c): void {
  const x = s.x + 0.17;
  const y = s.y + 0.22;
  const w = s.w - 0.34;
  const h = 1.45;
  groundShadow(g, x, y, w, h);
  for (const [wx, wy] of [[x + 0.02, y + 0.25], [x + w - 0.1, y + 0.25], [x + 0.02, y + h - 0.4], [x + w - 0.1, y + h - 0.4]] as const) {
    box(g, wx, wy, 0.08, 0.22, 0, 7, tint(0x111827), false);
  }
  box(g, x, y, w, h, 4, 9, tint(color));
  box(g, x + 0.08, y + 0.3, w - 0.16, 0.75, 13, 8, tint(shade(color, 0.9)));
  poly(g, isoQuad(x + 0.1, y + 0.32, w - 0.2, 0.71, 21.2), tint(0x9fc6dd));
  const front = [isoToScreen(x + 0.1, y + h, 10), isoToScreen(x + w - 0.1, y + h, 10)];
  for (const p of front) g.fillStyle(0xfef3c7, 1).fillCircle(p.x, p.y, 1.8);
}

function car(scene: Phaser.Scene, s: TileRect, color: number): G {
  const g = scene.add.graphics();
  drawCar(g, s, color);
  return g.setDepth(depthOf(s.x + s.w - 0.17, s.y + 1.67));
}

/** Borne de recharge au fond d'une place (parking niveau 2 et plus). */
function charger(scene: Phaser.Scene, s: TileRect): G {
  const g = scene.add.graphics();
  box(g, s.x + s.w - 0.24, s.y + 0.04, 0.16, 0.12, 0, 22, 0xe5e7eb);
  poly(g, isoQuad(s.x + s.w - 0.24, s.y + 0.16, 0.16, 0.001, 16), COLORS.led);
  const p = isoToScreen(s.x + s.w - 0.16, s.y + 0.16, 18);
  g.fillStyle(COLORS.led, 1).fillCircle(p.x, p.y, 1.6);
  return g.setDepth(depthOf(s.x + s.w - 0.08, s.y + 0.16));
}

/** Panneau « P » bleu à l'entrée du parking. */
function sign(scene: Phaser.Scene, r: TileRect): G {
  const x = r.x + r.w + 0.1;
  const y = r.y + 0.1;
  const g = scene.add.graphics();
  box(g, x, y, 0.06, 0.06, 0, 40, COLORS.metal, false);
  const q = (a: number, b: number, z0: number, z1: number): ScreenPoint[] => [isoToScreen(x + a, y + 0.08, z0), isoToScreen(x + b, y + 0.08, z0), isoToScreen(x + b, y + 0.08, z1), isoToScreen(x + a, y + 0.08, z1)];
  poly(g, q(-0.22, 0.28, 38, 58), 0x1d4ed8);
  poly(g, q(-0.08, -0.02, 42, 54), COLORS.white);
  poly(g, q(-0.02, 0.12, 52, 54), COLORS.white);
  poly(g, q(-0.02, 0.12, 47, 49), COLORS.white);
  poly(g, q(0.1, 0.14, 47, 54), COLORS.white);
  return g.setDepth(depthOf(x + 0.3, y + 0.1));
}

/** Voitures, bornes et panneau : les places sont occupées aux trois quarts, toujours les mêmes. */
export function drawParkingProps(scene: Phaser.Scene, stage: number, level: number): G[] {
  const stalls = parkingStalls(stage, level);
  const out: G[] = [];
  stalls.forEach((s, i) => {
    if (level >= 2 && i % 4 === 1) out.push(charger(scene, s));
    if (noise(i, level) < 0.75) out.push(car(scene, s, CAR_COLORS[Math.floor(noise(level, i) * CAR_COLORS.length)] as number));
  });
  out.push(sign(scene, parkingRect(stage, level)));
  return out;
}

/** Police 3 × 5 des lettres de l'enseigne. */
export const GLYPHS: Record<string, string[]> = {
  C: ['###', '#..', '#..', '#..', '###'],
  O: ['###', '#.#', '#.#', '#.#', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'],
  P: ['###', '#.#', '###', '#..', '#..'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
};

function wallQuad(x0: number, x1: number, z0: number, z1: number): ScreenPoint[] {
  return [isoToScreen(x0, 0.02, z0), isoToScreen(x1, 0.02, z0), isoToScreen(x1, 0.02, z1), isoToScreen(x0, 0.02, z1)];
}

/** Enseigne « COMPTA » en lettres lumineuses sur le mur du fond. */
export function drawSignage(g: G): void {
  const { x0, x1, z0, z1 } = SIGN_SPAN;
  poly(g, wallQuad(x0 - 0.08, x1 + 0.08, z0 - 2, z1 + 1), 0x1f2937);
  poly(g, wallQuad(x0 - 0.04, x1 + 0.04, z0 - 1, z1 + 0.5), 0x0b1220);
  const text = 'COMPTA';
  const cols = text.length * 4 - 1;
  const cw = (x1 - x0 - 0.3) / cols;
  const rh = (z1 - z0 - 4) / 5;
  [...text].forEach((ch, k) => {
    (GLYPHS[ch] ?? []).forEach((rowBits, r) => {
      [...rowBits].forEach((bit, c) => {
        if (bit !== '#') return;
        const sx = x0 + 0.15 + (k * 4 + c) * cw;
        const zt = z1 - 2 - r * rh;
        poly(g, wallQuad(sx - 0.015, sx + cw + 0.015, zt - rh - 0.6, zt + 0.6), COLORS.gold, 0.35);
        poly(g, wallQuad(sx, sx + cw, zt - rh, zt), 0xfde68a);
      });
    });
  });
  poly(g, wallQuad(x0 - 0.08, x1 + 0.08, z0 - 2, z0 - 1), COLORS.accent, 0.9);
}

/** Enseigne en cours de pose : panneau bâché à rayures jaunes et noires. */
export function drawSignageWorks(g: G): void {
  const { x0, x1, z0, z1 } = SIGN_SPAN;
  poly(g, wallQuad(x0, x1, z0, z1), 0x7c8796);
  for (let s = x0; s < x1 - 0.2; s += 0.5) poly(g, wallQuad(s, s + 0.25, z0, z0 + 4), 0xfacc15);
}

/**
 * Parking (bitume figé en image, voitures triées en profondeur) ou enseigne. Pendant les travaux :
 * rubalise ou bâche, et un calque vide pour la barre de progression (`bar`, dessinée par OfficeRenderer).
 */
export function drawExterior(scene: Phaser.Scene, baker: FlatBaker, view: RoomView, stage: number, done: boolean): { objects: Array<G | Phaser.GameObjects.Image>; bar: G | null } {
  const objects: Array<G | Phaser.GameObjects.Image> = [];
  if (view.type === 'signage') {
    const g = scene.add.graphics().setDepth(DEPTH.backWalls + 0.2);
    (done ? drawSignage : drawSignageWorks)(g);
    objects.push(g);
  } else {
    const level = Math.max(1, view.level);
    const { x, y, w, h } = parkingRect(stage, level);
    const b: Rect = { x: isoToScreen(x, y + h).x - 8, y: isoToScreen(x, y, 22).y - 8, width: (w + h) * (ISO.tileW / 2) + 16, height: (w + h) * (ISO.tileH / 2) + 60 };
    objects.push(baker.bake(DEPTH.floor + 0.1, b, (g) => drawParkingGround(g, stage, level)));
    if (view.level > 0) objects.push(...drawParkingProps(scene, stage, view.level));
    if (!done) {
      const tape = scene.add.graphics().setDepth(depthOf(x + w, y + h));
      tape.lineStyle(4, 0xfacc15, 1).strokePoints(isoQuad(x + 0.15, y + 0.15, w - 0.3, h - 0.3, 2), true);
      objects.push(tape);
    }
  }
  const bar = done ? null : scene.add.graphics().setDepth(DEPTH.overlay - 1);
  if (bar) objects.push(bar);
  return { objects, bar };
}
