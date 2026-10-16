import { SALE } from '../data/prestige';
import { getDifficulty } from './difficulty';
import { getFirmLevel } from './expansion';
import type { RefusalReason } from './refusals';
import { createInitialState, type GameState } from './state';

/** Multiplicateur de production du carnet d'adresses : 1 + 10 % par contact. */
export function getPrestigeMultiplier(state: GameState): number {
  return 1 + SALE.bonusPerContact * state.prestige.contacts;
}

/** Contacts gagnés en cédant maintenant : floor(√(CA de la partie / 1 M€) × facteur de difficulté). */
export function getContactsForSale(state: GameState): number {
  const earned = Math.max(0, state.stats.totalEarned);
  return Math.floor(Math.sqrt(earned / SALE.earnedPerContact) * getDifficulty(state).contacts);
}

export type SaleCheck = { ok: true; contacts: number } | { ok: false; reason: RefusalReason; contacts: number };

/** Cession possible une fois le cabinet agrandi jusqu'au siège, et si elle rapporte au moins un contact. */
export function canSellFirm(state: GameState): SaleCheck {
  const contacts = getContactsForSale(state);
  if (getFirmLevel(state) < SALE.minFirmLevel) return { ok: false, reason: 'missing_prerequisite', contacts };
  if (contacts < 1) return { ok: false, reason: 'locked', contacts };
  return { ok: true, contacts };
}

/** Nouvelle partie au petit bureau ; seuls la difficulté, les contacts et la date de fondation sont gardés. Suppose `canSellFirm(...).ok`. */
export function sellFirm(state: GameState, contacts: number, now: number): GameState {
  return createInitialState(now, {
    difficulty: state.difficulty,
    createdAt: state.createdAt,
    prestige: {
      contacts: state.prestige.contacts + contacts,
      sales: state.prestige.sales + 1,
      pastEarned: state.prestige.pastEarned + state.stats.totalEarned,
    },
  });
}
