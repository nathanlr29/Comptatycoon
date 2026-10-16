import { EVENT_IDS, EVENT_TIMING, EVENT_WEIGHTS, FISCAL_PERIOD, PRESTIGIOUS_CLIENT, TAX_AUDIT_MIN_STAFF, type EventId } from '../data/events';
import { STAFF_ROLES, type StaffRole } from '../data/staff';
import { resolveTaxAudit } from './departments';
import { getDifficulty } from './difficulty';
import { getBaseIncomePerSecond } from './economy';
import { getPerkEffects } from './perks';
import { pickWeighted, type Rng } from './random';
import { getStaffCount, resign } from './recruitment';
import type { GameState } from './state';

/** Ce qui s'est passé, pour la notification (docs/GDD.md §8 : effet chiffré). */
export type EventReport =
  | { id: 'fiscalPeriod'; endsAt: number }
  | { id: 'taxAudit'; protected: boolean; loss: number; reputationChange: number }
  | { id: 'resignation'; role: StaffRole }
  | { id: 'prestigiousClient'; bonus: number; reputation: number };

export interface EventOutcome {
  state: GameState;
  report: EventReport | null;
}

export function isEventEligible(state: GameState, id: EventId): boolean {
  switch (id) {
    case 'taxAudit':
      return getStaffCount(state) >= TAX_AUDIT_MIN_STAFF;
    case 'resignation':
      return getStaffCount(state) >= 1;
    default:
      return true;
  }
}

/** Prochaine échéance : 90 à 150 s après `now`. */
export function scheduleNextEvent(now: number, rng: Rng): number {
  const { minIntervalMs, maxIntervalMs } = EVENT_TIMING;
  return now + minIntervalMs + Math.floor(rng() * (maxIntervalMs - minIntervalMs + 1));
}

/** Poids du tirage, ajusté par le mode de difficulté et, pour les démissions, par le confort des équipes. */
export function getEventWeight(state: GameState, id: EventId): number {
  const comfort = id === 'resignation' ? getPerkEffects(state).resignation : 1;
  return EVENT_WEIGHTS[id] * (getDifficulty(state).eventWeights[id] ?? 1) * comfort;
}

export function pickEvent(state: GameState, rng: Rng): EventId | undefined {
  return pickWeighted(
    EVENT_IDS.filter((id) => isEventEligible(state, id)),
    (id) => getEventWeight(state, id),
    rng,
  );
}

export function applyEvent(state: GameState, id: EventId, now: number, rng: Rng): EventOutcome {
  switch (id) {
    case 'fiscalPeriod': {
      // Pas de cumul : une période déjà active repart pour 20 s.
      const endsAt = now + FISCAL_PERIOD.durationMs;
      const effects = state.effects.filter((e) => e.id !== FISCAL_PERIOD.effectId);
      effects.push({ id: FISCAL_PERIOD.effectId, incomeMultiplier: FISCAL_PERIOD.multiplier, expiresAt: endsAt });
      return { state: { ...state, effects }, report: { id, endsAt } };
    }
    case 'taxAudit': {
      const outcome = resolveTaxAudit(state, getBaseIncomePerSecond(state));
      return {
        state: outcome.state,
        report: { id, protected: outcome.protected, loss: outcome.loss, reputationChange: outcome.reputationChange },
      };
    }
    case 'resignation': {
      // Catégorie tirée au prorata des effectifs ; les associés ne sont jamais concernés.
      const role = pickWeighted(STAFF_ROLES, (r) => state.staff[r], rng);
      if (!role) return { state, report: null };
      return { state: resign(state, role), report: { id, role } };
    }
    case 'prestigiousClient': {
      const bonus = Math.max(0, getBaseIncomePerSecond(state) * PRESTIGIOUS_CLIENT.incomeSeconds);
      const reputation = PRESTIGIOUS_CLIENT.reputation;
      return {
        state: { ...state, money: state.money + bonus, reputation: state.reputation + reputation },
        report: { id, bonus, reputation },
      };
    }
  }
}

/**
 * À appeler pendant le jeu actif seulement (onglet visible). Tire au plus un événement quand l'échéance est passée.
 * Une échéance dépassée depuis longtemps (absence) est replanifiée sans rien tirer.
 */
export function runEvents(state: GameState, now: number, rng: Rng): EventOutcome {
  if (now < state.nextEventAt) return { state, report: null };
  const nextEventAt = scheduleNextEvent(now, rng);
  if (now - state.nextEventAt > EVENT_TIMING.staleAfterMs) return { state: { ...state, nextEventAt }, report: null };
  const id = pickEvent(state, rng);
  if (!id) return { state: { ...state, nextEventAt }, report: null };
  const outcome = applyEvent(state, id, now, rng);
  return { state: { ...outcome.state, nextEventAt }, report: outcome.report };
}
