/**
 * Pièces du cabinet vues de dessus (docs/GDD.md §6). Le mobilier s'enrichit avec le niveau.
 * Purement visuel : l'étape 5 choisit quoi dessiner à partir de l'état du jeu.
 */
import type Phaser from 'phaser';
import type { Rect } from '../data/map';
import { floor, meetingTable, person, plant, rack, roomWalls, rug, shelf, sofa, workstation } from './furniture';
import { MAP_COLORS as C } from './palette';

type G = Phaser.GameObjects.Graphics;

export type RoomType =
  | 'headquarters'
  | 'open_space'
  | 'meeting_room'
  | 'server_room'
  | 'social'
  | 'legal'
  | 'audit'
  | 'garden'
  | 'fountain';

const BOOKS = [0x9a3b3b, 0x1e3a8a, 0x166534, 0xb45309, 0x6b21a8];

/** Dessine une pièce aménagée. `staff` = postes occupés (open space). */
export function drawRoom(g: G, type: RoomType, level: number, r: Rect, staff = 0): void {
  ROOMS[type](g, r, level, staff);
  roomWalls(g, r);
}

const ROOMS: Record<RoomType, (g: G, r: Rect, level: number, staff: number) => void> = {
  headquarters: (g, r, level) => {
    floor(g, r, 'parquet');
    if (level >= 3) rug(g, { x: r.x + 18, y: r.y + r.h - 78, w: 120, h: 62 });
    if (level >= 2) shelf(g, r.x + r.w - 112, r.y + 6, 100, level >= 5 ? [C.gold, ...BOOKS] : BOOKS);
    else cabinet(g, r.x + r.w - 52, r.y + 10);
    const deskW = level >= 2 ? 120 : 96;
    if (level >= 5) g.fillStyle(C.gold, 1).fillRect(r.x + 24, r.y + 18, deskW + 8, deskW / 2 + 8);
    workstation(g, r.x + 28, r.y + 22, deskW, true, 4);
    if (level >= 3) sofa(g, r.x + r.w - 104, r.y + r.h - 46, 88);
    if (level >= 4) {
      const cx = r.x + r.w - 56;
      const cy = r.y + 82;
      g.fillStyle(C.chair, 1).fillCircle(cx - 26, cy, 8).fillCircle(cx + 26, cy, 8).fillCircle(cx, cy + 26, 8);
      g.fillStyle(C.woodLight, 1).fillCircle(cx, cy, 20);
    }
    plant(g, r.x + 20, r.y + r.h - 22, level >= 3 ? 12 : 14);
    if (level >= 5) plant(g, r.x + r.w - 20, r.y + 54, 12);
  },

  open_space: (g, r, level, staff) => {
    floor(g, r, 'carpet');
    const cols = Math.max(1, Math.floor((r.w - 16) / 58));
    const rows = Math.max(1, Math.floor((r.h - 36) / 64));
    const desks = Math.min(cols * rows, 4 * level);
    const ox = r.x + (r.w - cols * 58) / 2 + 6;
    for (let i = 0; i < desks; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      workstation(g, ox + col * 58, r.y + 14 + row * 64, 46, i < staff, i);
    }
    if (desks < cols * rows) plant(g, r.x + r.w - 20, r.y + r.h - 22, 12);
  },

  meeting_room: (g, r, level) => {
    floor(g, r, 'sage');
    if (level >= 2) g.fillStyle(C.monitor, 1).fillRect(r.x + r.w / 2 - 34, r.y + 4, 68, 7);
    const seats = Math.min(4, 1 + level);
    meetingTable(g, r.x + r.w / 2, r.y + r.h / 2 - 4, Math.min(r.w - 60, 40 + seats * 30), 46, seats);
    if (level >= 3) plant(g, r.x + 18, r.y + 20, 11);
    if (level >= 4) plant(g, r.x + r.w - 18, r.y + 20, 11);
    if (level >= 5) g.fillStyle(C.gold, 1).fillRect(r.x + r.w / 2 - 34, r.y + 12, 68, 3);
  },

  server_room: (g, r, level) => {
    floor(g, r, 'tile');
    const count = Math.min(4, 1 + level);
    const w = 26;
    const gap = (r.w - 30 - count * w) / Math.max(1, count - 1);
    for (let i = 0; i < count; i++) rack(g, r.x + 15 + i * (w + gap), r.y + 18, w, r.h * 0.55);
    if (level >= 2) {
      g.fillStyle(C.white, 1).fillRoundedRect(r.x + 14, r.y + r.h - 40, 52, 24, 4);
      g.lineStyle(2, C.tileLine, 1).strokeCircle(r.x + 40, r.y + r.h - 28, 8);
    }
  },

  social: (g, r) => {
    floor(g, r, 'carpet');
    g.fillStyle(0x0f766e, 1).fillRect(r.x, r.y, r.w, 6);
    for (let i = 0; i < 3; i++) cabinet(g, r.x + 12 + i * 40, r.y + 10, 0x99d5cc);
    const n = Math.floor((r.w - 20) / 70);
    for (let i = 0; i < n * 2; i++) workstation(g, r.x + 20 + (i % n) * 70, r.y + 70 + Math.floor(i / n) * 74, 52, true, i + 2);
  },

  legal: (g, r) => {
    floor(g, r, 'parquet');
    g.fillStyle(0x7f1d1d, 1).fillRect(r.x, r.y, r.w, 6);
    shelf(g, r.x + 10, r.y + 8, r.w - 20, [0x7f1d1d, 0x991b1b, 0x78350f, 0x1e3a8a]);
    meetingTable(g, r.x + r.w / 2, r.y + r.h * 0.42, r.w * 0.55, 54, 4, C.wood);
    for (let i = 0; i < 3; i++) workstation(g, r.x + 26 + i * ((r.w - 100) / 2), r.y + r.h - 96, 50, true, i + 7);
  },

  audit: (g, r) => {
    floor(g, r, 'sage');
    g.fillStyle(0x1d4ed8, 1).fillRect(r.x, r.y, r.w, 6);
    // Tableau avec graphique en barres
    g.fillStyle(C.white, 1).fillRect(r.x + 20, r.y + 10, 110, 40);
    [14, 22, 18, 30].forEach((h, i) => g.fillStyle(i === 3 ? 0x10b981 : 0x38bdf8, 1).fillRect(r.x + 32 + i * 22, r.y + 46 - h, 14, h));
    meetingTable(g, r.x + r.w / 2, r.y + r.h * 0.45, r.w * 0.5, 50, 3, 0xdbeafe);
    for (let i = 0; i < 3; i++) workstation(g, r.x + 26 + i * ((r.w - 100) / 2), r.y + r.h - 96, 50, true, i + 11);
  },

  garden: (g, r) => {
    floor(g, r, 'deck');
    const spots: [number, number][] = [[0.15, 0.2], [0.5, 0.15], [0.85, 0.22], [0.12, 0.8], [0.88, 0.78], [0.6, 0.85]];
    spots.forEach(([fx, fy], i) => plant(g, r.x + fx * r.w, r.y + fy * r.h, 16 + (i % 3) * 3));
    sofa(g, r.x + r.w / 2 - 60, r.y + r.h / 2 - 10, 120);
  },

  fountain: (g, r) => {
    floor(g, r, 'tile');
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const rad = Math.min(r.w, r.h) * 0.3;
    g.fillStyle(C.shadow, 0.2).fillCircle(cx + 4, cy + 5, rad + 8);
    g.fillStyle(C.white, 1).fillCircle(cx, cy, rad + 8);
    g.fillStyle(C.water, 1).fillCircle(cx, cy, rad);
    g.lineStyle(3, C.waterLight, 1).strokeCircle(cx, cy, rad * 0.6).strokeCircle(cx, cy, rad * 0.3);
    g.fillStyle(C.white, 1).fillCircle(cx, cy, 7);
    for (const [fx, fy] of [[0.1, 0.15], [0.9, 0.15], [0.1, 0.85], [0.9, 0.85]] as const) plant(g, r.x + fx * r.w, r.y + fy * r.h, 15);
  },
};

