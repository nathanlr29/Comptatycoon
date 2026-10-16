import { BALANCE } from '../data/balance';
import { applyAction, type ActionResult, type GameAction } from './actions';
import { accrueReputation, completeConstructions } from './buildings';
import { getIncomePerSecond } from './economy';
import type { GameState } from './state';

export type Listener = (state: GameState) => void;

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
    return result;
  }

  tick(now: number): void {
    this.setState(simulate(this.state, now));
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
