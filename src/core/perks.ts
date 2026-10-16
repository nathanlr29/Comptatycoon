import { MIN_RESIGNATION_FACTOR } from '../data/perks';
import { UPGRADES } from '../data/upgrades';
import type { GameState } from './state';

/** Effets cumulés du confort des équipes (docs/GDD.md §3 ter), hors production (lue par getMultipliers). */
export interface PerkEffects {
  /** Facteur sur le poids de l'événement Démission, jamais sous MIN_RESIGNATION_FACTOR. */
  resignation: number;
  /** Facteur sur le prix d'embauche des collaborateurs. */
  hireCost: number;
  offlineBonusMs: number;
  coffeeCooldown: number;
  staffPerPartner: number;
}

export function getPerkEffects(state: GameState): PerkEffects {
  const out: PerkEffects = { resignation: 1, hireCost: 1, offlineBonusMs: 0, coffeeCooldown: 1, staffPerPartner: 0 };
  for (const id of state.upgrades) {
    const e = UPGRADES[id].effect;
    out.resignation *= e.resignation ?? 1;
    out.hireCost *= e.hireCost ?? 1;
    out.offlineBonusMs += e.offlineBonusMs ?? 0;
    out.coffeeCooldown *= e.coffeeCooldown ?? 1;
    out.staffPerPartner += e.staffPerPartner ?? 0;
  }
  out.resignation = Math.max(MIN_RESIGNATION_FACTOR, out.resignation);
  return out;
}