function cabinet(g: G, x: number, y: number, color = 0x94a3b8): void {
  g.fillStyle(C.shadow, 0.18).fillRect(x + 3, y + 4, 34, 40);
  g.fillStyle(color, 1).fillRect(x, y, 34, 40);
  g.lineStyle(2, C.shadow, 0.25).lineBetween(x, y + 13, x + 34, y + 13).lineBetween(x, y + 27, x + 34, y + 27);
}

function dashedRect(g: G, r: Rect, dash = 14, gap = 9): void {
  const edges: [number, number, number, number][] = [
    [r.x, r.y, r.x + r.w, r.y],
    [r.x, r.y + r.h, r.x + r.w, r.y + r.h],
    [r.x, r.y, r.x, r.y + r.h],
    [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
  ];
  for (const [x1, y1, x2, y2] of edges) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    for (let d = 0; d < len; d += dash + gap) {
      const e = Math.min(d + dash, len);
      g.lineBetween(x1 + ((x2 - x1) * d) / len, y1 + ((y2 - y1) * d) / len, x1 + ((x2 - x1) * e) / len, y1 + ((y2 - y1) * e) / len);
    }
  }
}

/** Emplacement libre : sol nu, contour pointillé et « + ». */
export function drawFreeSlot(g: G, r: Rect): void {
  floor(g, r, 'concrete');
  g.lineStyle(4, 0xffffff, 0.9);
  dashedRect(g, { x: r.x + 6, y: r.y + 6, w: r.w - 12, h: r.h - 12 });
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  g.fillStyle(0xffffff, 0.95).fillCircle(cx, cy, 24);
  g.fillStyle(C.wall, 1).fillRect(cx - 12, cy - 3, 24, 6).fillRect(cx - 3, cy - 12, 6, 24);
}

