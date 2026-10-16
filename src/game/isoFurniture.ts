/** Mobilier en fausse 3D : chaque objet est un Graphics trié en profondeur par son coin avant. */
import type Phaser from 'phaser';
import { deskRect, type Desk, type Furniture, type FurnitureType } from '../data/office';
import { depthOf, isoQuad, isoToScreen } from './iso';
import { box, groundShadow, poly } from './isoDraw';
import { COLORS, shade } from './palette';

type G = Phaser.GameObjects.Graphics;

/** Crée un Graphics dont la profondeur suit le coin avant (x + w, y + h) de l'objet. */
function piece(scene: Phaser.Scene, x: number, y: number, w: number, h: number, draw: (g: G) => void, z = 0): G {
  const g = scene.add.graphics();
  draw(g);
  g.setDepth(depthOf(x + w, y + h, z));
  return g;
}

/** Emprise (cases) de chaque type de meuble, posée au coin (x, y) donné par les données. */
const SIZE: Record<FurnitureType, [number, number]> = {
  plant: [0.6, 0.6],
  cabinet: [0.6, 0.5],
  bookshelf: [0.9, 0.35],
  sofa: [1.6, 0.7],
  meetingTable: [2, 1.1],
  rack: [0.7, 0.6],
  printer: [0.7, 0.55],
  coffee: [1.2, 0.5],
  reception: [1.8, 0.6],
  whiteboard: [1.3, 0.12],
  fountain: [2, 2],
  bench: [1.4, 0.5],
};

export function drawFurniture(scene: Phaser.Scene, f: Furniture): G[] {
  const [w, h] = SIZE[f.type];
  const { x, y } = f;
  const out: G[] = [];
  const add = (draw: (g: G) => void, px = x, py = y, pw = w, ph = h) => out.push(piece(scene, px, py, pw, ph, draw));
  switch (f.type) {
    case 'plant':
      add((g) => {
        groundShadow(g, x, y, w, h);
        box(g, x + 0.12, y + 0.12, 0.36, 0.36, 0, 16, COLORS.pot);
        const c = isoToScreen(x + 0.3, y + 0.3, 34);
        g.fillStyle(COLORS.plant, 1).fillCircle(c.x - 7, c.y + 2, 11).fillCircle(c.x + 7, c.y + 3, 11);
        g.fillStyle(COLORS.plantLight, 1).fillCircle(c.x, c.y - 6, 10);
      });
      break;
    case 'cabinet':
      add((g) => {
        groundShadow(g, x, y, w, h);
        box(g, x, y, w, h, 0, 46, COLORS.metal);
        for (const z of [12, 26, 40]) {
          const a = isoToScreen(x + 0.12, y + h, z);
          const b = isoToScreen(x + w - 0.12, y + h, z);
          g.lineStyle(2, COLORS.outline, 0.35).lineBetween(a.x, a.y, b.x, b.y);
        }
      });
      break;
    case 'bookshelf':
      add((g) => {
        box(g, x, y, w, h, 0, 66, COLORS.woodDark);
        for (let i = 0; i < 3; i++) {
          for (let k = 0; k < 6; k++) {
            const a = x + 0.08 + k * 0.13;
            const z = 8 + i * 20;
            poly(g, [isoToScreen(a, y + h, z), isoToScreen(a + 0.1, y + h, z), isoToScreen(a + 0.1, y + h, z + 14), isoToScreen(a, y + h, z + 14)], COLORS.books[(i + k) % 5] as number);
          }
        }
      });
      break;
    case 'sofa':
      add((g) => {
        groundShadow(g, x, y, w, h);
        box(g, x, y, w, 0.22, 0, 30, shade(COLORS.sofa, 0.9));
        box(g, x, y + 0.22, w, h - 0.22, 0, 16, COLORS.sofa);
      });
      break;
    case 'meetingTable':
      for (let i = 0; i < 3; i++) {
        add((g) => box(g, x + 0.25 + i * 0.6, y - 0.4, 0.3, 0.3, 0, 14, COLORS.chair), x + 0.25 + i * 0.6, y - 0.4, 0.3, 0.3);
        add((g) => box(g, x + 0.25 + i * 0.6, y + h + 0.1, 0.3, 0.3, 0, 14, COLORS.chair), x + 0.25 + i * 0.6, y + h + 0.1, 0.3, 0.3);
      }
      add((g) => {
        groundShadow(g, x, y, w, h);
        box(g, x + 0.9, y + 0.4, 0.2, 0.3, 0, 20, COLORS.woodDark, false);
        box(g, x, y, w, h, 20, 6, COLORS.deskWood);
      });
      break;
    case 'rack':
      add((g) => {
        groundShadow(g, x, y, w, h);
        box(g, x, y, w, h, 0, 72, COLORS.rack);
        for (let z = 10; z < 66; z += 10) {
          const p = isoToScreen(x + w, y + h * 0.3, z);
          g.fillStyle(COLORS.led, 1).fillCircle(p.x - 3, p.y, 1.8);
        }
      });
      break;
    case 'printer':
      add((g) => {
        groundShadow(g, x, y, w, h);
        box(g, x, y, w, h, 0, 26, 0xe5e7eb);
        box(g, x + 0.15, y + 0.1, 0.4, 0.3, 26, 3, COLORS.white, false);
      });
      break;
    case 'coffee':
      add((g) => {
        box(g, x, y, w, h, 0, 32, COLORS.deskTop);
        box(g, x + 0.15, y + 0.1, 0.3, 0.3, 32, 20, COLORS.monitor);
        box(g, x + 0.7, y + 0.15, 0.2, 0.2, 32, 8, COLORS.white, false);
      });
      break;
    case 'reception':
      add((g) => {
        groundShadow(g, x, y, w, h);
        box(g, x, y, w, h, 0, 34, COLORS.deskWood);
        box(g, x, y, w, 0.15, 34, 4, COLORS.deskTop, false);
      });
      break;
    case 'whiteboard':
      add((g) => {
        box(g, x, y, w, h, 18, 44, COLORS.white);
        const a = isoToScreen(x + 0.2, y + h, 40);
        const b = isoToScreen(x + 1, y + h, 50);
        g.lineStyle(2, 0x10b981, 1).lineBetween(a.x, a.y, b.x, b.y);
      });
      break;
    case 'fountain':
      add((g) => {
        const c = isoToScreen(x + 1, y + 1, 0);
        g.fillStyle(COLORS.shadow, 0.15).fillEllipse(c.x + 4, c.y + 4, 120, 60);
        g.fillStyle(shade(COLORS.stone, 0.8), 1).fillEllipse(c.x, c.y, 116, 58);
        g.fillStyle(COLORS.stone, 1).fillEllipse(c.x, c.y - 10, 116, 58);
        g.fillStyle(COLORS.water, 1).fillEllipse(c.x, c.y - 10, 96, 46);
        g.lineStyle(2, COLORS.waterLight, 1).strokeEllipse(c.x, c.y - 10, 60, 28);
        g.fillStyle(COLORS.stone, 1).fillRect(c.x - 5, c.y - 40, 10, 30);
        g.fillStyle(COLORS.waterLight, 1).fillEllipse(c.x, c.y - 42, 22, 10);
      });
      break;
    case 'bench':
      add((g) => {
        groundShadow(g, x, y, w, h);
        box(g, x, y, w, h, 0, 14, COLORS.deskWood);
      });
      break;
  }
  return out;
}

