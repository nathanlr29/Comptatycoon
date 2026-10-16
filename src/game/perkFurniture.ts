/** Objets du confort des équipes (src/data/perks.ts), dessinés seulement une fois l'avantage acheté. */
import type Phaser from 'phaser';
import { PERK_ITEMS, perkItemStage, type PerkId, type PerkItem } from '../data/perks';
import { DEPTH, depthOf, isoQuad, isoToScreen } from './iso';
import { box, groundShadow, poly } from './isoDraw';
import { COLORS, shade } from './palette';

type G = Phaser.GameObjects.Graphics;

const FELT = 0x15803d;
const CORK = 0xc89b63;
/** Couleur de la feuille épinglée par chaque avantage du CSE, dans l'ordre d'affichage. */
const BOARD_SHEETS: [PerkId, number][] = [
  ['mutuelle', 0xbfdbfe],
  ['cse', 0xffffff],
  ['mealVouchers', 0xfde68a],
  ['holidayVouchers', 0x99f6e4],
];

/**
 * Objets à dessiner pour les avantages achetés, avec la clé de rendu de chacun. Le tableau du CSE est partagé :
 * sa clé change avec chaque feuille épinglée, pour qu'il réapparaisse complété.
 */
export function visiblePerkItems(perks: readonly PerkId[], stage: number): { key: string; item: PerkItem }[] {
  const out = new Map<string, { key: string; item: PerkItem }>();
  for (const id of perks) {
    const item = PERK_ITEMS[id];
    if (!item || perkItemStage(id) > stage || out.has(item.type)) continue;
    const sheets = item.type === 'noticeBoard' ? BOARD_SHEETS.filter(([p]) => perks.includes(p)).map(([p]) => p).join('+') : id;
    out.set(item.type, { key: `perk:${item.type}:${sheets}`, item });
  }
  return [...out.values()];
}

function piece(scene: Phaser.Scene, item: PerkItem, draw: (g: G) => void, depth = depthOf(item.x + item.w, item.y + item.h)): G {
  const g = scene.add.graphics();
  draw(g);
  return g.setDepth(depth);
}

/** Quatre pieds fins et un plateau à la hauteur z. */
function table(g: G, x: number, y: number, w: number, h: number, z: number, top: number, legs: number): void {
  const t = 0.08;
  for (const [lx, ly] of [[x + 0.04, y + 0.04], [x + w - t - 0.04, y + 0.04], [x + 0.04, y + h - t - 0.04], [x + w - t - 0.04, y + h - t - 0.04]] as const) {
    box(g, lx, ly, t, t, 0, z, legs, false);
  }
  box(g, x, y, w, h, z, 5, top);
}

