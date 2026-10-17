import { EXPANSION_LEVELS, MAX_FIRM_LEVEL } from './expansion';
import type { EventId } from './events';
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
  | 'fountain'
  | 'terrace'
  | 'parking'
  | 'signage';

export interface BuildingEffect {
  /** Bonus de production globale par niveau (0,1 = +10 %). */
  globalPerLevel?: number;
  /** Bonus de production par niveau pour certaines catégories. */
  rolesPerLevel?: { roles: StaffRole[]; bonus: number };
  /** Points de réputation gagnés toutes les `reputationEveryMs`, par niveau. */
  reputationEveryMs?: number;
  /** Réputation gagnée une fois, à la fin de la construction. */
  reputationOnBuild?: number;
  /** Places d'encadrement en plus par niveau (s'ajoutent à celles des associés). */
  capacityPerLevel?: number;
  /** Variation du poids d'un événement aléatoire par niveau (−0,3 = 30 % moins souvent). */
  eventWeightPerLevel?: Partial<Record<EventId, number>>;
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
    description: 'Votre bureau, le cœur du cabinet. L’agrandir ouvre de nouveaux locaux.',
    cost: 0,
    maxLevel: MAX_FIRM_LEVEL,
    requiresHq: 0,
    // Le bonus du cabinet (+10 % par niveau) passe par getFirmMultiplier (core/expansion.ts).
    effect: {},
    // Prix d'agrandissement : une seule source, data/expansion.ts.
    upgradeCosts: EXPANSION_LEVELS.slice(1).map((l) => l.cost),
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
    name: 'Coin plantes',
    description: 'Un coin de verdure qui plaît aux clients.',
    cost: 1_000,
    maxLevel: 1,
    // Sa place n'existe qu'à « L’étage complet » (src/data/office.ts).
    requiresHq: 4,
    effect: { reputationOnBuild: 3 },
  },
  fountain: {
    type: 'fountain',
    name: 'Fontaine d’intérieur',
    description: 'Le signe d’un cabinet qui réussit.',
    cost: 10_000,
    maxLevel: 1,
    requiresHq: 4,
    effect: { reputationOnBuild: 3 },
  },
  signage: {
    type: 'signage',
    name: 'Enseigne lumineuse',
    description: 'Votre nom en lettres lumineuses : les gros clients vous remarquent.',
    cost: 40_000,
    maxLevel: 1,
    requiresHq: 2,
    effect: { reputationOnBuild: 5, eventWeightPerLevel: { prestigiousClient: 0.5 } },
  },
  parking: {
    type: 'parking',
    name: 'Parking',
    description: 'Des places devant l’immeuble : vous pouvez recruter plus loin.',
    cost: 100_000,
    maxLevel: 3,
    requiresHq: 3,
    effect: { capacityPerLevel: 5 },
  },
  terrace: {
    type: 'terrace',
    name: 'Terrasse',
    description: 'Transats et parasols sur le toit de l’annexe : on y souffle, on reste.',
    cost: 1_000_000_000,
    maxLevel: 3,
    // Sa place n'existe qu'à « L’annexe » (src/data/office.ts).
    requiresHq: 6,
    effect: { reputationOnBuild: 5, reputationEveryMs: 60_000, eventWeightPerLevel: { resignation: -0.3 } },
  },
};

/**
 * Types que le joueur peut aménager depuis le menu (le Bureau principal existe déjà).
 * Les espaces des pôles n'y sont pas : ils apparaissent quand le pôle ouvre (src/data/departments.ts).
 */
export const CONSTRUCTIBLE: BuildingType[] = [
  'openSpace',
  'serverRoom',
  'meetingRoom',
  'garden',
  'fountain',
  'signage',
  'parking',
  'terrace',
];

/** Durée de chantier : 10 s × niveau visé², plafonnée à 10 min. */
export const CONSTRUCTION = { baseMs: 10_000, maxMs: 600_000, upgradeCostGrowth: 5, reputationPerBuild: 1 } as const;
