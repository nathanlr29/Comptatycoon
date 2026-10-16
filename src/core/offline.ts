import { BALANCE } from '../data/balance';
import { getBaseIncomePerSecond } from './economy';
import type { GameState } from './state';

/** Ce qui a été crédité pendant l'absence (docs/GDD.md §10). */
export interface OfflineReport {
  /** Temps réellement écoulé depuis `lastSimulatedAt` (0 si l'horloge a reculé). */
  elapsedMs: number;
  /** Temps pris en compte, plafonné à `BALANCE.offlineCapMs`. */
  creditedMs: number;
  capped: boolean;
  earned: number;
  moneyAfter: number;
}

export interface OfflineOutcome {
  state: GameState;
  report: OfflineReport;
}

/**
 * Rattrape l'absence de `lastSimulatedAt` jusqu'à `now`, en une fois :
 * revenu/s sans multiplicateur d'événement × durée plafonnée à 8 h.
 * Les effets temporaires expirés sont retirés et `lastSimulatedAt` passe à `now`,
 * si bien qu'un second appel avec le même `now` ne crédite rien.
 */
export function catchUpOffline(state: GameState, now: number): OfflineOutcome {
  const elapsedMs = Math.max(0, now - state.lastSimulatedAt);
  const creditedMs = Math.min(elapsedMs, BALANCE.offlineCapMs);
  const earned = (getBaseIncomePerSecond(state) * creditedMs) / 1000;
  const money = state.money + earned;
  const next: GameState = {
    ...state,
    money,
    lastSimulatedAt: now,
    effects: state.effects.filter((e) => e.expiresAt > now),
    stats: { ...state.stats, totalEarned: state.stats.totalEarned + earned },
  };
  return {
    state: next,
    report: { elapsedMs, creditedMs, capped: elapsedMs > creditedMs, earned, moneyAfter: money },
  };
}

/** Le récapitulatif de retour n'est affiché qu'au-delà d'une minute d'absence. */
export function shouldShowOfflineReport(report: OfflineReport): boolean {
  return report.creditedMs > BALANCE.offlineSummaryMinMs;
}

/** Plus d'une minute sans simulation (onglet caché, appareil en veille) : c'est une absence. */
export function isAbsence(state: GameState, now: number): boolean {
  return now - state.lastSimulatedAt > BALANCE.offlineSummaryMinMs;
}
