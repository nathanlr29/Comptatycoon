/** Couleurs du plan intérieur, plus chaudes que celles des panneaux (CLAUDE.md › Conventions). */
export const MAP_COLORS = {
  // Dehors
  outside: 0x232c3b,
  roofs: 0x2c3749,
  roofsEdge: 0x354156,
  asphalt: 0x3a4150,
  roadLine: 0xe9e2d0,
  sidewalk: 0xcbc3b4,
  sidewalkEdge: 0xb3aa99,
  // Structure
  wall: 0x3d3833,
  wallTop: 0x5c544c,
  window: 0x9ad9f5,
  corridor: 0xe9e3d8,
  corridorLine: 0xddd5c6,
  // Sols
  parquet: 0xd8b48a,
  parquetLine: 0xc59d70,
  carpet: 0xa9bacb,
  carpetLine: 0x97aabd,
  sage: 0xbccaa9,
  sageLine: 0xa9b995,
  tile: 0xd5dde4,
  tileLine: 0xbcc6cf,
  deck: 0xc9a678,
  deckLine: 0xb38f60,
  concrete: 0xbdb5a8,
  // Mobilier
  wood: 0x9c6b47,
  woodLight: 0xb98a5f,
  white: 0xf5f1ea,
  chair: 0x3b4658,
  monitor: 0x1f2937,
  screen: 0x7dd3fc,
  paper: 0xffffff,
  sofa: 0x5b7c99,
  rack: 0x2b3240,
  led: 0x34d399,
  plant: 0x4f8a3c,
  plantLight: 0x6aa652,
  pot: 0xb4683f,
  water: 0x60b6e0,
  waterLight: 0xa5dcf5,
  gold: 0xf2c14e,
  rug: 0x9a4d43,
  rugEdge: 0xc77d6c,
  // États
  shadow: 0x0f172a,
  locked: 0x0b1020,
  accent: 0x38bdf8,
  hazard: 0xfacc15,
  text: '#0f172a',
  textLight: '#f8fafc',
} as const;

/** Tenues et teintes de peau des collaborateurs (vus de dessus). */
export const PEOPLE = {
  shirts: [0x2563eb, 0xdb2777, 0x0d9488, 0xf59e0b, 0x7c3aed, 0x64748b],
  skins: [0xf1c7a1, 0xd9a47a, 0xa86f4c, 0x6b4430],
  hair: [0x2b1d14, 0x5a3a22, 0x111111, 0xc8a165],
} as const;
