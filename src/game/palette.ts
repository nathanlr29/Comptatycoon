import type { RoomType } from '../data/office';

/** Couleurs de la vue en fausse 3D, plus chaudes que celles des panneaux (CLAUDE.md › Conventions). */
export const COLORS = {
  backdrop: 0x1f2633,
  ground: 0x3a4456,
  slabSide: 0x2a3140,
  outline: 0x3d3833,
  wallLit: 0xefe6d8,
  wallShade: 0xd8ccba,
  wallCap: 0x8a7d6c,
  baseboard: 0xb9a990,
  window: 0x9ad9f5,
  windowFrame: 0xfaf6ee,
  partition: 0xf6efe3,
  partitionCap: 0x9c8f7c,
  commonA: 0xe6dccb,
  commonB: 0xded3c0,
  doormat: 0x6b5b4b,
  // Mobilier
  deskTop: 0xf5f1ea,
  deskWood: 0xb98a5f,
  woodDark: 0x8a5e3e,
  chair: 0x3b4658,
  monitor: 0x1f2937,
  screen: 0x7dd3fc,
  metal: 0x9aa7b6,
  rack: 0x2b3240,
  led: 0x34d399,
  sofa: 0x5b7c99,
  rug: 0x9a4d43,
  plant: 0x4f8a3c,
  plantLight: 0x6aa652,
  pot: 0xb4683f,
  water: 0x60b6e0,
  waterLight: 0xa5dcf5,
  stone: 0xd9d4ca,
  gold: 0xf2c14e,
  white: 0xffffff,
  books: [0x9a3b3b, 0x1e3a8a, 0x166534, 0xb45309, 0x6b21a8],
  gravel: 0xd9ccb0,
  lamp: 0xffa94d,
  sunlight: 0xfff3d1,
  sunset: 0xffb06b,
  skyline: 0x3b4a66,
  litWindow: 0xffd77a,
  diploma: 0xfdf8ec,
  accent: 0x38bdf8,
  shadow: 0x0f172a,
} as const;

/** Matière du sol : voir src/game/isoTextures.ts. */
export type FloorKind = 'tiles' | 'parquet' | 'carpet' | 'raised' | 'grass' | 'stone';

/** Sol de chaque pièce : matière et deux teintes. */
export const ROOM_FLOORS: Record<RoomType, { kind: FloorKind; colors: readonly [number, number] }> = {
  headquarters: { kind: 'parquet', colors: [0xcd9a63, 0xc18e58] },
  openSpace: { kind: 'carpet', colors: [0xaabdd0, 0xa1b5c9] },
  meetingRoom: { kind: 'carpet', colors: [0xbccba5, 0xb2c29b] },
  serverRoom: { kind: 'raised', colors: [0xd5dde4, 0xccd5dd] },
  socialWing: { kind: 'carpet', colors: [0xa4d1c9, 0x9ac8c0] },
  legalWing: { kind: 'parquet', colors: [0xb4805f, 0xa87556] },
  advisoryWing: { kind: 'carpet', colors: [0xb5c5e7, 0xabbce0] },
  garden: { kind: 'grass', colors: [0x92c26c, 0x88b862] },
  fountain: { kind: 'stone', colors: [0xe4dfd5, 0xd9d3c7] },
  // Lames de bois grisées par le soleil
  terrace: { kind: 'parquet', colors: [0xb39b7d, 0xa58d70] },
};

/** Assombrit (f < 1) ou éclaircit (f > 1) une couleur 0xRRGGBB. */
export function shade(color: number, f: number): number {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return (c((color >> 16) & 255) << 16) | (c((color >> 8) & 255) << 8) | c(color & 255);
}
