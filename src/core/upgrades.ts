import { UPGRADES, type UpgradeId } from '../data/upgrades';
import type { Check } from './recruitment';
import type { GameState } from './state';

/** Niveau terminé d'une pièce (0 si elle n'est pas aménagée). */
function builtLevel(state: GameState, type: string): number {
  return state.buildings.reduce((max, b) => (b.type === type ? Math.max(max, b.level) : max), 0);
}

/** Conditions d'achat d'une amélioration (docs/GDD.md §3 bis). */
export function canBuyUpgrade(state: GameState, id: UpgradeId): Check {
  const def = UPGRADES[id];
  const cost = def.cost;
  if (state.upgrades.includes(id)) return { ok: false, reason: 'already_owned', cost };
  if (def.requires && !state.upgrades.includes(def.requires)) return { ok: false, reason: 'missing_prerequisite', cost };
  if (def.requiresBuilding && builtLevel(state, def.requiresBuilding.type) < def.requiresBuilding.level) return { ok: false, reason: 'missing_building', cost };
  if (state.reputation < (def.minReputation ?? 0)) return { ok: false, reason: 'locked', cost };
  if (state.money < cost) return { ok: false, reason: 'insufficient_funds', cost };
  return { ok: true, cost };
}

/** Une ligne est affichée sauf palier d'une série dont le palier précédent n'est pas acquis. */
export function isUpgradeListed(state: GameState, id: UpgradeId): boolean {
  const def = UPGRADES[id];
  return (def.tier ?? 1) <= 1 || !def.requires || state.upgrades.includes(def.requires);
}
