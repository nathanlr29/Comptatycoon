import { BALANCE } from '../data/balance';
import { applyAction, type ActionResult, type GameAction } from './actions';
import { accrueReputation, completeConstructions } from './buildings';
import { getIncomePerSecond } from './economy';
import { catchUpOffline, type OfflineReport } from './offline';
import type { GameState } from './state';

export type Listener = (state: GameState) => void;
export type ActionListener = (action: GameAction, result: ActionResult) => void;

/**
 * Crédite la production de `lastSimulatedAt` jusqu'à `now`, par pas fixes.
 * Le temps restant (< 1 pas) est conservé pour le tick suivant :
 * le résultat ne dépend pas de la fréquence d'appel.
 */
export function simulate(state: GameState, now: number): GameState {
  const step = BALANCE.tickMs;
  const steps = Math.floor((now - state.lastSimulatedAt) / step);
  if (steps <= 0) return state;

  let current = state;
  let earned = 0;
  let t = state.lastSimulatedAt;
  for (let i = 0; i < steps; i++) {
    const gain = (getIncomePerSecond(current, t) * step) / 1000;
    earned += gain;
    t += step;
    current = completeConstructions(accrueReputation({ ...current, money: current.money + gain }, step), t);
  }
  return {
    ...current,
    lastSimulatedAt: t,
    effects: current.effects.filter((e) => e.expiresAt > t),
    stats: { ...current.stats, totalEarned: current.stats.totalEarned + earned },
  };
}

/** Point d'entrée unique de l'interface et de la carte vers le moteur. */
export class GameStore {
  private state: GameState;
  private readonly listeners = new Set<Listener>();
  private readonly actionListeners = new Set<ActionListener>();

  constructor(initial: GameState) {
    this.state = initial;
  }

  getState(): GameState {
    return this.state;
  }

  dispatch(action: GameAction, now: number): ActionResult {
    this.setState(simulate(this.state, now));
    const { state, result } = applyAction(this.state, action, now);
    this.setState(state);
    for (const listener of this.actionListeners) listener(action, result);
    return result;
  }

  tick(now: number): void {
    this.setState(simulate(this.state, now));
  }

  /** Au chargement et au retour d'un onglet caché : rattrapage plafonné de l'absence. */
  catchUp(now: number): OfflineReport {
    const { state, report } = catchUpOffline(this.state, now);
    this.setState(state);
    return report;
  }

  /** Remplace toute la partie (restauration d'une sauvegarde, réinitialisation). */
  replace(state: GameState): void {
    this.setState(state);
  }

  /** Prévenu après chaque action joueur (déclencheur de sauvegarde après un achat). */
  onAction(listener: ActionListener): () => void {
    this.actionListeners.add(listener);
    return () => this.actionListeners.delete(listener);
  }

  /** Renvoie la fonction de désabonnement. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(next: GameState): void {
    if (next === this.state) return;
    this.state = next;
    for (const listener of this.listeners) listener(next);
  }
}
