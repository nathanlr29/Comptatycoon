import Phaser from 'phaser';
import { OFFICE_STAGES, ROOMS, getStage, type Furniture, type RoomLayout, type RoomType } from '../data/office';
import type { Bounds } from './CameraController';
import { DEPTH, ISO, depthOf, isoQuad, isoToScreen, screenBounds, screenToIso } from './iso';
import { box, poly, tiles, windowNorth, windowWest } from './isoDraw';
import { drawDesk, drawFurniture } from './isoFurniture';
import { COLORS, ROOM_FLOORS, shade } from './palette';

/** Ce que la vue affiche : niveau d'agrandissement et pièces achetées. */
export interface OfficeView {
  stage: number;
  rooms: { type: RoomType; level: number }[];
}

type Obj = Phaser.GameObjects.Graphics;

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Mobilier en plus dans votre bureau selon son niveau (docs/GDD.md §6). */
function headquartersExtras(level: number): Furniture[] {
  const extras: Furniture[] = [];
  if (level >= 2) extras.push({ type: 'cabinet', x: 2.3, y: 0.5 });
  if (level >= 4) extras.push({ type: 'plant', x: 0.1, y: 1.2 });
  return extras;
}

/** Dessine le cabinet en fausse 3D et fait apparaître en douceur ce qui est nouveau. */
export class OfficeRenderer {
  private objects: Obj[] = [];
  private known = new Set<string>();
  private view: OfficeView = { stage: 1, rooms: [] };
  private readonly highlight: Obj;

  constructor(private readonly scene: Phaser.Scene) {
    this.highlight = scene.add.graphics().setDepth(DEPTH.floor + 0.5);
  }

  render(view: OfficeView): void {
    const first = this.known.size === 0;
    for (const o of this.objects) o.destroy();
    this.objects = [];
    this.view = view;
    const keys = new Set<string>();
    const group = (key: string, build: () => Obj[]) => {
      keys.add(key);
      const created = build();
      this.objects.push(...created);
      if (!first && !this.known.has(key) && !reducedMotion()) this.appear(created);
    };

    const stage = getStage(view.stage);
    group(`shell:${stage.stage}`, () => this.drawShell(stage.size.w, stage.size.h, stage.entranceX));
    for (const s of OFFICE_STAGES.filter((s) => s.stage <= stage.stage)) {
      group(`stage:${s.stage}`, () => [...s.desks.flatMap((d) => drawDesk(this.scene, d)), ...s.furniture.flatMap((f) => drawFurniture(this.scene, f))]);
    }
    const built = new Map(view.rooms.map((r) => [r.type, r.level]));
    for (const room of ROOMS) {
      const level = built.get(room.type);
      if (level === undefined || room.minStage > stage.stage) continue;
      group(`room:${room.type}`, () => this.drawRoom(room, level, stage.size));
    }
    this.known = keys;
    this.setHighlight(null);
  }

  /** Zone visitable par la caméra pour un niveau d'agrandissement. */
  bounds(stageNumber = this.view.stage): Bounds {
    const { w, h } = getStage(stageNumber).size;
    return screenBounds(w, h, 36);
  }

  /** Centre visuel du cabinet (sol). */
  center(): { x: number; y: number } {
    const { w, h } = getStage(this.view.stage).size;
    return isoToScreen(w / 2, h / 2, ISO.wallH / 3);
  }

  /** Pièce achetée sous un point du monde, ou null. */
  roomAt(px: number, py: number): RoomType | null {
    const p = screenToIso(px, py);
    const types = new Set(this.view.rooms.map((r) => r.type));
    const room = ROOMS.find((r) => types.has(r.type) && p.x >= r.rect.x && p.x <= r.rect.x + r.rect.w && p.y >= r.rect.y && p.y <= r.rect.y + r.rect.h);
    return room?.type ?? null;
  }

  setHighlight(type: RoomType | null): void {
    const g = this.highlight;
    g.clear();
    const room = type ? ROOMS.find((r) => r.type === type) : undefined;
    if (!room) return;
    const { x, y, w, h } = room.rect;
    g.lineStyle(4, COLORS.accent, 1).strokePoints(isoQuad(x + 0.08, y + 0.08, w - 0.16, h - 0.16), true);
    poly(g, isoQuad(x, y, w, h), COLORS.accent, 0.14);
  }

  private appear(objects: Obj[]): void {
    for (const o of objects) {
      const y = o.y;
      o.setAlpha(0).setY(y - 18);
      this.scene.tweens.add({ targets: o, alpha: 1, y, duration: 480, ease: 'Back.Out' });
    }
  }

  private layer(depth: number, draw: (g: Obj) => void): Obj {
    const g = this.scene.add.graphics().setDepth(depth);
    draw(g);
    return g;
  }

