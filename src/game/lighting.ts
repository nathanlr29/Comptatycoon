/**
 * Lumière du cabinet selon l'heure réelle : ciel et ville dans les fenêtres, taches de soleil au sol,
 * pénombre bleutée le soir et lampes de bureau allumées. Redessiné seulement quand l'ambiance change.
 */
import Phaser from 'phaser';
import { deskRect, type Desk } from '../data/office';
import { mixColor, type Daylight } from './daylight';
import { DEPTH, isoToScreen, screenBounds, type ScreenPoint } from './iso';
import { poly } from './isoDraw';
import { COLORS, shade } from './palette';

type G = Phaser.GameObjects.Graphics;
type Wall = 'n' | 'w';

/** Fenêtres des murs du fond : [début, fin] le long du mur, une tous les 2,6 cases. */
export function windowSpans(length: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let a = 1; a + 1.2 <= length; a += 2.6) out.push([a, a + 1.2]);
  return out;
}

const Z0 = 30;
const Z1 = 68;

/** Point d'un mur du fond : `s` le long du mur, `z` en hauteur. */
function onWall(wall: Wall, s: number, z: number): ScreenPoint {
  return wall === 'n' ? isoToScreen(s, 0, z) : isoToScreen(0, s, z);
}

function wallQuad(wall: Wall, s0: number, s1: number, z0: number, z1: number): ScreenPoint[] {
  return [onWall(wall, s0, z0), onWall(wall, s1, z0), onWall(wall, s1, z1), onWall(wall, s0, z1)];
}

function noise(a: number, b: number): number {
  const s = Math.sin(a * 91.3 + b * 47.9) * 24634.6345;
  return s - Math.floor(s);
}

const GLOW = 'lamp-glow';

/** Halo radial chaud, généré une fois (dégradé du canvas). */
function ensureGlowTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(GLOW)) return;
  const tex = scene.textures.createCanvas(GLOW, 128, 128);
  if (!tex) return;
  const ctx = tex.getContext();
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255, 176, 90, 0.9)');
  grad.addColorStop(0.45, 'rgba(255, 160, 70, 0.35)');
  grad.addColorStop(1, 'rgba(255, 150, 60, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  tex.refresh();
}

