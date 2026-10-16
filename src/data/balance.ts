/** Constantes d'équilibrage générales (docs/GDD.md §2 à §4). */
export const BALANCE = {
  /** Facteur de hausse du coût par unité déjà possédée. */
  costGrowth: 1.15,
  /** Collaborateurs encadrés par associé expert-comptable. */
  staffPerPartner: 15,
  /** Coût du 2ᵉ associé ; chaque associé suivant coûte `partnerCostGrowth` fois plus. */
  partnerBaseCost: 25_000,
  partnerCostGrowth: 4,
  partnerMinReputation: 10,
  /** Indemnité de licenciement : part du prix payé pour le dernier recruté du poste. */
  severanceShare: 0.25,
  /** Gain de base d'une action manuelle. */
  baseClickValue: 1,
  /** Bonus de production par point de réputation, et plafond de ce bonus. */
  reputationBonusPerPoint: 0.01,
  reputationBonusCap: 2,
  /** Pas de simulation en millisecondes (4 ticks/s). */
  tickMs: 250,
  /** Durée d'absence à partir de laquelle on affiche le récapitulatif (le plafond dépend du mode, data/difficulty.ts). */
  offlineSummaryMinMs: 60_000,
} as const;
