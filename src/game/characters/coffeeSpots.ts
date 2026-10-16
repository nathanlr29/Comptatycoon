/** Où se tiennent les personnes pendant la pause café. Pur (aucun Phaser) pour être testé. */
import { getStage, OFFICE_STAGES } from '../../data/office';
import { depthOf, isoToScreen } from '../iso';

export interface CoffeeSpot {
  /** Point de la grille (cases). */
  ix: number;
  iy: number;
  /** Même point en coordonnées monde, et sa profondeur d'affichage. */
  x: number;
  y: number;
  depth: number;
}

/** Autour de la machine : à gauche, à droite, puis deux devant (décalages en cases depuis son coin du fond). */
const AROUND: readonly [number, number][] = [
  [-0.5, 0.35],
  [1.6, 0.35],
  [0.3, 0.85],
  [1.0, 0.85],
];

/** Places autour de la première machine à café du plan, ou aucune si elle n'existe pas encore à ce niveau. */
export function coffeeSpots(stage: number): CoffeeSpot[] {
  const machine = OFFICE_STAGES.filter((s) => s.stage <= stage)
    .flatMap((s) => s.furniture)
    .find((f) => f.type === 'coffee');
  if (!machine) return [];
  return spotsAround(machine.x, machine.y, getStage(stage).size);
}

/** Quatre places debout autour d'un meuble (coin du fond en fx, fy), dans l'emprise du cabinet. */
export function spotsAround(fx: number, fy: number, size: { w: number; h: number }): CoffeeSpot[] {
  return AROUND.map(([dx, dy]) => spotAt(Math.min(Math.max(fx + dx, 0.3), size.w - 0.3), Math.min(Math.max(fy + dy, 0.3), size.h - 0.15)));
}

export function spotAt(ix: number, iy: number): CoffeeSpot {
  const p = isoToScreen(ix, iy);
  return { ix, iy, x: p.x, y: p.y, depth: depthOf(ix, iy) + 1 };
}
