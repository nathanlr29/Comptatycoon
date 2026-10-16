/** Événements aléatoires (docs/GDD.md §8). Valeurs d'équilibrage de départ. */
export type EventId = 'fiscalPeriod' | 'taxAudit' | 'resignation' | 'prestigiousClient';

export const EVENT_IDS: readonly EventId[] = ['fiscalPeriod', 'taxAudit', 'resignation', 'prestigiousClient'];

/** Poids du tirage parmi les événements éligibles. */
export const EVENT_WEIGHTS: Record<EventId, number> = {
  fiscalPeriod: 40,
  taxAudit: 25,
  resignation: 20,
  prestigiousClient: 15,
};

export const EVENT_TIMING = {
  /** Premier événement au plus tôt après 3 min de jeu. */
  firstAfterMs: 180_000,
  minIntervalMs: 90_000,
  maxIntervalMs: 150_000,
  /** Échéance dépassée de plus d'une minute = le joueur était absent : on replanifie sans rien tirer. */
  staleAfterMs: 60_000,
} as const;

export const FISCAL_PERIOD = { effectId: 'fiscalPeriod', multiplier: 2, durationMs: 20_000 } as const;
export const TAX_AUDIT_MIN_STAFF = 5;
export const PRESTIGIOUS_CLIENT = { reputation: 3, incomeSeconds: 60 } as const;
