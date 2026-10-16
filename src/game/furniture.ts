/** Mobilier vu de dessus, dessiné en vectoriel. Coordonnées du monde, aucune logique de jeu. */
import type Phaser from 'phaser';
import type { Rect } from '../data/map';
import { MAP_COLORS as C, PEOPLE } from './palette';

type G = Phaser.GameObjects.Graphics;

function pick(list: readonly number[], i: number): number {
  return list[i % list.length] ?? 0;
}

export type FloorKind = 'parquet' | 'carpet' | 'sage' | 'tile' | 'deck' | 'concrete' | 'corridor';

const FLOORS: Record<FloorKind, [number, number]> = {
  parquet: [C.parquet, C.parquetLine],
  carpet: [C.carpet, C.carpetLine],
  sage: [C.sage, C.sageLine],
  tile: [C.tile, C.tileLine],
  deck: [C.deck, C.deckLine],
  concrete: [C.concrete, C.concrete],
  corridor: [C.corridor, C.corridorLine],
};

export function floor(g: G, r: Rect, kind: FloorKind): void {
  const [fill, line] = FLOORS[kind];
  g.fillStyle(fill, 1).fillRect(r.x, r.y, r.w, r.h);
  if (kind === 'concrete') return;
  g.lineStyle(2, line, 1);
  if (kind === 'parquet' || kind === 'deck') {
    // Lames décalées
    const step = kind === 'deck' ? 22 : 16;
    for (let y = r.y + step, row = 0; y < r.y + r.h; y += step, row++) {
      g.lineBetween(r.x, y, r.x + r.w, y);
      for (let x = r.x + ((row % 2) * 40 + 30); x < r.x + r.w; x += 80) g.lineBetween(x, y - step, x, y);
    }
  } else if (kind === 'tile' || kind === 'corridor') {
    const step = kind === 'tile' ? 24 : 40;
    for (let x = r.x + step; x < r.x + r.w; x += step) g.lineBetween(x, r.y, x, r.y + r.h);
    for (let y = r.y + step; y < r.y + r.h; y += step) g.lineBetween(r.x, y, r.x + r.w, y);
  } else {
    // Moquette : fines rayures
    for (let y = r.y + 10; y < r.y + r.h; y += 10) g.lineBetween(r.x, y, r.x + r.w, y);
  }
}

/** Cloison de pièce avec une porte (ouverture) au milieu du mur du bas. */
export function roomWalls(g: G, r: Rect, thickness = 8, doorWidth = 54): void {
  const t = thickness;
  const doorX = r.x + r.w / 2 - doorWidth / 2;
  g.fillStyle(C.wall, 1);
  g.fillRect(r.x - t / 2, r.y - t / 2, r.w + t, t);
  g.fillRect(r.x - t / 2, r.y - t / 2, t, r.h + t);
  g.fillRect(r.x + r.w - t / 2, r.y - t / 2, t, r.h + t);
  g.fillRect(r.x - t / 2, r.y + r.h - t / 2, doorX - r.x + t / 2, t);
  g.fillRect(doorX + doorWidth, r.y + r.h - t / 2, r.x + r.w - doorX - doorWidth + t / 2, t);
  g.fillStyle(C.wallTop, 1).fillRect(r.x - t / 2, r.y - t / 2, r.w + t, 2);
}

/** Collaborateur assis, vu de dessus (épaules + tête). `seed` choisit sa tenue. */
export function person(g: G, x: number, y: number, seed: number): void {
  const shirt = pick(PEOPLE.shirts, seed);
  const skin = pick(PEOPLE.skins, seed * 7 + 3);
  const hair = pick(PEOPLE.hair, seed * 5 + 1);
  g.fillStyle(C.shadow, 0.18).fillEllipse(x + 2, y + 3, 30, 18);
  g.fillStyle(shirt, 1).fillEllipse(x, y, 28, 16);
  g.fillStyle(skin, 1).fillCircle(x, y - 2, 7.5);
  g.fillStyle(hair, 1).fillEllipse(x, y + 1, 14, 9);
}

