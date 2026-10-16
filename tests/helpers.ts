import { createInitialState, type GameState } from '../src/core/state';

export const T0 = 1_700_000_000_000;

export function makeState(patch: Partial<GameState> = {}): GameState {
  return { ...createInitialState(T0), ...patch };
}

/** Remplace les espaces insécables par des espaces simples pour comparer les textes. */
export function plain(text: string): string {
  return text.replace(/[  ]/g, ' ');
}