/** Pièce en travaux : bâche, rubalise et barre de progression (0 à 1). */
export function drawWorks(g: G, r: Rect, progress: number): void {
  floor(g, r, 'concrete');
  g.fillStyle(0x64748b, 0.55).fillRoundedRect(r.x + 24, r.y + 24, r.w - 48, r.h - 70, 6);
  g.lineStyle(6, C.hazard, 1);
  dashedRect(g, { x: r.x + 6, y: r.y + 6, w: r.w - 12, h: r.h - 12 }, 18, 12);
  const bw = r.w - 40;
  const p = Math.min(1, Math.max(0, progress));
  g.fillStyle(C.shadow, 0.7).fillRoundedRect(r.x + 20, r.y + r.h - 34, bw, 14, 7);
  if (p > 0) g.fillStyle(C.accent, 1).fillRoundedRect(r.x + 20, r.y + r.h - 34, Math.max(14, bw * p), 14, 7);
}

/** Accueil du petit bureau : comptoir, fauteuils d'attente, porte sur la rue. */
export function drawReception(g: G, r: Rect): void {
  floor(g, r, 'parquet');
  g.fillStyle(C.shadow, 0.18).fillRoundedRect(r.x + 33, r.y + 34, 120, 40, 18);
  g.fillStyle(C.wood, 1).fillRoundedRect(r.x + 30, r.y + 30, 120, 40, 18);
  g.fillStyle(C.white, 1).fillRoundedRect(r.x + 36, r.y + 34, 108, 14, 7);
  person(g, r.x + 90, r.y + 20, 9);
  for (let i = 0; i < 2; i++) g.fillStyle(C.sofa, 1).fillRoundedRect(r.x + r.w - 52, r.y + 90 + i * 34, 30, 26, 8);
  plant(g, r.x + r.w - 22, r.y + 22, 13);
  plant(g, r.x + 22, r.y + r.h - 24, 12);
}

/** Coin café : plan de travail, machine à café, table haute. */
export function drawKitchen(g: G, r: Rect): void {
  floor(g, r, 'tile');
  g.fillStyle(C.shadow, 0.18).fillRect(r.x + 13, r.y + 13, r.w - 20, 34);
  g.fillStyle(C.white, 1).fillRect(r.x + 10, r.y + 10, r.w - 20, 34);
  g.fillStyle(C.monitor, 1).fillRoundedRect(r.x + 24, r.y + 14, 26, 24, 4);
  g.fillStyle(0xb45309, 1).fillCircle(r.x + 37, r.y + 30, 4);
  g.fillStyle(0x94a3b8, 1).fillRoundedRect(r.x + r.w - 70, r.y + 16, 40, 22, 6);
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2 + 30;
  g.fillStyle(C.chair, 1).fillCircle(cx - 32, cy, 9).fillCircle(cx + 32, cy, 9).fillCircle(cx, cy + 32, 9);
  g.fillStyle(C.shadow, 0.18).fillCircle(cx + 3, cy + 4, 24);
  g.fillStyle(C.woodLight, 1).fillCircle(cx, cy, 24);
  plant(g, r.x + r.w - 22, r.y + r.h - 24, 12);
}

/** Badge de niveau (pastille) dans le coin haut droit d'une pièce. */
export function drawLevelBadge(g: G, r: Rect, upgradable: boolean): { x: number; y: number } {
  const x = r.x + r.w - 16;
  const y = r.y + 16;
  g.fillStyle(upgradable ? C.accent : C.wall, 1).fillCircle(x, y, 15);
  g.lineStyle(3, 0xffffff, 1).strokeCircle(x, y, 15);
  return { x, y };
}