export class LightingLayer {
  private readonly windows: G;
  private readonly patches: G;
  private readonly dim: G;
  private lamps: Phaser.GameObjects.Image[] = [];
  private size = { w: 8, h: 6 };
  private daylight: Daylight | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    this.windows = scene.add.graphics().setDepth(DEPTH.backWalls + 0.1);
    this.patches = scene.add.graphics().setDepth(DEPTH.floor + 0.3);
    this.dim = scene.add.graphics().setDepth(DEPTH.overlay - 3).setBlendMode(Phaser.BlendModes.MULTIPLY);
    ensureGlowTexture(scene);
  }

  setLayout(size: { w: number; h: number }, desks: Desk[]): void {
    this.size = size;
    for (const lamp of this.lamps) lamp.destroy();
    // Une image de halo par lampe de bureau : bien moins coûteux à afficher que des ellipses vectorielles.
    this.lamps = desks.map((desk) => {
      const r = deskRect(desk);
      const c = isoToScreen(r.x + r.w / 2, r.y + r.h / 2, 16);
      return this.scene.add.image(c.x, c.y, GLOW).setDisplaySize(112, 60).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.overlay - 2.5);
    });
    this.redraw();
  }

  setDaylight(d: Daylight): void {
    this.daylight = d;
    this.scene.cameras.main.setBackgroundColor(d.backdrop);
    this.redraw();
  }

  private redraw(): void {
    const d = this.daylight;
    if (!d) return;
    for (const g of [this.windows, this.patches, this.dim]) g.clear();
    for (const lamp of this.lamps) lamp.setVisible(d.darkness > 0.02).setAlpha(0.55 * d.darkness);
    const { w, h } = this.size;
    windowSpans(w).forEach(([a, b], i) => this.drawWindow('n', a, b, d, i));
    windowSpans(h).forEach(([a, b], i) => this.drawWindow('w', a, b, d, i + 50));
    if (d.sun > 0.02) this.drawSunPatches(d);
    if (d.darkness > 0.02) this.drawNight(d);
  }

  /** Vitre en dégradé de ciel, silhouette de la ville, étoiles la nuit, reflet le jour. */
  private drawWindow(wall: Wall, a: number, b: number, d: Daylight, seed: number): void {
    const g = this.windows;
    const tint = wall === 'w' ? 0.92 : 1;
    poly(g, wallQuad(wall, a - 0.06, b + 0.06, Z0 - 4, Z1 + 4), shade(COLORS.windowFrame, tint));
    const bands = 5;
    for (let k = 0; k < bands; k++) {
      const z0 = Z0 + ((Z1 - Z0) * k) / bands;
      const z1 = Z0 + ((Z1 - Z0) * (k + 1)) / bands;
      poly(g, wallQuad(wall, a, b, z0, z1 + 0.5), shade(mixColor(d.skyLow, d.skyTop, k / (bands - 1)), tint));
    }
    if (d.darkness > 0.3) {
      g.fillStyle(COLORS.white, Math.min(1, d.darkness) * 0.9);
      for (let k = 0; k < 3; k++) {
        const p = onWall(wall, a + 0.1 + noise(seed, k) * (b - a - 0.2), Z1 - 3 - noise(k, seed) * 12);
        g.fillCircle(p.x, p.y, 1.1);
      }
    }
    // Immeubles au loin, fenêtres allumées le soir
    const skyline = mixColor(COLORS.skyline, 0x111827, d.darkness);
    let s = a;
    let k = 0;
    while (s < b - 0.02) {
      const bw = Math.min(b - s, 0.18 + noise(seed, k) * 0.2);
      const top = Z0 + 6 + noise(k, seed + 1) * 14;
      poly(g, wallQuad(wall, s, s + bw, Z0, top), shade(skyline, tint));
      if (d.darkness > 0.3 && noise(seed + 2, k) > 0.35) {
        const p = onWall(wall, s + bw / 2, Z0 + 4 + noise(seed + 3, k) * (top - Z0 - 6));
        g.fillStyle(COLORS.litWindow, d.darkness).fillRect(p.x - 1, p.y - 1, 2, 2);
      }
      s += bw;
      k++;
    }
    poly(g, wallQuad(wall, (a + b) / 2 - 0.03, (a + b) / 2 + 0.03, Z0, Z1), shade(COLORS.windowFrame, tint));
    poly(g, wallQuad(wall, a, b, (Z0 + Z1) / 2 + 4, (Z0 + Z1) / 2 + 6), shade(COLORS.windowFrame, tint));
    if (d.sun > 0.1) {
      poly(g, [onWall(wall, a + 0.05, Z1 - 8), onWall(wall, a + (b - a) * 0.3, Z1 - 8), onWall(wall, a + (b - a) * 0.15, Z0 + 2), onWall(wall, a + 0.05, Z0 + 2)], COLORS.white, 0.22 * d.sun);
    }
  }

  /** Taches de soleil projetées au sol devant chaque fenêtre. */
  private drawSunPatches(d: Daylight): void {
    const color = mixColor(COLORS.sunset, COLORS.sunlight, d.sun);
    const alpha = 0.2 * d.sun + 0.04;
    for (const [a, b] of windowSpans(this.size.w)) {
      poly(this.patches, [isoToScreen(a, 0.02), isoToScreen(b, 0.02), isoToScreen(b + 0.9, 1.8), isoToScreen(a + 0.9, 1.8)], color, alpha);
    }
    for (const [a, b] of windowSpans(this.size.h)) {
      poly(this.patches, [isoToScreen(0.02, a), isoToScreen(0.02, b), isoToScreen(1.8, b + 0.9), isoToScreen(1.8, a + 0.9)], color, alpha * 0.8);
    }
  }

  /** Pénombre bleutée sur toute la scène, puis halo chaud de chaque lampe de bureau. */
  private drawNight(d: Daylight): void {
    const b = screenBounds(this.size.w, this.size.h, 2000);
    this.dim.fillStyle(mixColor(COLORS.white, 0x9aa6dc, d.darkness * 0.5), 1).fillRect(b.x, b.y, b.width, b.height);
  }
}
