import Phaser from 'phaser';
import { BUILDING, HQ_SLOT, KITCHEN, RECEPTION, SLOTS, START_VIEW, WORLD, ZONES, isZoneUnlocked, type Rect, type Zone, type ZoneId } from '../data/map';
import { floor, roomWalls } from './furniture';
import { staffSlots } from './characters/tempSeats';
import { MAP_COLORS as C } from './palette';
import { drawFreeSlot, drawKitchen, drawLevelBadge, drawReception, drawRoom } from './rooms';

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
/** Débord des sols de chaque local sur l'espace entre locaux (le reste forme les murs). */
const ZONE_PAD = 12;
/** Passages entre locaux, ouverts quand les deux sont loués. */
const DOORS: { between: [ZoneId, ZoneId]; rect: Rect }[] = [
  { between: ['start', 'east'], rect: { x: 1036, y: 726, w: 48, h: 88 } },
  { between: ['start', 'north'], rect: { x: 716, y: 496, w: 88, h: 48 } },
  { between: ['start', 'garden'], rect: { x: 436, y: 726, w: 48, h: 88 } },
  { between: ['east', 'north'], rect: { x: 1256, y: 496, w: 88, h: 48 } },
];
const ENTRANCE: Rect = { x: 860, y: 988, w: 70, h: 30 };

function pad(r: Rect, p: number): Rect {
  return { x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p };
}

/** Dessine le plan intérieur : rue, murs, locaux, pièces, locaux à louer. */
export class MapRenderer {
  private readonly dynamic: Phaser.GameObjects.Graphics;
  private readonly overlay: Phaser.GameObjects.Container;
  private readonly highlight: Phaser.GameObjects.Graphics;
  private readonly textResolution = Math.min(window.devicePixelRatio || 1, 3);

  constructor(private readonly scene: Phaser.Scene) {
    const g = scene.add.graphics();
    this.drawOutside(g);
    this.drawShell(g);
    drawReception(g, RECEPTION);
    drawKitchen(g, KITCHEN);
    this.dynamic = scene.add.graphics();
    this.overlay = scene.add.container();
    this.highlight = scene.add.graphics();
  }