/** Poste de travail tourné vers le haut : bureau, écran, chaise, et la personne si occupé. */
export function workstation(g: G, x: number, y: number, w: number, occupied: boolean, seed = 0): void {
  const h = Math.round(w * 0.5);
  g.fillStyle(C.shadow, 0.15).fillRect(x + 3, y + 4, w, h);
  g.fillStyle(C.white, 1).fillRect(x, y, w, h);
  g.fillStyle(C.monitor, 1).fillRect(x + w / 2 - w * 0.22, y + 4, w * 0.44, 6);
  g.fillStyle(C.screen, 0.9).fillRect(x + w / 2 - w * 0.18, y + 5, w * 0.36, 3);
  g.fillStyle(C.paper, 1).fillRect(x + 5, y + h - 14, 12, 9);
  const cx = x + w / 2;
  const cy = y + h + 12;
  g.fillStyle(C.chair, 1).fillRoundedRect(cx - 11, cy - 9, 22, 20, 6);
  if (occupied) person(g, cx, cy - 2, seed);
}

export function plant(g: G, x: number, y: number, r = 14): void {
  g.fillStyle(C.shadow, 0.2).fillCircle(x + 3, y + 4, r);
  g.fillStyle(C.pot, 1).fillCircle(x, y, r * 0.7);
  g.fillStyle(C.plant, 1).fillCircle(x - r * 0.35, y - r * 0.2, r * 0.6).fillCircle(x + r * 0.35, y - r * 0.1, r * 0.6);
  g.fillStyle(C.plantLight, 1).fillCircle(x, y + r * 0.25, r * 0.5);
}

/** Étagère contre un mur ; les livres prennent les couleurs données. */
export function shelf(g: G, x: number, y: number, w: number, colors: readonly number[]): void {
  g.fillStyle(C.wood, 1).fillRect(x, y, w, 16);
  for (let i = 0, bx = x + 3; bx < x + w - 6; i++, bx += 7) {
    g.fillStyle(pick(colors, i), 1).fillRect(bx, y + 3, 5, 10);
  }
}

/** Table de réunion avec chaises tout autour. */
export function meetingTable(g: G, cx: number, cy: number, w: number, h: number, seatsPerSide: number, wood: number = C.woodLight): void {
  g.fillStyle(C.chair, 1);
  for (let i = 0; i < seatsPerSide; i++) {
    const sx = cx - w / 2 + ((i + 0.5) * w) / seatsPerSide;
    g.fillRoundedRect(sx - 9, cy - h / 2 - 16, 18, 14, 4).fillRoundedRect(sx - 9, cy + h / 2 + 2, 18, 14, 4);
  }
  g.fillStyle(C.shadow, 0.18).fillRoundedRect(cx - w / 2 + 3, cy - h / 2 + 4, w, h, 10);
  g.fillStyle(wood, 1).fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 10);
  g.fillStyle(0xffffff, 0.15).fillRoundedRect(cx - w / 2 + 6, cy - h / 2 + 5, w - 12, 6, 3);
}

export function sofa(g: G, x: number, y: number, w: number): void {
  g.fillStyle(C.shadow, 0.18).fillRoundedRect(x + 3, y + 4, w, 34, 8);
  g.fillStyle(C.sofa, 1).fillRoundedRect(x, y, w, 34, 8);
  g.fillStyle(0xffffff, 0.18).fillRoundedRect(x + 6, y + 12, w - 12, 18, 6);
}

export function rug(g: G, r: Rect): void {
  g.fillStyle(C.rugEdge, 1).fillRoundedRect(r.x, r.y, r.w, r.h, 6);
  g.fillStyle(C.rug, 1).fillRoundedRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12, 4);
}

/** Baie serveur avec diodes. */
export function rack(g: G, x: number, y: number, w: number, h: number): void {
  g.fillStyle(C.shadow, 0.2).fillRect(x + 3, y + 4, w, h);
  g.fillStyle(C.rack, 1).fillRect(x, y, w, h);
  for (let ly = y + 8; ly < y + h - 4; ly += 12) {
    g.fillStyle(0x475569, 1).fillRect(x + 4, ly, w - 8, 6);
    g.fillStyle(C.led, 1).fillCircle(x + w - 9, ly + 3, 2);
  }
}
