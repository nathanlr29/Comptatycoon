import Phaser from 'phaser';
import { OFFICE_STAGES, ROOMS, getStage, visibleDesks, type Furniture, type RoomLayout, type RoomType } from '../data/office';
import { builtRoomTypes, type OfficeView, type RoomView } from './officeView';
import type { Bounds } from './CameraController';
import { DEPTH, ISO, depthOf, isoQuad, isoToScreen, screenBounds, screenToIso } from './iso';
import { AmbientLayer } from './ambient';
import { FlatBaker, type Rect } from './bake';
import { daylightAt, localHour } from './daylight';
import { box, poly, tiles } from './isoDraw';
import { drawDesk, drawFurniture } from './isoFurniture';
import { floor, gravelPath, wallDecor, wallFootShadow } from './isoTextures';
import { LightingLayer } from './lighting';
import { COLORS, ROOM_FLOORS, shade } from './palette';


type Obj = Phaser.GameObjects.Graphics | Phaser.GameObjects.Image;
type G = Phaser.GameObjects.Graphics;

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Cloison basse en placoplâtre, chapeau en bois. */
function partition(g: G, x: number, y: number, w: number, h: number): void {
  box(g, x, y, w, h, 0, ISO.partitionH - 3, COLORS.partition);
  poly(g, isoQuad(x, y, w, h, ISO.partitionH - 3), COLORS.partitionCap);
}

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
  private readonly highlight: G;
  /** Barres de progression des travaux, redessinées sans tout reconstruire. */
  private readonly bars = new Map<RoomType, G>();
  private readonly lighting: LightingLayer;
  private readonly ambient: AmbientLayer;
  private readonly baker: FlatBaker;

  constructor(private readonly scene: Phaser.Scene) {
    this.highlight = scene.add.graphics().setDepth(DEPTH.floor + 0.5);
    this.lighting = new LightingLayer(scene);
    this.ambient = new AmbientLayer(scene);
    this.baker = new FlatBaker(scene);
    // L'heure réelle fait tourner l'horloge et passer le jour à la nuit.
    scene.time.addEvent({ delay: 20_000, loop: true, callback: () => this.updateAmbience() });
  }

  /** Ambiance de l'heure actuelle (ciel, lumière) et horloge murale. */
  updateAmbience(now = new Date()): void {
    this.lighting.setDaylight(daylightAt(localHour(now)));
    this.ambient.tickClock(now);
  }

  render(view: OfficeView): void {
    const first = this.known.size === 0;
    for (const o of this.objects) o.destroy();
    this.objects = [];
    this.baker.release();
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
    const furniture: Furniture[] = [];
    for (const s of OFFICE_STAGES.filter((s) => s.stage <= stage.stage)) {
      furniture.push(...s.furniture);
      group(`stage:${s.stage}`, () => [...s.desks.flatMap((d) => drawDesk(this.scene, d)), ...s.furniture.flatMap((f) => drawFurniture(this.scene, f))]);
    }
    this.bars.clear();
    const rooms = new Map(view.rooms.map((r) => [r.type, r]));
    for (const room of ROOMS) {
      const r = rooms.get(room.type);
      if (!r || room.minStage > stage.stage) continue;
      // La clé change à la fin des travaux : la pièce terminée apparaît en douceur.
      const done = r.visual !== 'works';
      if (done) furniture.push(...this.roomFurniture(room, r.level));
      group(`room:${room.type}:${done ? 'done' : 'works'}`, () => (done ? this.drawRoom(room, r, stage.size) : this.drawWorks(room, stage.size)));
    }
    this.known = keys;
    this.setHighlight(null);
    this.lighting.setLayout(stage.size, visibleDesks(stage.stage, builtRoomTypes(view)));
    this.ambient.render(furniture);
    this.updateAmbience();
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

  /** Met à jour les barres de travaux (avancement 0 à 1 par type de pièce). */
  updateWorks(progress: ReadonlyMap<string, number>): void {
    for (const [type, g] of this.bars) {
      const room = ROOMS.find((r) => r.type === type);
      if (!room) continue;
      const p = progress.get(type) ?? 1;
      const { x, y, w, h } = room.rect;
      const a = isoToScreen(x + w / 2, y + h / 2, 70);
      g.clear();
      g.fillStyle(COLORS.shadow, 0.75).fillRoundedRect(a.x - 40, a.y - 7, 80, 14, 7);
      g.fillStyle(COLORS.accent, 1).fillRoundedRect(a.x - 38, a.y - 5, Math.max(10, 76 * p), 10, 5);
    }
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

  private layer(depth: number, draw: (g: G) => void): G {
    const g = this.scene.add.graphics().setDepth(depth);
    draw(g);
    return g;
  }

  /** Socle, sol commun, murs du fond (les fenêtres sont dans lighting.ts), paillasson d'entrée. */
  private drawShell(w: number, h: number, entranceX: number): Obj[] {
    // Sol commun et murs du fond figés en une seule image (rien ne les recouvre entre les deux).
    const shell = this.baker.bake(DEPTH.floor, screenBounds(w, h, 48), (g) => {
      box(g, -0.35, -0.35, w + 0.7, h + 0.7, -22, 22, COLORS.ground, false);
      floor(g, 0, 0, w, h, 'tiles', [COLORS.commonA, COLORS.commonB]);
      poly(g, isoQuad(entranceX - 0.5, h - 0.45, 1, 0.45), COLORS.doormat);
      poly(g, isoQuad(entranceX - 0.5, h, 1, 0.35, 0.5), shade(COLORS.commonA, 0.9));
      this.drawWalls(g, w, h);
    });
    // Ombre au pied des murs, au-dessus des sols des pièces
    const shadow = this.layer(DEPTH.floor + 0.25, (g) => wallFootShadow(g, w, h));
    return [shell, shadow];
  }

  private drawWalls(g: G, w: number, h: number): void {
    const H = ISO.wallH;
    const t = 0.25;
    // Mur nord (plan y = 0) et mur ouest (plan x = 0), avec chapeau
    poly(g, [isoToScreen(0, 0), isoToScreen(w, 0), isoToScreen(w, 0, H), isoToScreen(0, 0, H)], COLORS.wallLit);
    poly(g, [isoToScreen(0, 0), isoToScreen(0, h), isoToScreen(0, h, H), isoToScreen(0, 0, H)], COLORS.wallShade);
    wallDecor(g, w, h, H);
    poly(g, [isoToScreen(w, -t, 0), isoToScreen(w, 0, 0), isoToScreen(w, 0, H), isoToScreen(w, -t, H)], shade(COLORS.wallLit, 0.75));
    poly(g, [isoToScreen(-t, h, 0), isoToScreen(0, h, 0), isoToScreen(0, h, H), isoToScreen(-t, h, H)], shade(COLORS.wallShade, 0.85));
    poly(g, [isoToScreen(-t, -t, H), isoToScreen(w, -t, H), isoToScreen(w, 0, H), isoToScreen(0, 0, H), isoToScreen(0, h, H), isoToScreen(-t, h, H)], COLORS.wallCap);
    poly(g, [isoToScreen(0, 0), isoToScreen(w, 0), isoToScreen(w, 0, 6), isoToScreen(0, 0, 6)], COLORS.baseboard);
    poly(g, [isoToScreen(0, 0), isoToScreen(0, h), isoToScreen(0, h, 6), isoToScreen(0, 0, 6)], shade(COLORS.baseboard, 0.9));
  }

  /** Sol d'une pièce, figé en image. */
  private roomFloor(rect: { x: number; y: number; w: number; h: number }, draw: (g: G) => void): Obj {
    const { x, y, w, h } = rect;
    const b: Rect = { x: isoToScreen(x, y + h).x - 4, y: isoToScreen(x, y).y - 4, width: (w + h) * (ISO.tileW / 2) + 8, height: (w + h) * (ISO.tileH / 2) + 8 };
    return this.baker.bake(DEPTH.floor + 0.2, b, draw);
  }

  /** Pièce en travaux : sol nu, bâche sur échafaudage, rubalise et barre de progression. */
  private drawWorks(room: RoomLayout, size: { w: number; h: number }): Obj[] {
    const { x, y, w, h } = room.rect;
    const out: Obj[] = [this.roomFloor(room.rect, (g) => tiles(g, x, y, w, h, [0xc9c2b6, 0xc0b8ab]))];
    out.push(...this.partitions(room, size));
    out.push(
      this.layer(depthOf(x + w - 0.3, y + h - 0.3), (g) => {
        box(g, x + 0.4, y + 0.4, w - 0.8, h - 0.8, 0, 46, 0x7c8796);
        const p = isoQuad(x + 0.25, y + 0.25, w - 0.5, h - 0.5, 2);
        g.lineStyle(4, 0xfacc15, 1).strokePoints(p, true);
      }),
    );
    const bar = this.layer(DEPTH.overlay - 1, () => undefined);
    this.bars.set(room.type, bar);
    out.push(bar);
    return out;
  }

  private drawRoom(room: RoomLayout, view: RoomView, size: { w: number; h: number }): Obj[] {
    const { x, y, w, h } = room.rect;
    const level = view.level;
    const out: Obj[] = [];
    out.push(
      this.roomFloor(room.rect, (g) => {
        const { kind, colors } = ROOM_FLOORS[room.type];
        floor(g, x, y, w, h, kind, colors);
        if (room.type === 'garden') gravelPath(g, room.door.at + 0.5, y + h / 2, y + h);
        if (room.type === 'headquarters' && level >= 3) {
          poly(g, isoQuad(0.5, 0.6, 1.8, 1.4), COLORS.rug, 0.9);
          g.lineStyle(2, COLORS.gold, 0.8).strokePoints(isoQuad(0.6, 0.7, 1.6, 1.2), true);
        }
      }),
    );
    if (room.type === 'headquarters' && level >= 2) out.push(this.layer(DEPTH.backWalls + 0.2, (g) => this.diploma(g)));
    out.push(...this.partitions(room, size));
    const fancy = room.type === 'headquarters' && level >= 3;
    for (const d of room.desks) out.push(...drawDesk(this.scene, d, fancy));
    for (const f of this.roomFurniture(room, level)) out.push(...drawFurniture(this.scene, f));
    if (view.visual === 'upgradable') out.push(this.badge(room));
    return out;
  }

  private roomFurniture(room: RoomLayout, level: number): Furniture[] {
    return room.type === 'headquarters' ? [...room.furniture, ...headquartersExtras(level)] : room.furniture;
  }

  /** Diplôme d'expert-comptable encadré au mur ouest du bureau principal. */
  private diploma(g: G): void {
    const q = (y0: number, y1: number, z0: number, z1: number) => [isoToScreen(0, y0, z0), isoToScreen(0, y1, z0), isoToScreen(0, y1, z1), isoToScreen(0, y0, z1)];
    poly(g, q(2.42, 2.98, 38, 64), COLORS.woodDark);
    poly(g, q(2.48, 2.92, 41, 61), COLORS.diploma);
    for (const z of [55, 50, 46]) poly(g, q(2.56, 2.84, z, z + 1.2), COLORS.outline, 0.35);
    const seal = isoToScreen(0, 2.8, 44);
    g.fillStyle(COLORS.rug, 1).fillCircle(seal.x, seal.y, 2.2);
  }

  /** Pastille « améliorable » au-dessus du coin avant de la pièce. */
  private badge(room: RoomLayout): Obj {
    const { x, y, w, h } = room.rect;
    const a = isoToScreen(x + w - 0.4, y + h - 0.4, 64);
    return this.layer(DEPTH.overlay - 1, (g) => {
      g.fillStyle(COLORS.accent, 1).fillCircle(a.x, a.y, 13);
      g.lineStyle(3, COLORS.white, 1).strokeCircle(a.x, a.y, 13);
      g.fillStyle(COLORS.white, 1).fillTriangle(a.x - 6, a.y + 2, a.x + 6, a.y + 2, a.x, a.y - 7).fillRect(a.x - 2.5, a.y + 1, 5, 6);
    });
  }

  /** Cloisons basses découpées par case pour se trier avec le mobilier ; une case laissée libre pour la porte. */
  private partitions(room: RoomLayout, size: { w: number; h: number }): Obj[] {
    const { x, y, w, h } = room.rect;
    const T = 0.12;
    const out: Obj[] = [];
    const segX = (yy: number, door: number | null) => {
      for (let a = x; a < x + w; a++) {
        if (door !== null && a <= door && door < a + 1) continue;
        out.push(this.layer(depthOf(a + 1, yy + T / 2), (g) => partition(g, a, yy - T / 2, 1, T)));
      }
    };
    const segY = (xx: number, door: number | null) => {
      for (let a = y; a < y + h; a++) {
        if (door !== null && a <= door && door < a + 1) continue;
        out.push(this.layer(depthOf(xx + T / 2, a + 1), (g) => partition(g, xx - T / 2, a, T, 1)));
      }
    };
    if (y > 0) segX(y, null);
    if (x > 0) segY(x, null);
    if (y + h < size.h) segX(y + h, room.door.side === 's' ? room.door.at : null);
    if (x + w < size.w) segY(x + w, room.door.side === 'e' ? room.door.at : null);
    return out;
  }
}
