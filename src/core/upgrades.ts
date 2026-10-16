import { UPGRADES, type UpgradeId } from '../data/upgrades';
import type { Check } from './recruitment';
import type { GameState } from './state';

/** Conditions d'achat d'une amélioration (docs/GDD.md §3 bis). */
export function canBuyUpgrade(state: GameState, id: UpgradeId): Check {
  const def = UPGRADES[id];
  const cost = def.cost;
  if (state.upgrades.includes(id)) return { ok: false, reason: 'already_owned', cost };
  if (def.requires && !state.upgrades.includes(def.requires)) return { ok: false, reason: 'missing_prerequisite', cost };
  if (state.reputation < (def.minReputation ?? 0)) return { ok: false, reason: 'locked', cost };
  if (state.money < cost) return { ok: false, reason: 'insufficient_funds', cost };
  return { ok: true, cost };
}
