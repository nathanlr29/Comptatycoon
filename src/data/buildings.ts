import type { StaffRole } from './staff';

/** Bâtiments et pièces constructibles (docs/GDD.md §6). Valeurs d'équilibrage de départ. */
export type BuildingType =
  | 'headquarters'
  | 'openSpace'
  | 'meetingRoom'
  | 'serverRoom'
  | 'socialWing'
  | 'legalWing'
  | 'advisoryWing'
  | 'garden'
  | 'fountain';

export interface BuildingEffect {
  /** Bonus de production globale par niveau (0,1 = +10 %). */
  globalPerLevel?: number;
  /** Bonus de production par niveau pour certaines catégories. */
  rolesPerLevel?: { roles: StaffRole[]; bonus: number };
  /** Points de réputation gagnés toutes les `reputationEveryMs`, par niveau. */
  reputationEveryMs?: number;
  /** Réputation gagnée une fois, à la fin de la construction. */
  reputationOnBuild?: number;
}

export interface BuildingDefinition {
  type: BuildingType;
  name: string;
  description: string;
  /** Coût de construction (niveau 1). */
  cost: number;
  maxLevel: number;
  /** Niveau minimal du Bureau principal pour construire. */
  requiresHq: number;
  effect: BuildingEffect;
  /** Coûts d'amélioration explicites (index = niveau actuel − 1) ; sinon cost × 5^niveau. */
  upgradeCosts?: number[];
}

export const BUILDINGS: Record<BuildingType, BuildingDefinition> = {
  headquarters: {
    type: 'headquarters',
    name: 'Bureau principal',
    description: 'Le cœur du cabinet. Chaque niveau ouvre de nouveaux espaces.',
    cost: 0,
    maxLevel: 5,
    requiresHq: 0,
    effect: { globalPerLevel: 0.1 },
    upgradeCosts: [500, 5_000, 50_000, 500_000],
  },
  openSpace: {
    type: 'openSpace',
    name: 'Open space',
    description: 'Des bureaux partagés pour les alternants et les juniors.',
    cost: 200,
    maxLevel: 5,
    requiresHq: 1,
    effect: { rolesPerLevel: { roles: ['intern', 'junior'], bonus: 0.25 } },
  },
  meetingRoom: {
    type: 'meetingRoom',
    name: 'Salle de réunion',
    description: 'On y reçoit les clients : la réputation monte toute seule.',
    cost: 2_500,
    maxLevel: 5,
    requiresHq: 2,
    effect: { reputationEveryMs: 120_000 },
  },
  serverRoom: {
    type: 'serverRoom',
    name: 'Salle serveurs',
    description: 'Indispensable aux logiciels du cabinet.',
    cost: 1_500,
    maxLevel: 3,
    requiresHq: 1,
    effect: { globalPerLevel: 0.05 },
  },
  socialWing: {
    type: 'socialWing',
    name: 'Locaux du Pôle Social',
    description: 'Accueillera le Pôle Social : paie et DSN.',
    cost: 15_000,
    maxLevel: 1,
    requiresHq: 2,
    effect: {},
  },
  legalWing: {
    type: 'legalWing',
    name: 'Locaux du Pôle Juridique',
    description: 'Accueillera le Pôle Juridique : statuts, AG, formalités.',
    cost: 40_000,
    maxLevel: 1,
    requiresHq: 2,
    effect: {},
  },
  advisoryWing: {
    type: 'advisoryWing',
    name: 'Locaux Conseil & Audit',
    description: 'Accueillera le Pôle Conseil & Audit.',
    cost: 250_000,
    maxLevel: 1,
    requiresHq: 3,
    effect: {},
  },
  garden: {
    type: 'garden',
    name: 'Jardin',
    description: 'Un coin de verdure qui plaît aux clients.',
    cost: 1_000,
    maxLevel: 1,
    requiresHq: 1,
    effect: { reputationOnBuild: 3 },
  },
  fountain: {
    type: 'fountain',
    name: 'Fontaine',
    description: 'Le signe d’un cabinet qui réussit.',
    cost: 10_000,
    maxLevel: 1,
    requiresHq: 1,
    effect: { reputationOnBuild: 3 },
  },
};

/** Types que le joueur peut construire sur un emplacement libre (le Bureau principal existe déjà). */
export const CONSTRUCTIBLE: BuildingType[] = [
  'openSpace',
  'serverRoom',
  'meetingRoom',
  'socialWing',
  'legalWing',
  'advisoryWing',
  'garden',
  'fountain',
];

/** Durée de chantier : 10 s × niveau visé², plafonnée à 10 min. */
export const CONSTRUCTION = { baseMs: 10_000, maxMs: 600_000, upgradeCostGrowth: 5, reputationPerBuild: 1 } as const;
