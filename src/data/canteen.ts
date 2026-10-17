/**
 * Cantine du cabinet (docs/GDD.md §6 ter) : une pièce à quatre niveaux, de la kitchenette au restaurant
 * d'entreprise avec son chef. Chaque niveau rend l'équipe plus productive et la retient : les démissions
 * (événement aléatoire, §8) sont moins fréquentes. Valeurs d'équilibrage de départ.
 */
import type { RoomLayout } from './office';

export interface CanteenLevel {
  level: number;
  name: string;
  /** Ce que le niveau ajoute, pour le menu des pièces. */
  description: string;
}

export const CANTEEN_LEVELS: readonly CanteenLevel[] = [
  { level: 1, name: 'Kitchenette', description: 'Un micro-ondes, un frigo et une table : on déjeune enfin ensemble.' },
  { level: 2, name: 'Cafétéria', description: 'De vraies tables et un comptoir à sandwichs.' },
  { level: 3, name: 'Self-service', description: 'Plateaux, buffet chaud et dessert du jour.' },
  { level: 4, name: 'Restaurant d’entreprise', description: 'Un chef en cuisine : on se bat pour être recruté chez vous.' },
];

export const CANTEEN = {
  /** Aménagement puis passage aux niveaux 2, 3 et 4 (le Campus coûte 250 Md€). */
  costs: [50_000_000_000, 200_000_000_000, 800_000_000_000, 3_000_000_000_000],
  /** Production globale +4 % par niveau. */
  globalPerLevel: 0.04,
  /** Démissions 15 % moins fréquentes par niveau (−60 % au restaurant d'entreprise). */
  resignationCutPerLevel: 0.15,
  /** Heure réelle du déjeuner (heure locale du joueur, en heures décimales) : visuel seulement. */
  lunch: { from: 12, to: 13.5 },
} as const;

export function getCanteenLevel(level: number): CanteenLevel | undefined {
  return CANTEEN_LEVELS.find((l) => l.level === level);
}

/** Tables de la cantine (coin du fond), dans l'ordre où elles apparaissent avec les niveaux. */
const TABLES: readonly { x: number; y: number; minLevel: number }[] = [
  { x: 16.6, y: 16.6, minLevel: 1 },
  { x: 18.8, y: 16.6, minLevel: 2 },
  { x: 16.6, y: 18.5, minLevel: 2 },
  { x: 18.8, y: 18.5, minLevel: 3 },
  { x: 21.0, y: 16.6, minLevel: 4 },
  { x: 21.0, y: 18.5, minLevel: 4 },
];

/**
 * Place fixe de la cantine au « Campus » (niveau 7), à droite des pièces de « Confort des équipes ».
 * Le mobilier s'étoffe avec le niveau : kitchenette, tables, buffet du self, cuisine du chef.
 */
export const CANTEEN_ROOM: RoomLayout = {
  type: 'canteen',
  rect: { x: 16, y: 15, w: 8, h: 5 },
  minStage: 7,
  door: { side: 's', at: 22.5 },
  desks: [],
  furniture: [
    { type: 'kitchenette', x: 16.2, y: 15.1 },
    ...TABLES.map((t) => ({ type: 'canteenTable' as const, x: t.x, y: t.y, minLevel: t.minLevel })),
    { type: 'plant', x: 23.35, y: 15.1, minLevel: 2 },
    { type: 'buffet', x: 18.4, y: 15.1, minLevel: 3 },
    { type: 'kitchen', x: 20.95, y: 15.1, minLevel: 4 },
  ],
};

/**
 * Places assises pour le déjeuner : deux chaises côté fond de chaque table (la personne fait face à l'écran).
 * Point au sol, comme un poste de travail.
 */
export function canteenSeats(level: number): { x: number; y: number }[] {
  return TABLES.filter((t) => t.minLevel <= level).flatMap((t) => [
    { x: t.x + 0.45, y: t.y - 0.1 },
    { x: t.x + 1.15, y: t.y - 0.1 },
  ]);
}
