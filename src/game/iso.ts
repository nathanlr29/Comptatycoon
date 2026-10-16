/**
 * Projection isométrique 2:1 de la vue en fausse 3D (docs/GDD.md §6). Fonctions pures, testées sans Phaser.
 *
 * Grille du cabinet : `x` va vers le bas à droite de l'écran, `y` vers le bas à gauche, `z` vers le haut.
 * L'origine (0, 0) est le coin du fond, en haut de l'écran. Une case fait 1 × 1 ; les coordonnées
 * peuvent être fractionnaires (0,5 = milieu d'une case).
 */

/** Taille d'une case à l'écran (px du monde Phaser) et hauteur des murs. */
export const ISO = { tileW: 64, tileH: 32, wallH: 84, partitionH: 22 } as const;

export interface ScreenPoint {
  x: number;
  y: number;
}

/** Point de la grille (x, y, hauteur z en px) → point du monde Phaser. */
export function isoToScreen(x: number, y: number, z = 0): ScreenPoint {
  return { x: ((x - y) * ISO.tileW) / 2, y: ((x + y) * ISO.tileH) / 2 - z };
}

/** Point du monde Phaser → point de la grille au sol (z = 0). Inverse de `isoToScreen`. */
export function screenToIso(sx: number, sy: number): { x: number; y: number } {
  const a = sx / (ISO.tileW / 2);
  const b = sy / (ISO.tileH / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/**
 * Profondeur d'affichage d'un objet posé au sol en (x, y) : plus l'objet est devant, plus elle est grande.
 * Passer le point le plus en avant de l'objet (coin bas de son emprise). Utiliser avec `setDepth`.
 * Plage réservée : sol < 0, objets ∈ [0 ; 10 000[, interface de la scène ≥ 10 000.
 */
export function depthOf(x: number, y: number, z = 0): number {
  return (x + y) * 100 + z / 10;
}

export const DEPTH = { floor: -2, backWalls: -1, overlay: 10_000 } as const;

/** Les 4 coins d'un rectangle de la grille posé à la hauteur z : haut, droite, bas, gauche. */
export function isoQuad(x: number, y: number, w: number, h: number, z = 0): [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint] {
  return [isoToScreen(x, y, z), isoToScreen(x + w, y, z), isoToScreen(x + w, y + h, z), isoToScreen(x, y + h, z)];
}

/** Rectangle englobant à l'écran d'une emprise de la grille, avec une marge et la hauteur des murs. */
export function screenBounds(w: number, h: number, margin = 0): { x: number; y: number; width: number; height: number } {
  const left = isoToScreen(0, h).x;
  const right = isoToScreen(w, 0).x;
  const top = isoToScreen(0, 0, ISO.wallH).y;
  const bottom = isoToScreen(w, h).y;
  return { x: left - margin, y: top - margin, width: right - left + 2 * margin, height: bottom - top + 2 * margin };
}