export function drawPerkItem(scene: Phaser.Scene, item: PerkItem, owned: readonly PerkId[]): G[] {
  const { x, y, w, h } = item;
  switch (item.type) {
    case 'fruitTable':
      return [
        piece(scene, item, (g) => {
          groundShadow(g, x, y, w, h);
          table(g, x, y, w, h, 22, COLORS.deskWood, COLORS.woodDark);
          const c = isoToScreen(x + w / 2, y + h / 2, 30);
          g.fillStyle(0xd6b98c, 1).fillEllipse(c.x, c.y + 2, 22, 10);
          for (const [dx, dy, color] of [[-5, -2, 0xef4444], [3, -3, 0xf59e0b], [-1, -6, 0x84cc16], [6, 0, 0xfacc15]] as const) {
            g.fillStyle(color, 1).fillCircle(c.x + dx, c.y + dy, 3.6);
          }
        }),
      ];
    case 'foosball':
      return [
        piece(scene, item, (g) => {
          groundShadow(g, x, y, w, h);
          for (const lx of [x + 0.08, x + w - 0.18]) box(g, lx, y + 0.18, 0.1, h - 0.36, 0, 18, COLORS.woodDark, false);
          box(g, x, y, w, h, 18, 12, COLORS.deskWood);
          poly(g, isoQuad(x + 0.08, y + 0.08, w - 0.16, h - 0.16, 30.5), FELT);
          // Barres et joueurs rouges / bleus
          for (let i = 0; i < 4; i++) {
            const bx = x + 0.2 + i * 0.27;
            const a = isoToScreen(bx, y - 0.08, 34);
            const b = isoToScreen(bx, y + h + 0.08, 34);
            g.lineStyle(1.6, COLORS.metal, 1).lineBetween(a.x, a.y, b.x, b.y);
            const p = isoToScreen(bx, y + h / 2, 34);
            g.fillStyle(i % 2 ? 0x2563eb : 0xdc2626, 1).fillRect(p.x - 1.5, p.y - 4, 3, 6);
          }
        }),
      ];
    case 'noticeBoard': {
      const sheets = BOARD_SHEETS.filter(([id]) => owned.includes(id));
      return [
        piece(scene, item, (g) => {
          box(g, x + 0.02, y + 0.15, 0.08, 0.08, 0, 22, COLORS.metal, false);
          box(g, x + 0.02, y + h - 0.23, 0.08, 0.08, 0, 22, COLORS.metal, false);
          box(g, x, y, w, h, 22, 40, COLORS.woodDark);
          // Face liège tournée vers +x (vers la droite de l'écran)
          const fx = x + w + 0.005;
          const q = (y0: number, y1: number, z0: number, z1: number) => [isoToScreen(fx, y0, z0), isoToScreen(fx, y1, z0), isoToScreen(fx, y1, z1), isoToScreen(fx, y0, z1)];
          poly(g, q(y + 0.06, y + h - 0.06, 25, 59), CORK);
          if (owned.includes('cse')) poly(g, q(y + 0.1, y + h - 0.1, 51, 57), 0x1d4ed8);
          sheets.forEach(([, color], i) => {
            const y0 = y + 0.12 + (i % 2) * 0.42;
            const z0 = i < 2 ? 37 : 27;
            poly(g, q(y0, y0 + 0.32, z0, z0 + 11), color);
            const pin = isoToScreen(fx, y0 + 0.16, z0 + 9.5);
            g.fillStyle(0xdc2626, 1).fillCircle(pin.x, pin.y, 1.3);
          });
        }),
      ];
    }
    case 'billiard':
      return [
        piece(scene, item, (g) => {
          groundShadow(g, x, y, w, h);
          for (const [lx, ly] of [[x + 0.1, y + 0.1], [x + w - 0.3, y + 0.1], [x + 0.1, y + h - 0.3], [x + w - 0.3, y + h - 0.3]] as const) {
            box(g, lx, ly, 0.2, 0.2, 0, 16, COLORS.woodDark, false);
          }
          box(g, x, y, w, h, 16, 10, COLORS.woodDark);
          poly(g, isoQuad(x + 0.14, y + 0.14, w - 0.28, h - 0.28, 26.5), FELT);
          for (const [px, py] of [[0, 0], [w / 2, 0], [w, 0], [0, h], [w / 2, h], [w, h]] as const) {
            const p = isoToScreen(x + 0.14 + px * ((w - 0.28) / w), y + 0.14 + py * ((h - 0.28) / h), 26.5);
            g.fillStyle(0x111827, 1).fillCircle(p.x, p.y, 2.4);
          }
          const balls: [number, number, number][] = [[0.65, 0.6, 0xffffff], [1.4, 0.45, 0xfacc15], [1.5, 0.62, 0xdc2626], [1.62, 0.5, 0x111827], [1.52, 0.78, 0x2563eb]];
          for (const [bx, by, color] of balls) {
            const p = isoToScreen(x + bx, y + by, 28);
            g.fillStyle(color, 1).fillCircle(p.x, p.y, 2.6);
          }
          // Queue posée en travers
          const a = isoToScreen(x + 0.3, y + 0.95, 29);
          const b = isoToScreen(x + 1.2, y + 0.3, 29);
          g.lineStyle(2, 0xe7c08a, 1).lineBetween(a.x, a.y, b.x, b.y);
        }),
      ];
    case 'napCorner':
      return [
        piece(scene, item, (g) => {
          // Tapis, deux poufs et une lampe à la lumière douce
          poly(g, isoQuad(x, y, w, h), 0x7c6aa6, 0.85);
          for (const [px, py, color] of [[x + 0.45, y + 0.5, 0xf59e0b], [x + 1.25, y + 0.45, 0x0ea5e9]] as const) {
            const c = isoToScreen(px, py, 0);
            g.fillStyle(COLORS.shadow, 0.18).fillEllipse(c.x + 2, c.y + 2, 30, 14);
            g.fillStyle(shade(color, 0.8), 1).fillEllipse(c.x, c.y - 4, 30, 16);
            g.fillStyle(color, 1).fillEllipse(c.x, c.y - 8, 26, 13);
          }
          box(g, x + w - 0.25, y + 0.1, 0.12, 0.12, 0, 34, COLORS.metal, false);
          const l = isoToScreen(x + w - 0.19, y + 0.16, 40);
          g.fillStyle(COLORS.lamp, 0.25).fillCircle(l.x, l.y, 14);
          g.fillStyle(0xfde68a, 1).fillEllipse(l.x, l.y, 12, 8);
        }),
      ];
    case 'visioCart':
      return [
        piece(scene, item, (g) => {
          groundShadow(g, x, y, w, h);
          box(g, x + 0.1, y + 0.05, w - 0.2, h - 0.1, 0, 4, COLORS.monitor, false);
          box(g, x + w / 2 - 0.05, y + h / 2 - 0.05, 0.1, 0.1, 4, 30, COLORS.metal, false);
          // Grand écran tourné vers la pièce (face sud), mosaïque de visages en visio
          box(g, x, y + h / 2 - 0.06, w, 0.1, 30, 36, COLORS.monitor);
          const fy = y + h / 2 + 0.045;
          const cell = (i: number, j: number) => {
            const x0 = x + 0.08 + i * 0.29;
            const z0 = 33 + j * 15;
            poly(g, [isoToScreen(x0, fy, z0), isoToScreen(x0 + 0.26, fy, z0), isoToScreen(x0 + 0.26, fy, z0 + 13), isoToScreen(x0, fy, z0 + 13)], 0x334155);
            const f = isoToScreen(x0 + 0.13, fy, z0 + 6);
            g.fillStyle([0xf1c27d, 0xc68642, 0x8d5524, 0xffdbac, 0xe0ac69, 0xa16e4b][(i + j * 3) % 6] as number, 1).fillCircle(f.x, f.y, 2.6);
          };
          for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) cell(i, j);
        }),
      ];
    case 'teamPhoto':
      return [
        piece(
          scene,
          item,
          (g) => {
            // Cadre au mur ouest (plan x = 0) : photo de groupe du séminaire
            const q = (y0: number, y1: number, z0: number, z1: number) => [isoToScreen(0, y0, z0), isoToScreen(0, y1, z0), isoToScreen(0, y1, z1), isoToScreen(0, y0, z1)];
            poly(g, q(y, y + h, 40, 70), COLORS.woodDark);
            poly(g, q(y + 0.06, y + h - 0.06, 43, 67), 0x93c5fd);
            poly(g, q(y + 0.06, y + h - 0.06, 43, 50), 0x86efac);
            for (let i = 0; i < 6; i++) {
              const p = isoToScreen(0, y + 0.16 + i * 0.14, 53 + (i % 2) * 3);
              g.fillStyle([0x1e3a8a, 0xdc2626, 0x0f766e, 0x7c3aed, 0xf59e0b, 0x334155][i] as number, 1).fillRect(p.x - 2, p.y - 1, 4, 6);
              g.fillStyle(0xf1c27d, 1).fillCircle(p.x, p.y - 3, 2.2);
            }
          },
          DEPTH.backWalls + 0.2,
        ),
      ];
  }
}

