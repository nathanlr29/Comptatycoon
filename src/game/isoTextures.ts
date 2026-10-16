/**
 * Matières du cabinet en fausse 3D : parquet, moquette, carrelage, faux plancher, pelouse, dallage, murs.
 * Tracés une seule fois par rendu ; les motifs passent par de longues lignes pour rester légers sur iPhone.
 */
import type Phaser from 'phaser';
import { isoQuad, isoToScreen } from './iso';
import { poly, tiles } from './isoDraw';
import { COLORS, shade, type FloorKind } from './palette';

type G = Phaser.GameObjects.Graphics;

/** Pseudo-aléatoire stable (0 ≤ r < 1) : le même motif à chaque rendu. */
function noise(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function line(g: G, x0: number, y0: number, x1: number, y1: number, color: number, alpha: number, width = 1): void {
  const a = isoToScreen(x0, y0);
  const b = isoToScreen(x1, y1);
  g.lineStyle(width, color, alpha).lineBetween(a.x, a.y, b.x, b.y);
}

/** Lattes de 0,25 case le long de x, longueurs décalées d'une rangée à l'autre. */
function parquet(g: G, x: number, y: number, w: number, h: number, [a, b]: readonly [number, number]): void {
  const plank = 1.5;
  const rows = Math.round(h * 4);
  for (let r = 0; r < rows; r++) {
    const yy = y + r * 0.25;
    let start = x;
    let k = 0;
    let end = x + ((r * 0.55) % plank) + 0.4;
    while (start < x + w) {
      end = Math.min(end, x + w);
      const n = noise(r, k);
      const tone = n < 0.4 ? a : n < 0.8 ? b : shade(a, 1.05);
      poly(g, isoQuad(start, yy, end - start, 0.25), tone);
      if (end < x + w) line(g, end, yy, end, yy + 0.25, COLORS.outline, 0.22);
      start = end;
      end = start + plank;
      k++;
    }
  }
  for (let r = 1; r < rows; r++) line(g, x, y + r * 0.25, x + w, y + r * 0.25, COLORS.outline, 0.16);
}

/** Dalles de moquette posées à 90° l'une de l'autre : le sens du poil change de dalle en dalle. */
function carpet(g: G, x: number, y: number, w: number, h: number, colors: readonly [number, number]): void {
  tiles(g, x, y, w, h, colors);
  const pile = shade(colors[1], 0.88);
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) {
      for (const f of [0.25, 0.5, 0.75]) {
        if ((i + j) % 2 === 0) line(g, x + i + 0.08, y + j + f, x + i + 0.92, y + j + f, pile, 0.35);
        else line(g, x + i + f, y + j + 0.08, x + i + f, y + j + 0.92, pile, 0.35);
      }
    }
  }
}

/** Grandes dalles en damier avec joints clairs. */
function tiled(g: G, x: number, y: number, w: number, h: number, colors: readonly [number, number]): void {
  tiles(g, x, y, w, h, colors);
  const joint = shade(colors[0], 1.08);
  for (let i = 1; i < w; i++) line(g, x + i, y, x + i, y + h, joint, 0.8, 1.5);
  for (let j = 1; j < h; j++) line(g, x, y + j, x + w, y + j, joint, 0.8, 1.5);
}

/** Faux plancher de salle serveur : demi-dalles perforées. */
function raised(g: G, x: number, y: number, w: number, h: number, colors: readonly [number, number]): void {
  tiles(g, x, y, w, h, colors);
  const grid = shade(colors[1], 0.78);
  for (let i = 0.5; i < w; i += 0.5) line(g, x + i, y, x + i, y + h, grid, 0.5);
  for (let j = 0.5; j < h; j += 0.5) line(g, x, y + j, x + w, y + j, grid, 0.5);
  g.fillStyle(grid, 0.45);
  for (let i = 0; i < w * 2; i += 2) {
    for (let j = 0; j < h * 2; j++) {
      const c = isoToScreen(x + (i + (j % 2) + 0.5) / 2, y + (j + 0.5) / 2);
      g.fillCircle(c.x, c.y, 2);
    }
  }
}

