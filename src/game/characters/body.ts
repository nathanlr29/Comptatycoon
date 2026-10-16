/** Corps commun à toutes les poses : buste selon la tenue, tête de face ou de dos. Unités de l'image 56 × 70. */
import type Phaser from 'phaser';
import type { Look, RoleStyle } from './looks';

type G = Phaser.GameObjects.Graphics;

export function drawTorso(g: G, style: RoleStyle, look: Look): void {
  const body = look.outfit;
  g.fillStyle(body, 1).fillRoundedRect(17, 30, 22, 18, 7);
  switch (style.outfit) {
    case 'hoodie':
      g.fillStyle(darken(body), 1).fillEllipse(28, 31, 18, 6);
      g.lineStyle(1, look.accent, 1).lineBetween(26, 33, 26, 39).lineBetween(30, 33, 30, 39);
      break;
    case 'shirt':
      g.fillStyle(0xffffff, 0.9).fillTriangle(23, 30, 28, 30, 26, 34).fillTriangle(28, 30, 33, 30, 30, 34);
      // Cordon et badge
      g.lineStyle(1, look.accent, 1).lineBetween(24, 31, 28, 40).lineBetween(32, 31, 28, 40);
      g.fillStyle(0xffffff, 1).fillRect(26, 40, 4, 5);
      break;
    case 'shirtTie':
      g.fillStyle(0xffffff, 0.9).fillTriangle(23, 30, 28, 30, 26, 34).fillTriangle(28, 30, 33, 30, 30, 34);
      tie(g, look.accent);
      break;
    case 'blazer':
      g.fillStyle(0xf8fafc, 1).fillTriangle(23, 30, 33, 30, 28, 42);
      g.lineStyle(1.2, darken(body), 1).lineBetween(23, 30, 27, 44).lineBetween(33, 30, 29, 44);
      break;
    case 'suit':
      g.fillStyle(0xf8fafc, 1).fillTriangle(23, 30, 33, 30, 28, 42);
      tie(g, look.accent);
      g.fillStyle(0xf8fafc, 1).fillRect(34, 34, 2, 1.5);
      break;
  }
}

function tie(g: G, color: number): void {
  g.fillStyle(color, 1).fillTriangle(26.5, 31, 29.5, 31, 28, 33.5).fillTriangle(27, 33, 29, 33, 28, 43);
}

export function drawHead(g: G, look: Look): void {
  const { skin, hair } = look;
  // Cheveux longs : derrière la tête
  if (look.hairStyle === 'long') g.fillStyle(hair, 1).fillRoundedRect(18.5, 15, 19, 18, 6);
  g.fillStyle(darken(skin, 0.92), 1).fillRect(25.5, 27, 5, 4);
  g.fillStyle(skin, 1).fillCircle(19.8, 22.5, 2).fillCircle(36.2, 22.5, 2).fillCircle(28, 21, 8.5);
  g.fillStyle(hair, 1);
  switch (look.hairStyle) {
    case 'short':
    case 'long':
      g.fillEllipse(28, 15.5, 19, 9).fillRect(19.5, 15, 3, 5).fillRect(33.5, 15, 3, 5);
      break;
    case 'bun':
      g.fillEllipse(28, 15.5, 18.5, 8.5).fillCircle(28, 10.5, 4);
      break;
    case 'curly':
      for (const [x, y] of [[21, 16], [25, 13], [29.5, 12.5], [34, 15], [23, 14], [32, 13]] as const) g.fillCircle(x, y, 3.6);
      break;
  }
  // Yeux, sourire, lunettes
  g.fillStyle(0x1f2937, 1).fillCircle(25, 22, 1.1).fillCircle(31, 22, 1.1);
  g.lineStyle(0.9, darken(skin, 0.7), 1).beginPath().arc(28, 24.5, 2.2, 0.2 * Math.PI, 0.8 * Math.PI).strokePath();
  if (look.glasses) {
    g.lineStyle(0.9, 0x111827, 1).strokeCircle(25, 22, 2.4).strokeCircle(31, 22, 2.4).lineBetween(27.4, 22, 28.6, 22);
  }
}

export function darken(color: number, factor = 0.75): number {
  const r = Math.round(((color >> 16) & 0xff) * factor);
  const gr = Math.round(((color >> 8) & 0xff) * factor);
  const b = Math.round((color & 0xff) * factor);
  return (r << 16) | (gr << 8) | b;
}
