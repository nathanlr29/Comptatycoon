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
  accent: 0x38bdf8,
  shadow: 0x0f172a,
} as const;

/** Sol de chaque pièce : deux teintes en damier. */
export const ROOM_FLOORS = {
  headquarters: [0xd8b48a, 0xcfa97d],
  openSpace: [0xb3c3d3, 0xa9bacb],
  meetingRoom: [0xc3d0b0, 0xbac8a6],
  serverRoom: [0xd5dde4, 0xc9d2da],
  socialWing: [0xa9d6cf, 0x9ecdc5],
  legalWing: [0xd9b0a6, 0xd0a59a],
  advisoryWing: [0xb7c7e8, 0xadbee2],
  garden: [0xc9a678, 0xbf9b6c],
  fountain: [0xe2ddd3, 0xd8d2c6],
} as const;

/** Assombrit (f < 1) ou éclaircit (f > 1) une couleur 0xRRGGBB. */
export function shade(color: number, f: number): number {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return (c((color >> 16) & 255) << 16) | (c((color >> 8) & 255) << 8) | c(color & 255);
}
