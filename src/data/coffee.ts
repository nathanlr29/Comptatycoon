/** Mode café (docs/GDD.md §8 bis) : pause café déclenchée par le joueur et machines améliorables. */

export interface CoffeeMachine {
  /** 1 = la cafetière fournie avec le local voisin. */
  level: number;
  name: string;
  description: string;
  /** Prix pour passer à cette machine (0 pour la première). */
  cost: number;
  /** Multiplicateur du revenu pendant la pause. */
  multiplier: number;
  durationMs: number;
  /** Délai entre deux pauses, compté depuis le début de la pause. */
  cooldownMs: number;
}

export const COFFEE = {
  effectId: 'coffeeBreak',
  /** Niveau du cabinet où apparaît la première machine (le local voisin). */
  minFirmLevel: 2,
  /** Nombre maximal de personnes qui vont à la machine pendant la pause. */
  maxWalkers: 4,
} as const;

export const COFFEE_MACHINES: readonly CoffeeMachine[] = [
  {
    level: 1,
    name: 'Cafetière filtre',
    description: 'Le café un peu tiède de la salle de pause.',
    cost: 0,
    multiplier: 1.5,
    durationMs: 30_000,
    cooldownMs: 300_000,
  },
  {
    level: 2,
    name: 'Machine à capsules',
    description: 'Trente arômes, et personne ne vide le bac.',
    cost: 2_500,
    multiplier: 1.75,
    durationMs: 30_000,
    cooldownMs: 240_000,
  },
  {
    level: 3,
    name: 'Expresso à grain',
    description: 'Le moulin réveille tout l’étage.',
    cost: 40_000,
    multiplier: 2,
    durationMs: 40_000,
    cooldownMs: 210_000,
  },
  {
    level: 4,
    name: 'Comptoir de barista',
    description: 'Latte art en forme de bilan équilibré.',
    cost: 600_000,
    multiplier: 2.5,
    durationMs: 45_000,
    cooldownMs: 180_000,
  },
];

export const MAX_COFFEE_LEVEL = COFFEE_MACHINES.length;

export function getCoffeeMachineDef(level: number): CoffeeMachine {
  const index = Math.min(MAX_COFFEE_LEVEL, Math.max(1, Math.floor(level))) - 1;
  return COFFEE_MACHINES[index] as CoffeeMachine;
}