  /** Socle, sol commun, murs du fond avec fenêtres, paillasson d'entrée. */
  private drawShell(w: number, h: number, entranceX: number): Obj[] {
    const floor = this.layer(DEPTH.floor, (g) => {
      box(g, -0.35, -0.35, w + 0.7, h + 0.7, -22, 22, COLORS.ground, false);
      tiles(g, 0, 0, w, h, [COLORS.commonA, COLORS.commonB]);
      poly(g, isoQuad(entranceX - 0.5, h - 0.45, 1, 0.45), COLORS.doormat);
      poly(g, isoQuad(entranceX - 0.5, h, 1, 0.35, 0.5), shade(COLORS.commonA, 0.9));
    });
    const walls = this.layer(DEPTH.backWalls, (g) => {
      const H = ISO.wallH;
      const t = 0.25;
      // Mur nord (plan y = 0) et mur ouest (plan x = 0), avec chapeau
      poly(g, [isoToScreen(0, 0), isoToScreen(w, 0), isoToScreen(w, 0, H), isoToScreen(0, 0, H)], COLORS.wallLit);
      poly(g, [isoToScreen(0, 0), isoToScreen(0, h), isoToScreen(0, h, H), isoToScreen(0, 0, H)], COLORS.wallShade);
      poly(g, [isoToScreen(w, -t, 0), isoToScreen(w, 0, 0), isoToScreen(w, 0, H), isoToScreen(w, -t, H)], shade(COLORS.wallLit, 0.75));
      poly(g, [isoToScreen(-t, h, 0), isoToScreen(0, h, 0), isoToScreen(0, h, H), isoToScreen(-t, h, H)], shade(COLORS.wallShade, 0.85));
      poly(g, [isoToScreen(-t, -t, H), isoToScreen(w, -t, H), isoToScreen(w, 0, H), isoToScreen(0, 0, H), isoToScreen(0, h, H), isoToScreen(-t, h, H)], COLORS.wallCap);
      poly(g, [isoToScreen(0, 0), isoToScreen(w, 0), isoToScreen(w, 0, 6), isoToScreen(0, 0, 6)], COLORS.baseboard);
      poly(g, [isoToScreen(0, 0), isoToScreen(0, h), isoToScreen(0, h, 6), isoToScreen(0, 0, 6)], shade(COLORS.baseboard, 0.9));
      for (let a = 1; a + 1.2 <= w; a += 2.6) windowNorth(g, a, a + 1.2, 30, 68);
      for (let a = 1; a + 1.2 <= h; a += 2.6) windowWest(g, a, a + 1.2, 30, 68);
    });
    return [floor, walls];
  }

  private drawRoom(room: RoomLayout, level: number, size: { w: number; h: number }): Obj[] {
    const { x, y, w, h } = room.rect;
    const out: Obj[] = [];
    out.push(
      this.layer(DEPTH.floor + 0.2, (g) => {
        tiles(g, x, y, w, h, ROOM_FLOORS[room.type]);
        if (room.type === 'headquarters' && level >= 3) poly(g, isoQuad(0.5, 0.6, 1.8, 1.4), COLORS.rug, 0.9);
      }),
    );
    out.push(...this.partitions(room, size));
    const fancy = room.type === 'headquarters' && level >= 3;
    for (const d of room.desks) out.push(...drawDesk(this.scene, d, fancy));
    const furniture = room.type === 'headquarters' ? [...room.furniture, ...headquartersExtras(level)] : room.furniture;
    for (const f of furniture) out.push(...drawFurniture(this.scene, f));
    return out;
  }

  /** Cloisons basses découpées par case pour se trier avec le mobilier ; une case laissée libre pour la porte. */
  private partitions(room: RoomLayout, size: { w: number; h: number }): Obj[] {
    const { x, y, w, h } = room.rect;
    const T = 0.12;
    const out: Obj[] = [];
    const segX = (yy: number, door: number | null) => {
      for (let a = x; a < x + w; a++) {
        if (door !== null && a <= door && door < a + 1) continue;
        out.push(this.layer(depthOf(a + 1, yy + T / 2), (g) => box(g, a, yy - T / 2, 1, T, 0, ISO.partitionH, COLORS.partition)));
      }
    };
    const segY = (xx: number, door: number | null) => {
      for (let a = y; a < y + h; a++) {
        if (door !== null && a <= door && door < a + 1) continue;
        out.push(this.layer(depthOf(xx + T / 2, a + 1), (g) => box(g, xx - T / 2, a, T, 1, 0, ISO.partitionH, COLORS.partition)));
      }
    };
    if (y > 0) segX(y, null);
    if (x > 0) segY(x, null);
    if (y + h < size.h) segX(y + h, room.door.side === 's' ? room.door.at : null);
    if (x + w < size.w) segY(x + w, room.door.side === 'e' ? room.door.at : null);
    return out;
  }
}