/** Bureau assis-debout : colonne télescopique de chaque côté, pied en T et boîtier de commande allumé. */
export function standingDeskBase(g: G, x: number, y: number, w: number, h: number, facing: 's' | 'e'): void {
  const dark = shade(COLORS.monitor, 1.3);
  if (facing === 's') {
    for (const lx of [x + 0.08, x + w - 0.16]) {
      box(g, lx - 0.03, y + 0.05, 0.14, h - 0.1, 0, 3, dark, false);
      box(g, lx, y + h / 2 - 0.05, 0.08, 0.1, 3, 17, COLORS.metal, false);
    }
    box(g, x + w - 0.3, y + h - 0.02, 0.16, 0.04, 16, 4, dark, false);
    const led = isoToScreen(x + w - 0.22, y + h + 0.02, 18);
    g.fillStyle(COLORS.led, 1).fillCircle(led.x, led.y, 1.2);
  } else {
    for (const ly of [y + 0.08, y + h - 0.16]) {
      box(g, x + 0.05, ly - 0.03, w - 0.1, 0.14, 0, 3, dark, false);
      box(g, x + w / 2 - 0.05, ly, 0.1, 0.08, 3, 17, COLORS.metal, false);
    }
    box(g, x + w - 0.02, y + h - 0.3, 0.04, 0.16, 16, 4, dark, false);
    const led = isoToScreen(x + w + 0.02, y + h - 0.22, 18);
    g.fillStyle(COLORS.led, 1).fillCircle(led.x, led.y, 1.2);
  }
}