/** Poste de travail : bureau avec écran décalé (pour ne pas cacher le visage) et clavier. La personne est dessinée derrière. */
export function drawDesk(scene: Phaser.Scene, d: Desk, fancy = false): G[] {
  const { x, y, w, h } = deskRect(d);
  return [
    piece(scene, x, y, w, h, (g) => {
      const top = fancy ? COLORS.deskWood : COLORS.deskTop;
      groundShadow(g, x, y, w, h);
      // Pieds pleins aux deux bouts, puis le plateau
      if (d.facing === 's') {
        box(g, x + 0.04, y + 0.05, 0.07, h - 0.1, 0, 20, COLORS.metal, false);
        box(g, x + w - 0.11, y + 0.05, 0.07, h - 0.1, 0, 20, COLORS.metal, false);
      } else {
        box(g, x + 0.05, y + 0.04, w - 0.1, 0.07, 0, 20, COLORS.metal, false);
        box(g, x + 0.05, y + h - 0.11, w - 0.1, 0.07, 0, 20, COLORS.metal, false);
      }
      box(g, x, y, w, h, 20, 4, top);
      if (d.facing === 's') {
        box(g, x + 0.66, y + 0.08, 0.2, 0.07, 24, 15, COLORS.monitor, false);
        box(g, x + 0.2, y + 0.12, 0.34, 0.14, 24, 2, 0xe2e8f0, false);
      } else {
        box(g, x + 0.08, y + 0.66, 0.07, 0.2, 24, 15, COLORS.monitor, false);
        box(g, x + 0.12, y + 0.2, 0.14, 0.34, 24, 2, 0xe2e8f0, false);
      }
      deskClutter(g, d, x, y);
    }),
  ];
}

const MUGS = [0xdc2626, 0x2563eb, 0xf59e0b, 0x10b981] as const;

/** Dossiers et tasse posés sur le bureau, différents (mais stables) d'un poste à l'autre. */
function deskClutter(g: G, d: Desk, x: number, y: number): void {
  const pick = Math.abs(Math.floor(d.x * 7 + d.y * 13)) % 4;
  const s = d.facing === 's';
  if (pick === 1 || pick === 3) {
    const [px, py, pw, ph] = s ? [x + 0.06, y + 0.3, 0.24, 0.16] : [x + 0.3, y + 0.06, 0.16, 0.24];
    poly(g, isoQuad(px, py, pw, ph, 26), 0xf8fafc);
    poly(g, isoQuad(px + 0.02, py + 0.01, pw - 0.03, ph - 0.02, 28), pick === 1 ? 0xfde68a : 0xbfdbfe);
  }
  if (pick >= 2) {
    const [mx, my] = s ? [x + 0.58, y + 0.3] : [x + 0.3, y + 0.58];
    box(g, mx, my, 0.08, 0.08, 24, 7, MUGS[(pick + Math.round(d.x)) % 4] as number, false);
  }
}
