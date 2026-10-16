import Phaser from 'phaser';
import { HQ_SLOT, SLOTS, WORLD, ZONES, isZoneUnlocked, type Rect, type Slot } from '../data/map';
import { MAP_COLORS as C } from './palette';

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Générateur pseudo-aléatoire déterministe : le décor est identique à chaque chargement. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function overlaps(a: Rect, x: number, y: number, margin: number): boolean {
  return x > a.x - margin && x < a.x + a.w + margin && y > a.y - margin && y < a.y + a.h + margin;
}

/** Dessine la carte statique : sol, allées, décor, zones, emplacements, Bureau principal. */
export class MapRenderer {
  private readonly lockLayer: Phaser.GameObjects.Container;
  private readonly slotLayer: Phaser.GameObjects.Graphics;
  private readonly highlight: Phaser.GameObjects.Graphics;
  private readonly textResolution = Math.min(window.devicePixelRatio || 1, 3);

  constructor(private readonly scene: Phaser.Scene) {
    this.drawGround();
    this.drawPaths();
    this.drawTrees();
    this.slotLayer = scene.add.graphics();
    this.drawHeadquarters(HQ_SLOT);
    this.lockLayer = scene.add.container();
    this.highlight = scene.add.graphics();
  }

  /** Redessine ce qui dépend du niveau du Bureau principal. */
  render(hqLevel: number): void {
    this.slotLayer.clear();
    for (const slot of SLOTS) this.drawEmptySlot(slot);
    this.lockLayer.removeAll(true);
    for (const zone of ZONES) if (!isZoneUnlocked(zone, hqLevel)) this.drawLockedZone(zone.rect, zone.name, zone.unlockLevel);
  }

  setHighlight(rect: Rect | null): void {
    const g = this.highlight;
    g.clear();
    if (!rect) return;
    g.lineStyle(6, C.accent, 1);
    g.strokeRoundedRect(rect.x - 8, rect.y - 8, rect.w + 16, rect.h + 16, 14);
  }