/** Pelouse : damier de deux verts et touffes d'herbe. */
function grass(g: G, x: number, y: number, w: number, h: number, colors: readonly [number, number]): void {
  tiles(g, x, y, w, h, colors);
  const dark = shade(colors[1], 0.78);
  const light = shade(colors[0], 1.12);
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) {
      for (let k = 0; k < 5; k++) {
        const p = isoToScreen(x + i + noise(i * 5 + k, j), y + j + noise(j * 7 + k, i));
        g.lineStyle(1.5, k % 2 ? dark : light, 0.9).lineBetween(p.x, p.y, p.x + (k % 3) - 1, p.y - 5);
      }
    }
  }
}

/** Dallage de pierre en quinconce. */
function stone(g: G, x: number, y: number, w: number, h: number, [a, b]: readonly [number, number]): void {
  for (let j = 0; j < h * 2; j++) {
    const off = j % 2 ? 0.5 : 0;
    for (let i = -off; i < w; i += 1) {
      const sx = Math.max(x, x + i);
      const ex = Math.min(x + w, x + i + 1);
      const n = noise(i + 3, j);
      poly(g, isoQuad(sx, y + j / 2, ex - sx, 0.5), n < 0.5 ? a : n < 0.85 ? b : shade(b, 0.95));
      if (ex < x + w) line(g, ex, y + j / 2, ex, y + j / 2 + 0.5, COLORS.white, 0.7, 1.5);
    }
    if (j > 0) line(g, x, y + j / 2, x + w, y + j / 2, COLORS.white, 0.7, 1.5);
  }
}

/** Sol d'un rectangle de cases selon sa matière. */
export function floor(g: G, x: number, y: number, w: number, h: number, kind: FloorKind, colors: readonly [number, number]): void {
  const draw = { tiles: tiled, parquet, carpet, raised, grass, stone }[kind];
  draw(g, x, y, w, h, colors);
}

/** Allée gravillonnée d'une porte (bord avant) jusqu'au milieu de la pièce. */
export function gravelPath(g: G, cx: number, y0: number, y1: number): void {
  poly(g, isoQuad(cx - 0.45, y0, 0.9, y1 - y0), COLORS.gravel);
  g.fillStyle(shade(COLORS.gravel, 0.82), 1);
  for (let k = 0; k < (y1 - y0) * 10; k++) {
    const p = isoToScreen(cx - 0.4 + noise(k, 1) * 0.8, y0 + noise(k, 2) * (y1 - y0));
    g.fillCircle(p.x, p.y, 1.4);
  }
}

/** Ombre portée douce au pied des murs du fond (occlusion ambiante). */
export function wallFootShadow(g: G, w: number, h: number): void {
  const bands = [0.16, 0.1, 0.05];
  bands.forEach((alpha, i) => {
    const d = (i + 1) * 0.14;
    poly(g, isoQuad(0, 0, w, d), COLORS.shadow, alpha);
    poly(g, isoQuad(0, d, d, h - d), COLORS.shadow, alpha);
  });
}

/** Papier peint rayé et soubassement lambrissé sur les murs du fond (plans y = 0 et x = 0). */
export function wallDecor(g: G, w: number, h: number, H: number): void {
  const rail = 26;
  const stripe = (lit: boolean, s0: number, s1: number, z0: number, z1: number, color: number, alpha: number) => {
    const p = lit
      ? [isoToScreen(s0, 0, z0), isoToScreen(s1, 0, z0), isoToScreen(s1, 0, z1), isoToScreen(s0, 0, z1)]
      : [isoToScreen(0, s0, z0), isoToScreen(0, s1, z0), isoToScreen(0, s1, z1), isoToScreen(0, s0, z1)];
    poly(g, p, color, alpha);
  };
  for (const [lit, len, base] of [[true, w, COLORS.wallLit], [false, h, COLORS.wallShade]] as const) {
    for (let s = 0; s < len; s += 0.5) if ((s * 2) % 2 === 0) stripe(lit, s, Math.min(len, s + 0.25), rail + 3, H, shade(base, 0.97), 1);
    stripe(lit, 0, len, 6, rail, shade(base, 0.9), 1);
    stripe(lit, 0, len, rail, rail + 3, COLORS.wallCap, 0.7);
    for (let s = 0.5; s < len; s += 0.5) stripe(lit, s, s + 0.03, 8, rail - 2, COLORS.outline, 0.12);
  }
}
