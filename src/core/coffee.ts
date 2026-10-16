import { COFFEE, MAX_COFFEE_LEVEL, getCoffeeMachineDef, type CoffeeMachine } from '../data/coffee';
import { getFirmLevel } from './expansion';
import { getPerkEffects } from './perks';
import type { RefusalReason } from './refusals';
import type { GameState } from './state';

/**
 * Mode café (docs/GDD.md §8 bis). La pause est un effet temporaire (`state.effects`) :
 * elle multiplie le revenu en jeu actif mais ne compte jamais pendant l'absence.
 */

export type CoffeeCheck = { ok: true; machine: CoffeeMachine } | { ok: false; reason: RefusalReason; readyAt?: number };
export type CoffeeUpgradeCheck = { ok: true; cost: number; next: CoffeeMachine } | { ok: false; reason: RefusalReason; cost?: number };

export function isCoffeeUnlocked(state: GameState): boolean {
  return getFirmLevel(state) >= COFFEE.minFirmLevel;
}

export function getCoffeeMachine(state: GameState): CoffeeMachine {
  return getCoffeeMachineDef(state.coffee.machine);
}

/** Fin de la pause en cours (ms), ou null. */
export function getCoffeeBreakEnd(state: GameState, now: number): number | null {
  const effect = state.effects.find((e) => e.id === COFFEE.effectId && e.expiresAt > now);
  return effect ? effect.expiresAt : null;
}

export function canTakeCoffeeBreak(state: GameState, now: number): CoffeeCheck {
  if (!isCoffeeUnlocked(state)) return { ok: false, reason: 'requires_hq' };
  if (now < state.coffee.readyAt) return { ok: false, reason: 'cooling_down', readyAt: state.coffee.readyAt };
  return { ok: true, machine: getCoffeeMachine(state) };
}

/** Délai entre deux pauses avec cette machine, raccourci par le Coin sieste. */
export function getCoffeeCooldownMs(state: GameState, machine: CoffeeMachine = getCoffeeMachine(state)): number {
  return Math.round(machine.cooldownMs * getPerkEffects(state).coffeeCooldown);
}

export function takeCoffeeBreak(state: GameState, machine: CoffeeMachine, now: number): GameState {
  const effects = state.effects.filter((e) => e.id !== COFFEE.effectId);
  effects.push({ id: COFFEE.effectId, incomeMultiplier: machine.multiplier, expiresAt: now + machine.durationMs });
  return { ...state, effects, coffee: { ...state.coffee, readyAt: now + getCoffeeCooldownMs(state, machine) } };
}

export function canUpgradeCoffeeMachine(state: GameState): CoffeeUpgradeCheck {
  if (!isCoffeeUnlocked(state)) return { ok: false, reason: 'requires_hq' };
  if (state.coffee.machine >= MAX_COFFEE_LEVEL) return { ok: false, reason: 'max_level' };
  const next = getCoffeeMachineDef(state.coffee.machine + 1);
  if (state.money < next.cost) return { ok: false, reason: 'insufficient_funds', cost: next.cost };
  return { ok: true, cost: next.cost, next };
}

/** La nouvelle machine sert dès la prochaine pause ; une pause en cours garde son effet. */
export function upgradeCoffeeMachine(state: GameState, check: { cost: number; next: CoffeeMachine }): GameState {
  return { ...state, money: state.money - check.cost, coffee: { ...state.coffee, machine: check.next.level } };
}
