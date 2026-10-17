/**
 * Vue extérieure du cabinet, la « Façade » (docs/GDD.md §6 quater) : un aperçu sans effet sur le jeu.
 * L'immeuble grandit avec le niveau du cabinet ; parking et enseigne n'y figurent qu'une fois achetés.
 * Coordonnées en cases de la grille isométrique (voir src/game/iso.ts), hauteurs en px.
 */
import type { TileRect } from './office';

export type FacadeKind = 'main' | 'annex' | 'campus';

export interface FacadeBuilding extends TileRect {
  kind: FacadeKind;
  floors: number;
  /** Porte d'entrée sur la face avant (bord y + h), position x de la case ; -1 = pas de porte visible. */
  door: number;
}

export interface FacadeLayout {
  buildings: FacadeBuilding[];
  /** Passerelle vitrée entre l'immeuble et l'annexe (niveau 6 et plus). */
  bridge: TileRect | null;
  parking: TileRect;
  trees: Array<[number, number]>;
  lamps: Array<[number, number]>;
  /** Socle de pelouse sous toute la scène. */
  plate: TileRect;
}

/** Hauteur d'un étage, acrotère du toit. */
export const FACADE_FLOOR_H = 44;
export const FACADE_PARAPET = 8;

/** Immeuble principal [largeur, profondeur, étages], du petit bureau (1) au campus (7). */
const MAIN: ReadonlyArray<readonly [number, number, number]> = [
  [5, 4, 1],
  [7, 4, 1],
  [8, 5, 2],
  [9, 5, 3],
  [10, 6, 4],
  [10, 6, 4],
  [10, 6, 4],
];

export function facadeLayout(stage: number): FacadeLayout {
  const level = Math.max(1, Math.min(MAIN.length, Math.floor(stage)));
  const [w, h, floors] = MAIN[level - 1] as readonly [number, number, number];
  const buildings: FacadeBuilding[] = [{ kind: 'main', x: 0, y: 0, w, h, floors, door: w - 2 }];
  // L'annexe (niveau 6) à droite, reliée au 1er étage ; le pavillon du campus (niveau 7) devant elle.
  if (level >= 6) buildings.push({ kind: 'annex', x: w + 2, y: 0.5, w: 5, h: 5.5, floors: 2, door: w + 3 });
  if (level >= 7) buildings.push({ kind: 'campus', x: w + 2, y: h + 2.4, w: 6, h: 3.6, floors: 1, door: -1 });
  const trees: Array<[number, number]> = [[-1.3, 0.8], [-1.3, h - 0.6]];
  if (level >= 3) trees.push([w + 0.9, h + 0.7]);
  if (level >= 7) trees.push([w + 9.2, h + 2.6], [w + 9.2, h + 5], [w + 3.2, h + 7.1], [w + 6.4, h + 7.1], [w + 9.2, 1.2]);
  const maxX = Math.max(...buildings.map((b) => b.x + b.w), level >= 7 ? w + 9.6 : 0) + 2.2;
  const maxY = Math.max(h + 5, ...buildings.map((b) => b.y + b.h)) + (level >= 7 ? 2.6 : 1.4);
  return {
    buildings,
    bridge: level >= 6 ? { x: w, y: 2, w: 2, h: 1.4 } : null,
    parking: { x: 0.2, y: h + 1.3, w: w - 0.4, h: 3.2 },
    trees,
    lamps: level >= 2 ? [[0.4, h + 1.05], [w - 0.4, h + 1.05]] : [[w - 0.4, h + 1.05]],
    plate: { x: -1.8, y: -1.4, w: maxX + 1.8, h: maxY + 1.4 },
  };
}

/** Places du parking, de gauche à droite (une seule rangée, le long du trottoir). */
export function facadeStalls(parking: TileRect): TileRect[] {
  const n = Math.max(2, Math.floor(parking.w / 1.25));
  const sw = parking.w / n;
  return Array.from({ length: n }, (_, i) => ({ x: parking.x + i * sw, y: parking.y, w: sw, h: 2 }));
}
