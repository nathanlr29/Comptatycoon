import type { EventId } from './events';

/** Modes de difficulté, choisis à la fondation du cabinet et fixes ensuite (docs/GDD.md §13). */
export type DifficultyId = 'relaxed' | 'normal' | 'hard';

export interface DifficultyDefinition {
  id: DifficultyId;
  name: string;
  /** Phrase courte affichée sous le choix. */
  description: string;
  /** Multiplicateur de la production passive. */
  income: number;
  /** Absence créditée au maximum (ms). */
  offlineCapMs: number;
  /** Poids des événements multipliés par ces facteurs (absent = ×1). */
  eventWeights: Partial<Record<EventId, number>>;
  /** Facteur sur la part du solde perdue lors d'un contrôle fiscal non protégé. */
  taxAuditLoss: number;
  /** Facteur sur les contacts gagnés à la cession du cabinet (§14). */
  contacts: number;
}

const HOUR = 3_600_000;

/** Dans l'ordre d'affichage. */
const LIST: DifficultyDefinition[] = [
  {
    id: 'relaxed',
    name: 'Détente',
    description: 'Production +50 %, absence créditée jusqu’à 12 h, moins de coups durs.',
    income: 1.5,
    offlineCapMs: 12 * HOUR,
    eventWeights: { taxAudit: 0.5, resignation: 0.5 },
    taxAuditLoss: 0.5,
    contacts: 1,
  },
  {
    id: 'normal',
    name: 'Classique',
    description: 'Le jeu tel qu’il a été pensé.',
    income: 1,
    offlineCapMs: 8 * HOUR,
    eventWeights: {},
    taxAuditLoss: 1,
    contacts: 1,
  },
  {
    id: 'hard',
    name: 'Exigeant',
    description: 'Production −30 %, absence plafonnée à 4 h, contrôles et démissions plus fréquents. Contacts +50 % à la cession.',
    income: 0.7,
    offlineCapMs: 4 * HOUR,
    eventWeights: { taxAudit: 1.6, resignation: 1.5 },
    taxAuditLoss: 1.5,
    contacts: 1.5,
  },
];

export const DIFFICULTIES = Object.fromEntries(LIST.map((d) => [d.id, d])) as Record<DifficultyId, DifficultyDefinition>;
export const DIFFICULTY_IDS: DifficultyId[] = LIST.map((d) => d.id);
export const DEFAULT_DIFFICULTY: DifficultyId = 'normal';