  /** Redessine ce qui dépend du niveau du Bureau principal. */
  render(hqLevel: number): void {
    const g = this.dynamic;
    g.clear();
    this.overlay.removeAll(true);
    const open = (id: ZoneId) => ZONES.some((z) => z.id === id && isZoneUnlocked(z, hqLevel));
    for (const door of DOORS) if (door.between.every(open)) floor(g, door.rect, 'corridor');
    // Open space provisoire : les postes et leurs occupants viennent de StaffLayer.
    const furnished = new Set(staffSlots(hqLevel).map((s) => s.id));
    for (const slot of SLOTS) {
      if (furnished.has(slot.id)) {
        floor(g, slot, 'carpet');
        roomWalls(g, slot);
      } else if (open(slot.zone)) drawFreeSlot(g, slot);
    }
    drawRoom(g, 'headquarters', hqLevel, HQ_SLOT);
    this.label(HQ_SLOT, 'Bureau principal', hqLevel);
    for (const zone of ZONES) if (!isZoneUnlocked(zone, hqLevel)) this.drawLockedZone(zone);
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

  /** Plaque du nom sur le mur du bas (comme une plaque de porte) et badge de niveau. */
  private label(r: Rect, name: string, level: number): void {
    const plate = this.text(r.x + 18, r.y + r.h, name, 14, C.textLight).setOrigin(0, 0.5);
    const bg = this.scene.add.graphics();
    bg.fillStyle(C.wall, 1).fillRoundedRect(r.x + 8, r.y + r.h - 12, plate.width + 20, 24, 12);
    const badge = this.scene.add.graphics();
    const at = drawLevelBadge(badge, r, false);
    this.overlay.add([bg, plate, badge, this.text(at.x, at.y, String(level), 15, C.textLight)]);
  }

  private drawOutside(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(C.outside, 1).fillRect(0, 0, WORLD.width, WORLD.height);
    // Toits des immeubles voisins
    g.fillStyle(C.roofs, 1);
    for (let x = 0; x < WORLD.width; x += 200) g.fillRect(x + 6, 0, 188, BUILDING.y - 30);
    g.fillStyle(C.roofsEdge, 1);
    for (let x = 0; x < WORLD.width; x += 200) g.fillRect(x + 6, BUILDING.y - 36, 188, 6);
    // Rue : trottoir, chaussée, trottoir d'en face
    const sidewalk = BUILDING.y + BUILDING.h + 14;
    g.fillStyle(C.sidewalkEdge, 1).fillRect(0, sidewalk, WORLD.width, 62);
    g.fillStyle(C.sidewalk, 1).fillRect(0, sidewalk, WORLD.width, 56);
    g.fillStyle(C.asphalt, 1).fillRect(0, sidewalk + 62, WORLD.width, WORLD.height - sidewalk - 62);
    g.fillStyle(C.roadLine, 0.8);
    for (let x = 20; x < WORLD.width; x += 90) g.fillRect(x, sidewalk + 132, 50, 6);
    g.fillStyle(C.sidewalk, 1).fillRect(0, WORLD.height - 36, WORLD.width, 36);
  }

  private drawShell(g: Phaser.GameObjects.Graphics): void {
    const outer = pad(BUILDING, 14);
    g.fillStyle(C.shadow, 0.35).fillRect(outer.x + 10, outer.y + 12, outer.w, outer.h);
    g.fillStyle(C.wall, 1).fillRect(outer.x, outer.y, outer.w, outer.h);
    g.fillStyle(C.wallTop, 1).fillRect(outer.x, outer.y, outer.w, 3);
    // Fenêtres sur la façade nord et sur la rue
    g.fillStyle(C.window, 1);
    for (let x = outer.x + 60; x < outer.x + outer.w - 60; x += 120) {
      g.fillRect(x, outer.y + 6, 60, 6);
      if (x < ENTRANCE.x - 80 || x > ENTRANCE.x + ENTRANCE.w + 20) g.fillRect(x, outer.y + outer.h - 12, 60, 6);
    }
    for (const zone of ZONES) floor(g, pad(zone.rect, ZONE_PAD), 'corridor');
    floor(g, ENTRANCE, 'corridor');
    // Paillasson et enseigne
    g.fillStyle(0x6b5b4b, 1).fillRect(ENTRANCE.x + 6, ENTRANCE.y + 34, ENTRANCE.w - 12, 14);
  }

  private drawLockedZone(zone: Zone): void {
    const r = pad(zone.rect, ZONE_PAD);
    const g = this.scene.add.graphics();
    g.fillStyle(C.locked, 0.82).fillRect(r.x, r.y, r.w, r.h);
    // Panneau « À louer » avec cadenas, placé du côté du petit bureau pour être vu dès le départ
    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
    const cx = clamp(START_VIEW.x, r.x + 130, r.x + r.w - 130);
    const cy = clamp(START_VIEW.y, r.y + 100, r.y + r.h - 100);
    g.fillStyle(C.shadow, 0.4).fillRoundedRect(cx - 114, cy - 76, 236, 164, 14);
    g.fillStyle(0xfaf7f0, 1).fillRoundedRect(cx - 118, cy - 80, 236, 164, 14);
    g.fillStyle(0xdc2626, 1).fillRoundedRect(cx - 118, cy - 80, 236, 38, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.lineStyle(6, C.wall, 1).beginPath().arc(cx, cy - 14, 11, Math.PI, 0).strokePath();
    g.fillStyle(C.wall, 1).fillRoundedRect(cx - 17, cy - 14, 34, 24, 5);
    const title = this.text(cx, cy - 61, 'À LOUER', 20, C.textLight);
    const name = this.text(cx, cy + 32, zone.name, 19, C.text);
    const hint = this.text(cx, cy + 60, `Bureau principal niv. ${zone.unlockLevel}`, 15, '#475569', false);
    this.overlay.add([g, title, name, hint]);
  }
}
