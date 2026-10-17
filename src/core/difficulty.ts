import { DIFFICULTIES, type DifficultyDefinition } from '../data/difficulty';
import { getPerkEffects } from './perks';
import { talentValue } from './talents';
import type { GameState } from './state';

/** Règles du mode choisi à la fondation (docs/GDD.md §13). */
export function getDifficulty(state: GameState): DifficultyDefinition {
  return DIFFICULTIES[state.difficulty] ?? DIFFICULTIES.normal;
}

/** Absence créditée au maximum : 12 h, 8 h ou 4 h selon le mode, plus le télétravail. */
export function getOfflineCapMs(state: GameState): number {
  return getDifficulty(state).offlineCapMs + getPerkEffects(state).offlineBonusMs + talentValue(state, 'trustedManager');
}