  private text(x: number, y: number, value: string, size: number, color: string, bold = true) {
    return this.scene.add
      .text(x, y, value, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal', color, align: 'center' })
      .setOrigin(0.5)
      .setResolution(this.textResolution);
  }

  private drawGround(): void {
    const g = this.scene.add.graphics();
    g.fillStyle(C.grass, 1).fillRect(0, 0, WORLD.width, WORLD.height);
    g.fillStyle(C.grassDark, 0.35);
    for (let x = 0; x < WORLD.width; x += 160) g.fillRect(x, 0, 80, WORLD.height); // bandes de tonte
  }

  private drawPaths(): void {
    const g = this.scene.add.graphics();
    const cx = HQ_SLOT.x + HQ_SLOT.w / 2;
    const cy = HQ_SLOT.y + HQ_SLOT.h / 2;
    const roads: Rect[] = [
      { x: 0, y: cy - 30, w: WORLD.width, h: 60 }, // axe est-ouest
      { x: cx - 30, y: 0, w: 60, h: WORLD.height }, // axe nord-sud
    ];
    for (const r of roads) {
      g.fillStyle(C.pathEdge, 1).fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
      g.fillStyle(C.path, 1).fillRect(r.x, r.y, r.w, r.h);
    }
    g.fillStyle(C.pathEdge, 1).fillRoundedRect(HQ_SLOT.x - 64, HQ_SLOT.y - 44, HQ_SLOT.w + 128, HQ_SLOT.h + 108, 28);
    g.fillStyle(C.plaza, 1).fillRoundedRect(HQ_SLOT.x - 60, HQ_SLOT.y - 40, HQ_SLOT.w + 120, HQ_SLOT.h + 100, 24);
  }

  private drawTrees(): void {
    const g = this.scene.add.graphics();
    const rand = seeded(42);
    const blocked: Rect[] = [HQ_SLOT, ...SLOTS];
    const cx = HQ_SLOT.x + HQ_SLOT.w / 2;
    const cy = HQ_SLOT.y + HQ_SLOT.h / 2;
    let placed = 0;
    for (let i = 0; i < 400 && placed < 90; i++) {
      const x = rand() * WORLD.width;
      const y = rand() * WORLD.height;
      if (Math.abs(x - cx) < 70 || Math.abs(y - cy) < 70) continue; // pas sur les allées
      if (blocked.some((r) => overlaps(r, x, y, 70))) continue;
      const r = 18 + rand() * 16;
      g.fillStyle(C.shadow, 0.18).fillCircle(x + 8, y + 10, r);
      g.fillStyle(C.tree, 1).fillCircle(x, y, r);
      g.fillStyle(C.treeLight, 1).fillCircle(x - r * 0.3, y - r * 0.3, r * 0.55);
      placed++;
    }
  }

  private drawHeadquarters(r: Rect): void {
    const g = this.scene.add.graphics();
    const facade = 56;
    const roofH = r.h - facade;
    g.fillStyle(C.shadow, 0.25).fillRoundedRect(r.x + 14, r.y + 16, r.w, r.h, 10);
    // Façade avec fenêtres et porte
    g.fillStyle(C.wall, 1).fillRect(r.x, r.y + roofH, r.w, facade);
    g.fillStyle(C.wallShade, 1).fillRect(r.x, r.y + r.h - 8, r.w, 8);
    g.fillStyle(C.window, 1);
    for (let i = 0; i < 6; i++) {
      const wx = r.x + 14 + i * 34;
      if (i === 2 || i === 3) continue;
      g.fillRect(wx, r.y + roofH + 12, 22, 22);
    }
    g.fillStyle(C.door, 1).fillRect(r.x + r.w / 2 - 20, r.y + roofH + 14, 40, facade - 22);
    // Toit vu de dessus
    g.fillStyle(C.roof, 1).fillRoundedRect(r.x - 6, r.y, r.w + 12, roofH, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.fillStyle(C.roofLight, 1).fillRect(r.x + 10, r.y + roofH / 2 - 3, r.w - 20, 6);
    this.text(r.x + r.w / 2, r.y + roofH / 2 - 26, 'Cabinet', 22, C.textLight);
  }

  private drawEmptySlot(r: Slot): void {
    const g = this.slotLayer;
    g.fillStyle(C.slotFill, 0.18).fillRoundedRect(r.x, r.y, r.w, r.h, 12);
    g.lineStyle(4, C.slotLine, 0.85);
    const dash = 16;
    const gap = 10;
    for (let x = r.x + 12; x < r.x + r.w - 12; x += dash + gap) {
      const len = Math.min(dash, r.x + r.w - 12 - x);
      g.lineBetween(x, r.y, x + len, r.y).lineBetween(x, r.y + r.h, x + len, r.y + r.h);
    }
    for (let y = r.y + 12; y < r.y + r.h - 12; y += dash + gap) {
      const len = Math.min(dash, r.y + r.h - 12 - y);
      g.lineBetween(r.x, y, r.x, y + len).lineBetween(r.x + r.w, y, r.x + r.w, y + len);
    }
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    g.fillStyle(C.slotFill, 0.9).fillCircle(cx, cy, 24);
    g.fillStyle(C.tree, 1).fillRect(cx - 12, cy - 3, 24, 6).fillRect(cx - 3, cy - 12, 6, 24);
  }

  private drawLockedZone(r: Rect, name: string, level: number): void {
    const g = this.scene.add.graphics();
    g.fillStyle(C.locked, 0.5).fillRoundedRect(r.x, r.y, r.w, r.h, 24);
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    g.fillStyle(0xffffff, 0.92).fillCircle(cx, cy - 30, 44);
    g.lineStyle(7, C.locked, 1).beginPath().arc(cx, cy - 40, 14, Math.PI, 0).strokePath();
    g.fillStyle(C.locked, 1).fillRoundedRect(cx - 20, cy - 40, 40, 30, 5);
    const title = this.text(cx, cy + 38, name, 26, C.textLight);
    const hint = this.text(cx, cy + 72, `Bureau principal niv. ${level}`, 20, C.textLight, false);
    this.lockLayer.add([g, title, hint]);
  }
}
